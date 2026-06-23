<?php
/**
 * WOOMULTI_CURRENCY (Woo Multi Currency by VillaTheme) adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * Woo Multi Currency exposes wmc_get_price()/wmc_revert_price() helper
 * functions which we delegate to directly.
 */
final class WooMultiCurrencyAdapter implements CurrencyAdapter {

	/**
	 * Convert to the active currency.
	 *
	 * @param float $price Base amount.
	 * @return float
	 */
	public function convert( float $price ): float {
		if ( ! function_exists( 'wmc_get_price' ) ) {
			return $price;
		}
		return (float) wmc_get_price( $price );
	}

	/**
	 * Revert to base currency.
	 *
	 * @param float $price Active amount.
	 * @return float
	 */
	public function revert( float $price ): float {
		if ( ! function_exists( 'wmc_revert_price' ) ) {
			return $price;
		}
		return (float) wmc_revert_price( $price );
	}

	/**
	 * Whether the switcher functions exist.
	 *
	 * @return bool
	 */
	public function active(): bool {
		return function_exists( 'wmc_get_price' ) && function_exists( 'wmc_revert_price' );
	}

	/**
	 * Identifier.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'woo-multi-currency';
	}
}
