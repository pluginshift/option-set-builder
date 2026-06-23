<?php
/**
 * YayCurrency switcher adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * YayCurrency provides symmetric convert/revert filters.
 */
final class YayCurrencyAdapter implements CurrencyAdapter {

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
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- third-party Yay Currency integration hook.
		return (float) apply_filters( 'yay_currency_convert_price', $price, '' );
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
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- third-party Yay Currency integration hook.
		return (float) apply_filters( 'yay_currency_revert_price', $price, '' );
	}

	/**
	 * Whether YayCurrency is installed.
	 *
	 * @return bool
	 */
	public function active(): bool {
		return defined( 'YAY_CURRENCY_VERSION' );
	}

	/**
	 * Identifier.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'yay-currency';
	}
}
