<?php
/**
 * Curcy / WooCommerce Currency Switcher (WPExperts) adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * Curcy (WooCommerce Currency Switcher by WPExperts). Conversion is exposed
 * through the add-on price filter; there is no inverse filter so reversion
 * is derived arithmetically from the probed rate.
 */
final class CurcyAdapter implements CurrencyAdapter {

	use ManualRevert;

	/**
	 * Convert to the active currency.
	 *
	 * @param float $price Base amount.
	 * @return float
	 */
	public function convert( float $price ): float {
		if ( ! $this->active() ) {
			return $price;
		}
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- third-party Curcy (WooCommerce Currency Switcher) integration hook.
		return (float) apply_filters( 'woocommerce_product_addons_option_price_raw', $price, '' );
	}

	/**
	 * Revert to base currency.
	 *
	 * @param float $price Active amount.
	 * @return float
	 */
	public function revert( float $price ): float {
		if ( ! $this->active() ) {
			return $price;
		}
		return $this->manual_revert( $price );
	}

	/**
	 * Whether Curcy is installed.
	 *
	 * @return bool
	 */
	public function active(): bool {
		return defined( 'WCCS_VERSION' );
	}

	/**
	 * Identifier.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'curcy';
	}
}
