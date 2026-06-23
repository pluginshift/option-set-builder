<?php
/**
 * Central price calculator for product options.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing;

use OptionSetBuilder\Data\AssignmentResolver;
use OptionSetBuilder\Data\OptionSetRepository;
use OptionSetBuilder\Fields\FieldRegistry;
use OptionSetBuilder\Pricing\Currency\CurrencyBridge;
use OptionSetBuilder\Support\Money;
use OptionSetBuilder\Support\Str;

defined( 'ABSPATH' ) || exit;

/**
 * Turns a raw selection JSON payload into a per-unit options price plus the
 * human-readable cart/order lines. This is the single authority for option
 * pricing math (ARCHITECTURE §13) and is called identically at add-to-cart,
 * before_calculate_totals and get_item_data, so it MUST be pure and
 * idempotent: same inputs → same outputs, no side effects, no cart writes.
 *
 * The numeric `price` it returns is always in the store base currency and
 * never includes the product base (callers add that and run the final
 * currency conversion before WC set_price). Only the display strings in
 * `lines` carry an active-currency, formatted amount.
 */
final class PriceCalculator {

	/**
	 * Field type registry.
	 *
	 * @var FieldRegistry
	 */
	private $fields;

	/**
	 * Option-set repository.
	 *
	 * @var OptionSetRepository
	 */
	private $sets;

	/**
	 * Assignment resolver.
	 *
	 * @var AssignmentResolver
	 */
	private $assign;

	/**
	 * Constructor.
	 *
	 * @param FieldRegistry       $fields Field registry.
	 * @param OptionSetRepository $sets   Set repository.
	 * @param AssignmentResolver  $assign Assignment resolver.
	 */
	public function __construct( FieldRegistry $fields, OptionSetRepository $sets, AssignmentResolver $assign ) {
		$this->fields = $fields;
		$this->sets   = $sets;
		$this->assign = $assign;
	}

	/**
	 * Compute the options price + breakdown for a selection.
	 *
	 * @param string $rawSelectionJson Raw `optset_field_data` JSON string.
	 * @param int    $productId        Product id.
	 * @param int[]  $publishedSetIds  Resolved published set ids (may be empty).
	 * @param int    $variationId      Variation id (0 = none).
	 * @param int    $quantity         Cart quantity (advancedformula context).
	 * @return array{price:float,breakdown:array<int,float>,lines:array<int,array>,setIds:int[]}
	 */
	public function calculate( string $rawSelectionJson, int $productId, array $publishedSetIds, int $variationId = 0, int $quantity = 1 ): array {
		$empty = array(
			'price'     => 0.0,
			'breakdown' => array(),
			'lines'     => array(),
			'setIds'    => array(),
		);

		$selection = Str::json( $rawSelectionJson, array() );
		if ( ! is_array( $selection ) || array() === $selection ) {
			return $empty;
		}

		// Resolve the working set list (fall back to assignment resolver).
		$setIds = array_values( array_filter( array_map( 'intval', (array) $publishedSetIds ) ) );
		if ( array() === $setIds ) {
			$setIds = $this->assign->for_product( $productId );
		}
		if ( array() === $setIds ) {
			return $empty;
		}

		$theId          = $variationId > 0 ? $variationId : $productId;
		$wcProduct      = function_exists( 'wc_get_product' ) ? wc_get_product( $theId ) : null;
		$percentBase    = $this->productPercentBase( $productId, $variationId );
		$advDynamics    = $this->productDynamics( $wcProduct, $percentBase, $quantity );
		$formulaNumeric = $this->collectFormulaVars( $selection, $setIds );

		$price     = 0.0;
		$breakdown = array();
		$lines     = array();

		foreach ( $selection as $fieldId => $field ) {
			if ( ! is_array( $field ) ) {
				continue;
			}

			$type = isset( $field['type'] ) ? (string) $field['type'] : '';

			// Linked products are added to the cart as separate WC lines.
			if ( 'linkedproducts' === $type ) {
				continue;
			}

			$located = $this->locateNode( (string) $fieldId, $setIds );
			$isFormula = in_array( $type, array( 'formula', 'advancedformula' ), true );

			if ( null === $located && ! $isFormula ) {
				continue;
			}

			$node  = $located['node'] ?? array();
			$setId = (int) ( $located['setId'] ?? 0 );
			$value = $field['value'] ?? '';

			if ( 'formula' === $type ) {
				$optPrice = $this->priceFormula( $node, $percentBase, $formulaNumeric );
				$display  = '';
			} elseif ( 'advancedformula' === $type ) {
				$dynamics = isset( $field['dynamics'] ) && is_array( $field['dynamics'] ) ? $field['dynamics'] : array();
				$optPrice = $this->priceAdvancedFormula( $node, array_merge( $dynamics, $advDynamics ) );
				$display  = '';
			} else {
				$optPrice = $this->priceChoiceField( $field, $node, $percentBase );
				$display  = $this->summarizeField( $node, $value, $productId, $setId );
			}

			$optPrice = (float) $optPrice;

			if ( $setId > 0 ) {
				if ( ! isset( $breakdown[ $setId ] ) ) {
					$breakdown[ $setId ] = 0.0;
				}
				$breakdown[ $setId ] += $optPrice;
			}

			$lines[] = array(
				'name'  => $this->lineName( $node, $field ),
				'value' => $this->lineValue( $display, $optPrice, $wcProduct ),
				'_meta' => array(
					'mode' => $this->resolvedMode( $field, $node ),
					'raw'  => $optPrice,
				),
			);

			$price += $optPrice;
		}

		return array(
			'price'     => (float) $price,
			'breakdown' => $breakdown,
			'lines'     => $lines,
			'setIds'    => array_values( array_unique( array_map( 'intval', array_keys( $breakdown ) ) ) ),
		);
	}

	/**
	 * Product base price (sale-or-regular), reverted to base currency,
	 * pre-tax. Used as the WC set_price starting point by callers.
	 *
	 * @param int $productId   Product id.
	 * @param int $variationId Variation id (0 = none).
	 * @return float
	 */
	public function productBasePrice( int $productId, int $variationId = 0 ): float {
		$theId   = $variationId > 0 ? $variationId : $productId;
		$product = function_exists( 'wc_get_product' ) ? wc_get_product( $theId ) : null;

		$base = 0.0;
		if ( $product && method_exists( $product, 'get_price' ) ) {
			$base = Money::f( $product->get_price() );
		}

		// Stored prices may already be in the active currency; bring to base.
		$base = CurrencyBridge::revert( $base );

		/**
		 * Filter the resolved product base price (base currency, pre-tax).
		 *
		 * @param float $base        Base price.
		 * @param int   $productId   Product id.
		 * @param int   $variationId Variation id.
		 */
		return (float) apply_filters( 'optset_price_base', $base, $productId, $variationId );
	}

	/**
	 * Base value used for percent price-mode math.
	 *
	 * @param int $productId   Product id.
	 * @param int $variationId Variation id (0 = none).
	 * @return float
	 */
	public function productPercentBase( int $productId, int $variationId = 0 ): float {
		$base = $this->productBasePrice( $productId, $variationId );

		/**
		 * Filter the base used for percent price-mode calculations.
		 *
		 * @param float $base        Percent base.
		 * @param int   $productId   Product id.
		 * @param int   $variationId Variation id.
		 */
		return (float) apply_filters( 'optset_price_percent_base', $base, $productId, $variationId );
	}

	/* ----------------------------------------------------------------- */
	/* Internal helpers                                                   */
	/* ----------------------------------------------------------------- */

	/**
	 * Locate a field node across the working set field trees.
	 *
	 * @param string $fieldId Field id.
	 * @param int[]  $setIds  Working set ids.
	 * @return array{node:array,setId:int}|null
	 */
	private function locateNode( string $fieldId, array $setIds ) {
		foreach ( $setIds as $setId ) {
			$node = $this->sets->find_node( $this->sets->fields( $setId ), $fieldId );
			if ( is_array( $node ) ) {
				return array(
					'node'  => $node,
					'setId' => (int) $setId,
				);
			}
		}
		return null;
	}

	/**
	 * Selected choice indexes for a field selection.
	 *
	 * @param array $field Selection entry.
	 * @return int[]
	 */
	private function selectedIndexes( array $field ): array {
		if ( isset( $field['choiceIndexes'] ) && is_array( $field['choiceIndexes'] ) ) {
			return array_values( array_map( 'intval', $field['choiceIndexes'] ) );
		}
		return array();
	}

	/**
	 * Resolve a choice cost — sale price takes priority whenever it is set
	 * (matches the badge display and the builder preview, so the cart line
	 * agrees with what the customer just saw on the product page).
	 *
	 * @param array $choice Choice node.
	 * @return float
	 */
	private function choiceCost( array $choice ): float {
		$regular = isset( $choice['regular'] ) ? $choice['regular'] : '';
		$sale    = isset( $choice['sale'] ) ? $choice['sale'] : '';

		if ( '' !== $sale && null !== $sale ) {
			return Money::f( $sale );
		}
		return Money::f( $regular );
	}

	/**
	 * Price a non-formula field (choice / value driven).
	 *
	 * @param array $field       Selection entry.
	 * @param array $node        Field node.
	 * @param float $percentBase Percent base value.
	 * @return float
	 */
	private function priceChoiceField( array $field, array $node, float $percentBase ): float {
		$choices = isset( $node['choices'] ) && is_array( $node['choices'] ) ? array_values( $node['choices'] ) : array();
		if ( array() === $choices ) {
			return 0.0;
		}

		$value   = $field['value'] ?? '';
		$indexes = $this->selectedIndexes( $field );
		$total   = 0.0;

		if ( array() === $indexes ) {
			// Single value-driven control: price against the first choice, but
			// only once the customer has actually supplied a value (mirrors the
			// storefront gate so an untouched optional field never pre-charges).
			if ( $this->isEmptyValue( $value ) ) {
				return 0.0;
			}
			$total = $this->modePrice( $choices[0], $value, $percentBase, 0, $field );
		} else {
			foreach ( $indexes as $slot => $idx ) {
				if ( ! isset( $choices[ $idx ] ) ) {
					continue;
				}
				$total += $this->modePrice( $choices[ $idx ], $value, $percentBase, $slot, $field );
			}
		}

		/**
		 * Filter a single field's computed option price.
		 *
		 * @param float $total Computed price.
		 * @param array $node  Field node.
		 * @param array $field Selection entry.
		 */
		return (float) apply_filters( 'optset_price_choice', $total, $node, $field );
	}

	/**
	 * Apply a single choice's price mode.
	 *
	 * @param array $choice      Choice node.
	 * @param mixed $value       Selection value.
	 * @param float $percentBase Percent base.
	 * @param int   $slot        Selection slot index (per_unit count lookup).
	 * @param array $field       Full selection entry.
	 * @return float
	 */
	private function modePrice( array $choice, $value, float $percentBase, int $slot, array $field ): float {
		$cost = $this->choiceCost( $choice );
		$mode = isset( $choice['priceMode'] ) ? (string) $choice['priceMode'] : 'none';

		switch ( $mode ) {
			case 'none':
				return 0.0;

			case 'flat':
				return $cost;

			case 'per_char':
				return mb_strlen( $this->scalar( $value ) ) * $cost;

			case 'percent':
				return $percentBase * $cost / 100;

			case 'per_unit':
				return $this->unitCount( $value, $slot ) * $cost;

			case 'per_word':
				return (float) str_word_count( $this->scalar( $value ) ) * $cost;

			case 'per_char_nospace':
				return mb_strlen( str_replace( ' ', '', $this->scalar( $value ) ) ) * $cost;
		}

		/**
		 * Allow third parties to compute a custom price mode. Returning null
		 * leaves the flat fallback in control.
		 *
		 * @param float|null $amount  Computed amount, or null if unhandled.
		 * @param string     $mode    Raw price mode.
		 * @param array      $context cost, value, percentBase, slot, choice, field.
		 */
		$amount = apply_filters(
			'optset_price_mode_amount',
			null,
			$mode,
			array(
				'cost'        => $cost,
				'value'       => $value,
				'percentBase' => $percentBase,
				'slot'        => $slot,
				'choice'      => $choice,
				'field'       => $field,
			)
		);

		return is_numeric( $amount ) ? (float) $amount : $cost;
	}

	/**
	 * per_unit multiplier: a choice's `count` when present, else the numeric
	 * value of the field.
	 *
	 * @param mixed $value Selection value.
	 * @param int   $slot  Slot index.
	 * @return float
	 */
	private function unitCount( $value, int $slot ): float {
		if ( is_array( $value ) ) {
			if ( isset( $value[ $slot ] ) && is_array( $value[ $slot ] ) && isset( $value[ $slot ]['count'] ) && '' !== $value[ $slot ]['count'] ) {
				return \OptionSetBuilder\Support\Money::f( $value[ $slot ]['count'] );
			}
			if ( isset( $value['count'] ) && '' !== $value['count'] ) {
				return \OptionSetBuilder\Support\Money::f( $value['count'] );
			}
			return 1.0;
		}
		return \OptionSetBuilder\Support\Money::f( $value );
	}

	/**
	 * Whether a single-value selection counts as "not provided", so a value
	 * field's surcharge is withheld until the customer supplies a value.
	 *
	 * @param mixed $value Selection value.
	 * @return bool
	 */
	private function isEmptyValue( $value ): bool {
		if ( null === $value ) {
			return true;
		}
		if ( is_string( $value ) ) {
			return '' === trim( $value );
		}
		if ( is_array( $value ) ) {
			foreach ( $value as $v ) {
				if ( '' !== trim( (string) $v ) ) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	/**
	 * Flatten a selection value to a string for char/word counting.
	 *
	 * @param mixed $value Selection value.
	 * @return string
	 */
	private function scalar( $value ): string {
		if ( is_array( $value ) ) {
			$flat = array();
			foreach ( $value as $v ) {
				if ( is_array( $v ) ) {
					$flat[] = isset( $v['label'] ) ? (string) $v['label'] : '';
				} else {
					$flat[] = is_scalar( $v ) ? (string) $v : '';
				}
			}
			return implode( ' ', $flat );
		}
		return is_scalar( $value ) ? (string) $value : '';
	}

	/**
	 * Evaluate a simple `formula` field.
	 *
	 * @param array $node    Field node.
	 * @param float $base    Product base price.
	 * @param array $numeric Numeric variables keyed by field id.
	 * @return float
	 */
	private function priceFormula( array $node, float $base, array $numeric ): float {
		if ( ! class_exists( '\\OptionSetBuilder\\Formula\\ArithmeticEvaluator' ) ) {
			return 0.0;
		}

		$expression = $this->configExpression( $node );
		if ( '' === $expression ) {
			return 0.0;
		}

		$vars = array_merge( array( 'product_price' => $base ), $numeric );

		try {
			return (float) \OptionSetBuilder\Formula\ArithmeticEvaluator::evaluate( $expression, $vars );
		} catch ( \Throwable $e ) {
			return 0.0;
		}
	}

	/**
	 * Evaluate an `advancedformula` field.
	 *
	 * @param array $node     Field node.
	 * @param array $dynamics Dynamic + product variables.
	 * @return float
	 */
	private function priceAdvancedFormula( array $node, array $dynamics ): float {
		$expression = $this->configExpression( $node );
		if ( '' === $expression ) {
			return 0.0;
		}

		// Evaluate the expression with the bundled AST engine (functions,
		// comparisons, dynamic product variables). Soft-fails to 0.
		$evaluated = null;
		if ( class_exists( '\\OptionSetBuilder\\Formula\\Ast\\ExpressionEngine' ) ) {
			try {
				$value     = ( new \OptionSetBuilder\Formula\Ast\ExpressionEngine() )->evaluateSafe(
					$expression,
					is_array( $dynamics ) ? $dynamics : array()
				);
				$evaluated = is_numeric( $value ) ? (float) $value : null;
			} catch ( \Throwable $e ) {
				$evaluated = null;
			}
		}

		/**
		 * Allow third parties to override the computed advanced-formula result.
		 *
		 * @param float|null $result     Computed result, or null if unhandled.
		 * @param string     $expression The formula expression.
		 * @param array      $dynamics   Variable bag (product + dynamic vars).
		 * @param array      $node       Field node.
		 */
		$result = apply_filters( 'optset_price_advanced_formula', $evaluated, $expression, $dynamics, $node );

		return is_numeric( $result ) ? (float) $result : 0.0;
	}

	/**
	 * Pull a formula expression from a node's config bag.
	 *
	 * @param array $node Field node.
	 * @return string
	 */
	private function configExpression( array $node ): string {
		$config = isset( $node['config'] ) && is_array( $node['config'] ) ? $node['config'] : array();
		if ( isset( $config['expression'] ) && is_string( $config['expression'] ) ) {
			return $config['expression'];
		}
		return '';
	}

	/**
	 * Collect numeric variables for simple formula evaluation: number/range
	 * field values plus resolved select/dropdown costs, keyed by field id.
	 *
	 * @param array $selection Decoded selection map.
	 * @param int[] $setIds    Working set ids.
	 * @return array<string,float>
	 */
	private function collectFormulaVars( array $selection, array $setIds ): array {
		$vars = array();

		foreach ( $selection as $fieldId => $field ) {
			if ( ! is_array( $field ) || ! isset( $field['type'] ) ) {
				continue;
			}
			$type = (string) $field['type'];

			if ( 'number' === $type || 'range' === $type ) {
				$vars[ (string) $fieldId ] = Money::f( $field['value'] ?? 0 );
				continue;
			}

			if ( 'select' === $type ) {
				$indexes = $this->selectedIndexes( $field );
				if ( array() === $indexes ) {
					continue;
				}
				$located = $this->locateNode( (string) $fieldId, $setIds );
				if ( null === $located ) {
					continue;
				}
				$choices = isset( $located['node']['choices'] ) && is_array( $located['node']['choices'] )
					? array_values( $located['node']['choices'] ) : array();
				$idx = $indexes[0];
				if ( ! isset( $choices[ $idx ] ) ) {
					continue;
				}
				$choice = $choices[ $idx ];
				$cost   = $this->choiceCost( $choice );
				// A "none"-priced option contributes 0 to a formula variable;
				// any other mode contributes its resolved cost.
				$mode = isset( $choice['priceMode'] ) ? (string) $choice['priceMode'] : 'flat';
				if ( 'none' === $mode ) {
					$cost = 0.0;
				}
				$vars[ (string) $fieldId ] = $cost;
			}
		}

		return $vars;
	}

	/**
	 * Build the dynamic variable bag for advancedformula evaluation.
	 *
	 * @param mixed $product  WC product or null.
	 * @param float $base     Product base price.
	 * @param int   $quantity Cart quantity.
	 * @return array<string,float>
	 */
	private function productDynamics( $product, float $base, int $quantity ): array {
		$num = static function ( $val ) {
			return $val ? Money::f( $val ) : 0.0;
		};

		return array(
			'product_price'    => $base,
			'product_quantity' => (float) max( 1, $quantity ),
			'product_weight'   => ( $product && method_exists( $product, 'get_weight' ) ) ? $num( $product->get_weight() ) : 0.0,
			'product_length'   => ( $product && method_exists( $product, 'get_length' ) ) ? $num( $product->get_length() ) : 0.0,
			'product_width'    => ( $product && method_exists( $product, 'get_width' ) ) ? $num( $product->get_width() ) : 0.0,
			'product_height'   => ( $product && method_exists( $product, 'get_height' ) ) ? $num( $product->get_height() ) : 0.0,
		);
	}

	/**
	 * Build the human-readable value text via the field instance.
	 *
	 * @param array $node      Field node.
	 * @param mixed $value     Selection value.
	 * @param int   $productId Product id.
	 * @param int   $setId     Set id.
	 * @return string
	 */
	private function summarizeField( array $node, $value, int $productId, int $setId ): string {
		$instance = $this->fields->make( $node, $productId, $setId );
		if ( $instance ) {
			return (string) $instance->summarize( $value );
		}
		return is_scalar( $value ) ? (string) $value : '';
	}

	/**
	 * Line display name.
	 *
	 * @param array $node  Field node.
	 * @param array $field Selection entry.
	 * @return string
	 */
	private function lineName( array $node, array $field ): string {
		$label = isset( $node['label'] ) && '' !== $node['label']
			? (string) $node['label']
			: ( isset( $field['label'] ) ? (string) $field['label'] : '' );

		if ( '' === $label ) {
			$label = __( 'Option', 'option-set-builder' );
		}
		return esc_html( $label );
	}

	/**
	 * Line display value with an appended price suffix (active currency).
	 *
	 * @param string $display  Summarised value text.
	 * @param float  $optPrice Option price (base currency).
	 * @param mixed  $product  WC product (tax display context).
	 * @return string
	 */
	private function lineValue( string $display, float $optPrice, $product ): string {
		if ( 0.0 === $optPrice ) {
			return $display;
		}

		$shown  = TaxBridge::taxAndCurrency( $optPrice, $product, 'cart' );
		$suffix = ' <strong class="optset-line-price">+' . Money::html( $shown ) . '</strong>';

		return $display . $suffix;
	}

	/**
	 * Effective price mode label for line metadata.
	 *
	 * @param array $field Selection entry.
	 * @param array $node  Field node.
	 * @return string
	 */
	private function resolvedMode( array $field, array $node ): string {
		$type = isset( $field['type'] ) ? (string) $field['type'] : '';
		if ( 'formula' === $type || 'advancedformula' === $type ) {
			return $type;
		}

		$choices = isset( $node['choices'] ) && is_array( $node['choices'] ) ? array_values( $node['choices'] ) : array();
		$indexes = $this->selectedIndexes( $field );
		$idx     = ( array() !== $indexes && isset( $indexes[0] ) ) ? $indexes[0] : 0;

		if ( isset( $choices[ $idx ]['priceMode'] ) ) {
			return (string) $choices[ $idx ]['priceMode'];
		}
		return 'none';
	}
}
