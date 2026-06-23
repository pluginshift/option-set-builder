<?php
/**
 * Mudra (Woo Exchange Rate, Codeixer) adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * Mudra exposes a flat conversion rate via WOOER\Currency_Manager;
 * conversion is price * rate, reversion price / rate.
 */
final class MudraAdapter implements CurrencyAdapter {

	/**
	 * Conversion rate.
	 *
	 * @var float
	 */
	private $rate = 1.0;

	/**
	 * Resolve the active conversion rate.
	 */
	public function __construct() {
		if ( class_exists( 'WOOER\\Currency_Manager' ) && method_exists( 'WOOER\\Currency_Manager', 'get_currency_rate' ) ) {
			$rate = \WOOER\Currency_Manager::get_currency_rate();
			if ( $rate ) {
				$this->rate = (float) $rate;
			}
		}
	}

	/**
	 * Convert to the active currency.
	 *
	 * @param float $price Base amount.
	 * @return float
	 */
	public function convert( float $price ): float {
		return $price * $this->rate;
	}

	/**
	 * Revert to base currency.
	 *
	 * @param float $price Active amount.
	 * @return float
	 */
	public function revert( float $price ): float {
		return $this->rate > 0 ? $price / $this->rate : $price;
	}

	/**
	 * Whether Mudra is installed.
	 *
	 * @return bool
	 */
	public function active(): bool {
		return class_exists( 'WOOER\\Currency_Manager' );
	}

	/**
	 * Identifier.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'mudra';
	}
}
