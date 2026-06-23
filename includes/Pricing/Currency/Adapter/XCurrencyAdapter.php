<?php
/**
 * X-Currency (DoatKolom) adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * X-Currency exposes symmetric exchange / revert helper functions.
 */
final class XCurrencyAdapter implements CurrencyAdapter {

	/**
	 * Convert to the active currency.
	 *
	 * @param float $price Base amount.
	 * @return float
	 */
	public function convert( float $price ): float {
		if ( ! function_exists( 'x_currency_exchange' ) ) {
			return $price;
		}
		return (float) x_currency_exchange( $price );
	}

	/**
	 * Revert to base currency.
	 *
	 * @param float $price Active amount.
	 * @return float
	 */
	public function revert( float $price ): float {
		if ( ! function_exists( 'x_currency_exchange_revert' ) ) {
			return $price;
		}
		return (float) x_currency_exchange_revert( $price );
	}

	/**
	 * Whether X-Currency is installed.
	 *
	 * @return bool
	 */
	public function active(): bool {
		return class_exists( 'XCurrency' ) && function_exists( 'x_currency_exchange' );
	}

	/**
	 * Identifier.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'x-currency';
	}
}
