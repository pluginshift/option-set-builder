<?php
/**
 * Cart-side integration: validation, item data, totals, display.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Integration\WooCommerce;

use OptionSetBuilder\Core\Container;
use OptionSetBuilder\Data\AssignmentResolver;
use OptionSetBuilder\Data\OptionSetRepository;
use OptionSetBuilder\Data\Sanitizer;
use OptionSetBuilder\Pricing\Currency\CurrencyBridge;
use OptionSetBuilder\Pricing\PriceCalculator;
use OptionSetBuilder\Support\Str;

defined( 'ABSPATH' ) || exit;

/**
 * Bridges the storefront selection POST into WooCommerce cart items, recomputes
 * the per-unit option price idempotently before totals, exposes the human
 * lines in cart/checkout and adds linked products as their own lines.
 */
final class CartHooks {

	/**
	 * Service container.
	 *
	 * @var Container
	 */
	private $container;

	/**
	 * Constructor.
	 *
	 * @param Container $container Service container.
	 */
	public function __construct( Container $container ) {
		$this->container = $container;
	}

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function register() {
		add_filter( 'woocommerce_add_to_cart_validation', array( $this, 'validate' ), 10, 2 );
		add_filter( 'woocommerce_add_cart_item_data', array( $this, 'add_cart_item_data' ), 10, 3 );
		add_action( 'woocommerce_add_to_cart', array( $this, 'add_linked_products' ), 10, 6 );
		add_action( 'woocommerce_before_calculate_totals', array( $this, 'recalculate_totals' ), 999, 1 );
		add_filter( 'woocommerce_get_item_data', array( $this, 'display_item_data' ), 10, 2 );
		add_action( 'woocommerce_before_mini_cart', array( $this, 'mini_cart_recalc' ), 1 );
	}

	/**
	 * Resolvers.
	 *
	 * @return PriceCalculator|null
	 */
	private function pricing() {
		return $this->container->get( 'pricing' );
	}

	/**
	 * Validate required option fields before add-to-cart.
	 *
	 * @param bool $passed     Current validation state.
	 * @param int  $product_id Product id.
	 * @return bool
	 */
	public function validate( $passed, $product_id ) {
		/** @var AssignmentResolver $assignment */
		$assignment = $this->container->get( 'assignment' );
		$set_ids    = $assignment ? $assignment->for_product( (int) $product_id ) : array();
		if ( array() === $set_ids ) {
			return $passed;
		}

		// JSON payload: unslashed here and sanitized field-by-field after decoding.
		// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- WC core nonce-verifies the add-to-cart request; decoded JSON is sanitized below.
		$raw       = isset( $_POST['optset_field_data'] ) ? Str::unslash( wp_unslash( $_POST['optset_field_data'] ) ) : '';
		$selection = Sanitizer::selection( Str::json( $raw, array() ) );
		$selection = is_array( $selection ) ? $selection : array();

		/** @var OptionSetRepository $sets */
		$sets     = $this->container->get( 'sets' );
		$required = array();
		foreach ( $set_ids as $set_id ) {
			$map = Str::json( get_post_meta( (int) $set_id, OptionSetRepository::META_REQUIRED, true ), array() );
			if ( is_array( $map ) ) {
				$required = array_merge( $required, array_keys( $map ) );
			}
		}
		unset( $sets );

		$submitted = array_keys( $selection );
		foreach ( array_unique( $required ) as $field_id ) {
			if ( ! in_array( (string) $field_id, array_map( 'strval', $submitted ), true ) ) {
				if ( function_exists( 'wc_add_notice' ) ) {
					wc_add_notice(
						esc_html__( 'Please fill in all required product options.', 'option-set-builder' ),
						'error'
					);
				}
				return false;
			}
		}

		return $passed;
	}

	/**
	 * Capture the selection into cart item data + compute the option price.
	 *
	 * @param array $cart_item_data Cart item data.
	 * @param int   $product_id     Product id.
	 * @param int   $variation_id   Variation id.
	 * @return array
	 */
	public function add_cart_item_data( $cart_item_data, $product_id, $variation_id ) {
		// Decode the raw JSON payloads first, then sanitize every nested value.
		// phpcs:disable WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- WC core nonce-verifies the add-to-cart request; decoded JSON is sanitized below.
		$raw_post   = isset( $_POST['optset_field_data'] ) ? Str::unslash( wp_unslash( $_POST['optset_field_data'] ) ) : '';
		$set_ids    = isset( $_POST['optset_published_set_ids'] ) ? Str::json( wp_unslash( $_POST['optset_published_set_ids'] ), array() ) : array();
		$linked     = isset( $_POST['optset_linked_products'] ) ? Str::json( wp_unslash( $_POST['optset_linked_products'] ), array() ) : array();
		$quantity   = isset( $_POST['quantity'] ) ? max( 1, absint( wp_unslash( $_POST['quantity'] ) ) ) : 1;

		unset( $_POST['optset_field_data'], $_POST['optset_published_set_ids'], $_POST['optset_linked_products'] );
		// phpcs:enable WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized

		// Sanitize the decoded selection, then re-encode it so the JSON the
		// PriceCalculator re-decodes and the value stored on the cart item are
		// both clean. Linked products are reduced to their consumed integer fields.
		$selection = Sanitizer::selection( Str::json( $raw_post, array() ) );
		$selection = is_array( $selection ) ? $selection : array();
		$raw_json  = (string) wp_json_encode( $selection );
		$set_ids   = is_array( $set_ids ) ? array_values( array_map( 'intval', $set_ids ) ) : array();
		$linked    = Sanitizer::linked_products( $linked );

		// Nothing from this plugin on the request → leave the item untouched.
		if ( array() === $selection && array() === $linked ) {
			return $cart_item_data;
		}

		// Always carry the linked products so they become their own cart lines,
		// even for a set whose only field is Linked Products (which contributes
		// nothing to optset_field_data).
		if ( array() !== $linked ) {
			$cart_item_data['optset_linked_products'] = $linked;
		}

		// Priced option selection (linked products are NOT priced here — they
		// are added as real product lines instead).
		if ( array() !== $selection ) {
			$pricing = $this->pricing();
			if ( $pricing ) {
				$result = $pricing->calculate(
					(string) $raw_json,
					(int) $product_id,
					$set_ids,
					(int) $variation_id,
					(int) $quantity
				);

				$cart_item_data['optset_field_data']        = $result;
				$cart_item_data['optset_field_data_raw']    = (string) $raw_json;
				$cart_item_data['optset_published_set_ids'] = $set_ids;
				$cart_item_data['optset_base']              = $pricing->productBasePrice( (int) $product_id, (int) $variation_id );

				$record = ! empty( $result['setIds'] ) ? $result['setIds'] : $set_ids;
				foreach ( $record as $set_id ) {
					do_action( 'optset_stats_record', (int) $set_id, 'add_to_cart', 1 );
				}
			}
		}

		return $cart_item_data;
	}

	/**
	 * Add linked products as separate cart lines.
	 *
	 * @param string $cart_item_key  Cart item key.
	 * @param int    $product_id     Product id.
	 * @param int    $quantity       Quantity.
	 * @param int    $variation_id   Variation id.
	 * @param array  $variation      Variation attributes.
	 * @param array  $cart_item_data Cart item data.
	 * @return void
	 */
	public function add_linked_products( $cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data ) {
		unset( $cart_item_key, $product_id, $quantity, $variation_id, $variation );

		$linked = isset( $cart_item_data['optset_linked_products'] ) ? $cart_item_data['optset_linked_products'] : array();
		if ( ! is_array( $linked ) || array() === $linked ) {
			return;
		}
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return;
		}

		foreach ( $linked as $item ) {
			$id  = isset( $item['id'] ) ? (int) $item['id'] : 0;
			$vid = isset( $item['variation'] ) ? (int) $item['variation'] : 0;
			$qty = isset( $item['count'] ) ? max( 1, (int) $item['count'] ) : 1;
			if ( $id <= 0 ) {
				continue;
			}

			// Variations must be added with the parent id + variation id +
			// resolved attributes so WooCommerce records the correct line.
			if ( $vid > 0 && function_exists( 'wc_get_product' ) ) {
				$variation = wc_get_product( $vid );
				$attributes = ( $variation && method_exists( $variation, 'get_variation_attributes' ) )
					? $variation->get_variation_attributes()
					: array();
				WC()->cart->add_to_cart( $id, $qty, $vid, $attributes );
				continue;
			}

			WC()->cart->add_to_cart( $id, $qty );
		}
	}

	/**
	 * Recompute the per-unit option price before WC totals (run-once).
	 *
	 * @param \WC_Cart $cart Cart object.
	 * @return void
	 */
	public function recalculate_totals( $cart ) {
		if ( is_admin() && ! ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) ) {
			return;
		}
		if ( did_action( 'woocommerce_before_calculate_totals' ) > 1 ) {
			return;
		}
		if ( ! is_object( $cart ) || ! method_exists( $cart, 'get_cart' ) ) {
			return;
		}

		$pricing = $this->pricing();
		if ( ! $pricing ) {
			return;
		}

		foreach ( $cart->get_cart() as $cart_item ) {
			if ( empty( $cart_item['optset_field_data_raw'] ) || empty( $cart_item['data'] ) ) {
				continue;
			}

			$product      = $cart_item['data'];
			$product_id   = isset( $cart_item['product_id'] ) ? (int) $cart_item['product_id'] : 0;
			$variation_id = isset( $cart_item['variation_id'] ) ? (int) $cart_item['variation_id'] : 0;
			$quantity     = isset( $cart_item['quantity'] ) ? max( 1, (int) $cart_item['quantity'] ) : 1;
			$set_ids      = isset( $cart_item['optset_published_set_ids'] ) ? (array) $cart_item['optset_published_set_ids'] : array();

			$result = $pricing->calculate(
				(string) $cart_item['optset_field_data_raw'],
				$product_id,
				array_map( 'intval', $set_ids ),
				$variation_id,
				$quantity
			);

			$base    = isset( $cart_item['optset_base'] )
				? (float) $cart_item['optset_base']
				: $pricing->productBasePrice( $product_id, $variation_id );
			$options = isset( $result['price'] ) ? (float) $result['price'] : 0.0;

			// Per-unit only — WooCommerce multiplies by quantity itself.
			$final = $base + $options;

			// Final currency conversion only for the multi-currency cases that
			// store base-currency prices and need a per-cart conversion.
			if ( $this->needs_final_conversion() && class_exists( CurrencyBridge::class ) ) {
				$final = CurrencyBridge::convert( $final );
			}

			if ( method_exists( $product, 'set_price' ) ) {
				$product->set_price( $final );
			}
		}
	}

	/**
	 * Append option lines to the cart/checkout item data.
	 *
	 * @param array $item_data Existing item data rows.
	 * @param array $cart_item Cart item.
	 * @return array
	 */
	public function display_item_data( $item_data, $cart_item ) {
		$settings = $this->container->get( 'settings' );
		if ( $settings ) {
			if ( function_exists( 'is_cart' ) && is_cart() && (bool) $settings->get( 'hideInCart', false ) ) {
				return $item_data;
			}
			if ( function_exists( 'is_checkout' ) && is_checkout() && (bool) $settings->get( 'hideInCheckout', false ) ) {
				return $item_data;
			}
		}

		if ( empty( $cart_item['optset_field_data_raw'] ) ) {
			return $item_data;
		}

		$pricing = $this->pricing();
		if ( ! $pricing ) {
			return $item_data;
		}

		$result = $pricing->calculate(
			(string) $cart_item['optset_field_data_raw'],
			isset( $cart_item['product_id'] ) ? (int) $cart_item['product_id'] : 0,
			isset( $cart_item['optset_published_set_ids'] ) ? array_map( 'intval', (array) $cart_item['optset_published_set_ids'] ) : array(),
			isset( $cart_item['variation_id'] ) ? (int) $cart_item['variation_id'] : 0,
			isset( $cart_item['quantity'] ) ? max( 1, (int) $cart_item['quantity'] ) : 1
		);

		foreach ( (array) ( $result['lines'] ?? array() ) as $line ) {
			if ( ! is_array( $line ) || ! isset( $line['name'] ) ) {
				continue;
			}
			$item_data[] = array(
				'key'     => $line['name'],
				'value'   => $line['value'] ?? '',
				'display' => $line['value'] ?? '',
			);
		}

		return $item_data;
	}

	/**
	 * Recalculate cart totals for AJAX mini-cart refreshes.
	 *
	 * @return void
	 */
	public function mini_cart_recalc() {
		if ( ( function_exists( 'is_cart' ) && is_cart() )
			|| ( function_exists( 'is_checkout' ) && is_checkout() )
			|| ! ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) ) {
			return;
		}
		if ( function_exists( 'WC' ) && WC()->cart ) {
			WC()->cart->calculate_totals();
		}
	}

	/**
	 * Whether a final per-cart currency conversion is required.
	 *
	 * Limited to the WPML / Price-Based-Country / Aelia family that stores
	 * base-currency prices and converts at cart time.
	 *
	 * @return bool
	 */
	private function needs_final_conversion() {
		$wpml  = function_exists( 'wcml_is_multi_currency_on' ) && wcml_is_multi_currency_on();
		$pbc   = class_exists( 'WC_Product_Price_Based_Country' );
		$aelia = class_exists( 'WC_Aelia_CurrencySwitcher' );
		return (bool) ( $wpml || $pbc || $aelia );
	}
}
