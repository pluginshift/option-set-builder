<?php
/**
 * Tax + currency display bridge.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing;

use OptionSetBuilder\Pricing\Currency\CurrencyBridge;

defined( 'ABSPATH' ) || exit;

/**
 * Centralises "what number does the shopper actually see" decisions. WC's
 * own wc_get_price_to_display() applies the tax-inclusive/exclusive display
 * rules for a given product; we layer the active currency on top of that.
 */
final class TaxBridge {

	/**
	 * Apply WooCommerce tax-display rules to a raw amount.
	 *
	 * @param float       $price   Raw (base, pre-tax) amount.
	 * @param mixed       $product WC_Product or compatible object.
	 * @param string      $context Display context ('shop','cart','checkout').
	 * @return float Tax-adjusted amount in base currency.
	 */
	public static function toDisplay( float $price, $product, string $context = 'shop' ): float {
		if ( ! $price ) {
			return $price;
		}
		if ( ! function_exists( 'wc_get_price_to_display' ) || ! is_object( $product ) ) {
			return $price;
		}

		return (float) wc_get_price_to_display(
			$product,
			array(
				'qty'             => 1,
				'price'           => $price,
				'display_context' => $context,
			)
		);
	}

	/**
	 * Tax-adjust, then convert to the visitor's active currency.
	 *
	 * @param float  $price   Raw (base, pre-tax) amount.
	 * @param mixed  $product WC_Product or compatible object.
	 * @param string $context Display context.
	 * @return float Display amount in the active currency.
	 */
	public static function taxAndCurrency( float $price, $product, string $context ): float {
		return CurrencyBridge::convert( self::toDisplay( $price, $product, $context ) );
	}
}
