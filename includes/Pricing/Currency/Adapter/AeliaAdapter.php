<?php
/**
 * Aelia Currency Switcher adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * Aelia uses a single conversion filter; passing (active, base) reverses the
 * direction so the same filter handles both convert and revert.
 */
final class AeliaAdapter implements CurrencyAdapter {

	/**
	 * Active currency code.
	 *
	 * @var string
	 */
	private $active_currency = '';

	/**
	 * Base currency code.
	 *
	 * @var string
	 */
	private $base_currency = '';

	/**
	 * Resolve active vs base currency codes.
	 */
	public function __construct() {
		if ( ! class_exists( 'WC_Aelia_CurrencySwitcher' ) ) {
			return;
		}
		$this->active_currency = function_exists( 'get_woocommerce_currency' ) ? (string) get_woocommerce_currency() : '';
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- third-party Aelia integration hook.
		$this->base_currency   = (string) apply_filters( 'wc_aelia_cs_base_currency', '' );
	}

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
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- third-party Aelia integration hook.
		return (float) apply_filters( 'wc_aelia_cs_convert', $price, $this->base_currency, $this->active_currency );
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
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- third-party Aelia integration hook.
		return (float) apply_filters( 'wc_aelia_cs_convert', $price, $this->active_currency, $this->base_currency );
	}

	/**
	 * Whether Aelia is installed.
	 *
	 * @return bool
	 */
	public function active(): bool {
		return class_exists( 'WC_Aelia_CurrencySwitcher' );
	}

	/**
	 * Identifier.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'aelia-currency-switcher';
	}
}
