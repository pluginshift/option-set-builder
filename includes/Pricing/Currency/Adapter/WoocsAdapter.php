<?php
/**
 * WOOCS (FOX - Currency Switcher Professional) adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * WOOCS exposes both a convert and a back-convert filter.
 */
final class WoocsAdapter implements CurrencyAdapter {

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
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- third-party WOOCS integration hook.
		return (float) apply_filters( 'woocs_convert_price', $price, '' );
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
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- third-party WOOCS integration hook.
		return (float) apply_filters( 'woocs_back_convert_price', $price, '' );
	}

	/**
	 * Whether WOOCS is installed.
	 *
	 * @return bool
	 */
	public function active(): bool {
		return defined( 'WOOCS_VERSION' );
	}

	/**
	 * Identifier.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'woocs';
	}
}
