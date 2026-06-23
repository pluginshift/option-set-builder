<?php
/**
 * Display-side price badge helpers.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Concerns;

use OptionSetBuilder\Support\Money;

defined( 'ABSPATH' ) || exit;

/**
 * Produces the small "+$5" badge shown next to choices / labels. This is
 * presentation only — authoritative pricing lives in PriceCalculator. For
 * `percent` mode the badge shows the *calculated* currency amount (product
 * price × percent), not the raw "+50%", so the customer sees the same number the cart will
 * charge.
 */
trait HandlesPricing {

	/**
	 * Numeric regular cost (always the regular price).
	 *
	 * @param array $choice Choice node.
	 * @return float
	 */
	protected function choice_regular( array $choice ) {
		return Money::f( isset( $choice['regular'] ) ? $choice['regular'] : '' );
	}

	/**
	 * Numeric sale cost (or null when no sale price is set).
	 *
	 * @param array $choice Choice node.
	 * @return float|null
	 */
	protected function choice_sale( array $choice ) {
		$sale = isset( $choice['sale'] ) ? $choice['sale'] : '';
		if ( '' === $sale || null === $sale ) {
			return null;
		}
		return Money::f( $sale );
	}

	/**
	 * Effective numeric cost for a choice — sale takes priority when set.
	 *
	 * @param array $choice Choice node.
	 * @return float
	 */
	protected function choice_cost( array $choice ) {
		$sale = $this->choice_sale( $choice );
		if ( null !== $sale ) {
			return $sale;
		}
		return $this->choice_regular( $choice );
	}

	/**
	 * Numeric pricing data-* attributes for a choice. The storefront JS
	 * reads these to compute the live price preview.
	 *
	 * @param array $choice Choice node.
	 * @return array
	 */
	protected function choice_price_attrs( array $choice ) {
		return array(
			'data-price-mode' => ( isset( $choice['priceMode'] ) && '' !== $choice['priceMode'] ) ? $choice['priceMode'] : 'none',
			'data-cost'       => isset( $choice['regular'] ) && '' !== $choice['regular'] ? (string) Money::f( $choice['regular'] ) : '',
			'data-cost-sale'  => isset( $choice['sale'] ) && '' !== $choice['sale'] ? (string) Money::f( $choice['sale'] ) : '',
		);
	}

	/**
	 * Product price used as the multiplier for percent-mode badges. Matches
	 * what WooCommerce charges (sale-or-regular) and what
	 * PriceCalculator::productPercentBase resolves at cart time.
	 *
	 * @return float
	 */
	private function percent_base() {
		if ( ! $this->product_id || ! function_exists( 'wc_get_product' ) ) {
			return 0.0;
		}
		$product = wc_get_product( $this->product_id );
		if ( ! $product || ! method_exists( $product, 'get_price' ) ) {
			return 0.0;
		}
		return Money::f( $product->get_price() );
	}

	/**
	 * Badge HTML for a choice, or '' when it has no price. When both a
	 * regular and a (smaller) sale price are set the regular renders struck
	 * through next to the sale — mirroring the builder preview and the
	 * standard WooCommerce sale-price treatment.
	 *
	 * @param array $choice Choice node.
	 * @return string
	 */
	protected function price_badge( array $choice ) {
		$mode = isset( $choice['priceMode'] ) ? $choice['priceMode'] : 'none';
		if ( 'none' === $mode || '' === $mode ) {
			return '';
		}

		$regular = $this->choice_regular( $choice );
		$sale    = $this->choice_sale( $choice );

		// For `percent`, surface the calculated currency amount the cart will
		// actually add, not the raw "%" the author typed.
		if ( 'percent' === $mode ) {
			$base    = $this->percent_base();
			$regular = $base * $regular / 100;
			if ( null !== $sale ) {
				$sale = $base * $sale / 100;
			}
		}

		// Per-mode per-unit suffix (percent/flat are one-off, so no suffix).
		$suffix = '';
		if ( 'per_char' === $mode || 'per_char_nospace' === $mode ) {
			$suffix = '/' . esc_html__( 'char', 'option-set-builder' );
		} elseif ( 'per_word' === $mode ) {
			$suffix = '/' . esc_html__( 'word', 'option-set-builder' );
		} elseif ( 'per_unit' === $mode ) {
			$suffix = '/' . esc_html__( 'unit', 'option-set-builder' );
		}

		$show_pair = ( null !== $sale && $sale < $regular );

		if ( $show_pair ) {
			return '<span class="optset-price-badge optset-price-badge--has-sale">'
				. '<del class="optset-price-badge__regular" aria-hidden="true">' . wp_kses_post( Money::html( $regular ) ) . '</del>'
				. ' <ins class="optset-price-badge__sale">+' . wp_kses_post( Money::html( $sale ) ) . $suffix . '</ins>'
				. '</span>';
		}

		$amount = ( null !== $sale ) ? $sale : $regular;
		return '<span class="optset-price-badge">+' . wp_kses_post( Money::html( $amount ) ) . $suffix . '</span>';
	}
}
