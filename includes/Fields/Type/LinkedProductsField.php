<?php
/**
 * Linked products field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Lets the customer add related WooCommerce products as separate cart
 * lines. Not priced through the calculator (added as real WC lines).
 */
final class LinkedProductsField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'linkedproducts';
	}

	/**
	 * Priced via separate WC line items, not the options calculator.
	 *
	 * @return bool
	 */
	public function priceable() {
		return false;
	}

	/**
	 * Control markup. Renders a grid of product cards. Variable products expand
	 * to one card per selected variation, or — when "merge variations" is on —
	 * a single card whose variations are chosen from an inline dropdown. The
	 * free tier is capped at two linked products.
	 *
	 * @return string
	 */
	protected function inner() {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return '';
		}

		$items = $this->cfg( 'products', array() );
		$items = is_array( $items ) ? array_values( $items ) : array();
		$items = array_values(
			array_filter(
				$items,
				static function ( $item ) {
					return is_array( $item );
				}
			)
		);
		if ( empty( $items ) ) {
			return '';
		}

		$multiple     = ! empty( $this->cfg( 'multiple' ) );
		$merge        = ! empty( $this->cfg( 'mergeVariations' ) );
		$input_t      = $multiple ? 'checkbox' : 'radio';
		$name         = 'optset_lp_' . $this->id() . ( $multiple ? '[]' : '' );
		$index        = 0;
		$checked_used = false;

		$html = '<div class="optset-linked optset-linked--cards"'
			. $this->attrs(
				array(
					'data-multiple' => $multiple ? 'yes' : 'no',
					'data-merge'    => $merge ? 'yes' : 'no',
					'data-qty'      => ! empty( $this->cfg( 'enableQty' ) ) ? 'yes' : 'no',
				)
			) . '>';

		foreach ( $items as $item ) {
			$pid     = isset( $item['id'] ) ? (int) $item['id'] : 0;
			$product = $pid > 0 ? wc_get_product( $pid ) : false;
			if ( ! $product ) {
				continue;
			}

			$selected_variations = isset( $item['variations'] ) && is_array( $item['variations'] )
				? array_map( 'intval', $item['variations'] )
				: array();

			// Simple product → one card. "Active" pre-selects it; with a
			// single-select field only the first active product is checked.
			if ( ! $product->is_type( 'variable' ) ) {
				if ( $product->is_purchasable() ) {
					$checked = ! empty( $item['active'] ) && ( $multiple || ! $checked_used );
					if ( $checked ) {
						$checked_used = true;
					}
					$html .= $this->card( $product, $name, $input_t, $pid, 0, $index, array(), $checked );
					++$index;
				}
				continue;
			}

			// Variable product → resolve the purchasable, selected variations.
			$variations = array();
			foreach ( $selected_variations as $vid ) {
				$variation = wc_get_product( $vid );
				if ( $variation && $variation->is_purchasable() ) {
					$variations[] = $variation;
				}
			}
			if ( empty( $variations ) ) {
				continue;
			}

			if ( $merge ) {
				// One card; variation chosen from an inline dropdown.
				$html .= $this->card( $product, $name, $input_t, $pid, 0, $index, $variations, false );
				++$index;
			} else {
				foreach ( $variations as $variation ) {
					$html .= $this->card( $variation, $name, $input_t, $pid, $variation->get_id(), $index, array(), false );
					++$index;
				}
			}
		}

		$html .= '</div>';
		return $html;
	}

	/**
	 * Render a single product card.
	 *
	 * @param \WC_Product $product    Product (or variation) backing the card.
	 * @param string      $name       Native input name.
	 * @param string      $input_t    'checkbox' or 'radio'.
	 * @param int         $pid        Parent product id (submitted to the cart).
	 * @param int         $vid        Variation id, or 0 (baked onto the input).
	 * @param int         $index      Card index (unique qty input name).
	 * @param array       $variations Merge-mode variation list for the dropdown.
	 * @param bool        $checked    Whether the card is selected by default.
	 * @return string
	 */
	private function card( $product, $name, $input_t, $pid, $vid, $index, $variations, $checked = false ) {
		$lookup = $vid > 0 ? $vid : $pid;

		// Size (width/height) is applied to the whole card so it stays
		// responsive; the shape/radius applies to the product image only.
		$card_style  = $this->card_size_style();
		$radius_style = $this->thumb_radius_style();

		$html  = '<label class="optset-linked__card"' . ( '' !== $card_style ? ' style="' . esc_attr( $card_style ) . '"' : '' ) . '>';
		$html .= '<input type="' . esc_attr( $input_t ) . '" class="optset-linked__native" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $lookup ) . '"'
			. $this->attrs(
				array(
					'data-product-id' => $pid,
					'data-variation'  => $vid > 0 ? $vid : '',
					// Effective per-unit price for the on-page total (WC has
					// already resolved any sale price via get_price()).
					'data-lp-price'   => (string) (float) $product->get_price(),
					'checked'         => (bool) $checked,
				)
			) . ' />';
		$html .= '<span class="optset-linked__check" aria-hidden="true"></span>';
		$html .= '<span class="optset-linked__thumb"' . ( '' !== $radius_style ? ' style="' . esc_attr( $radius_style ) . '"' : '' ) . '>'
			. $product->get_image( 'woocommerce_thumbnail' ) . '</span>';
		$html .= '<span class="optset-linked__meta">';
		$html .= '<span class="optset-linked__title">' . esc_html( $product->get_name() ) . '</span>';

		if ( ! empty( $variations ) ) {
			$html .= '<select class="optset-linked__varsel">';
			foreach ( $variations as $variation ) {
				$html .= '<option value="' . esc_attr( (string) $variation->get_id() ) . '"'
					. $this->attrs( array( 'data-price' => (string) (float) $variation->get_price() ) ) . '>'
					. esc_html( $variation->get_name() ) . '</option>';
			}
			$html .= '</select>';
		}

		$html .= '<span class="optset-linked__price">' . wp_kses_post( $product->get_price_html() ) . '</span>';
		$html .= '</span>';
		$html .= $this->qty_box( $index );
		$html .= '</label>';

		return $html;
	}

	/**
	 * Inline width/height for the whole card (configurable, keeps the grid
	 * responsive). Empty when no size is set.
	 *
	 * @return string CSS declarations.
	 */
	private function card_size_style() {
		$parts  = array();
		$width  = (string) $this->cfg( 'swatchWidth', '' );
		$height = (string) $this->cfg( 'swatchHeight', '' );
		if ( '' !== $width ) {
			$parts[] = 'width:' . (int) $width . 'px';
		}
		if ( '' !== $height ) {
			$parts[] = 'height:' . (int) $height . 'px';
		}
		return implode( ';', $parts );
	}

	/**
	 * Inline border-radius for the product image, honouring the shape preset.
	 *
	 * @return string CSS declarations.
	 */
	private function thumb_radius_style() {
		$radius = (string) $this->cfg( 'swatchRadius', '' );
		$shape  = (string) $this->cfg( 'shape', '' );
		if ( '' !== $radius ) {
			return 'border-radius:' . (int) $radius . 'px';
		}
		if ( 'circle' === $shape ) {
			return 'border-radius:50%';
		}
		if ( 'rounded' === $shape ) {
			return 'border-radius:10px';
		}
		if ( 'square' === $shape ) {
			return 'border-radius:4px';
		}
		return '';
	}

	/**
	 * Per-card quantity stepper, rendered only when the field enables quantity.
	 *
	 * @param int $index Card index (unique input name).
	 * @return string
	 */
	private function qty_box( $index ) {
		if ( empty( $this->cfg( 'enableQty' ) ) ) {
			return '';
		}
		$min = '' !== (string) $this->cfg( 'minQty', '' ) ? max( 1, (int) $this->cfg( 'minQty' ) ) : 1;
		$max = '' !== (string) $this->cfg( 'maxQty', '' ) ? (int) $this->cfg( 'maxQty' ) : '';

		return '<input type="number" class="optset-linked__qty" name="optset_lpq_' . esc_attr( $this->id() ) . '_' . esc_attr( (string) $index ) . '"'
			. $this->attrs(
				array(
					'min'   => $min,
					'max'   => $max,
					'value' => $min,
				)
			) . ' />';
	}

	/**
	 * Summarise selected linked products by title.
	 *
	 * @param mixed $value Selection value.
	 * @return string
	 */
	public function summarize( $value ) {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return parent::summarize( $value );
		}
		$ids   = is_array( $value ) ? $value : array( $value );
		$names = array();
		foreach ( $ids as $id ) {
			if ( is_array( $id ) ) {
				$id = isset( $id['id'] ) ? $id['id'] : 0;
			}
			$product = (int) $id > 0 ? wc_get_product( (int) $id ) : false;
			if ( $product ) {
				$names[] = sanitize_text_field( $product->get_name() );
			}
		}
		return implode( ', ', $names );
	}
}
