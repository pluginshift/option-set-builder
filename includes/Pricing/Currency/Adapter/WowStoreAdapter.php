<?php
/**
 * WowStore (Product Blocks Pro) currency switcher adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * Bridges the WowStore / Product Blocks Pro currency switcher. The active
 * currency carries a rate plus an optional flat exchange fee; conversion is
 * price * (rate + fee) and reversion is price / rate.
 */
final class WowStoreAdapter implements CurrencyAdapter {

	/**
	 * Combined conversion rate (base rate + exchange fee).
	 *
	 * @var float
	 */
	private $rate = 1.0;

	/**
	 * Whether a non-default currency is selected.
	 *
	 * @var bool
	 */
	private $enabled = false;

	/**
	 * Resolve the active WowStore currency configuration.
	 */
	public function __construct() {
		if ( ! defined( 'WOPB_PRO_VER' ) || ! class_exists( 'WOPB_PRO\\Currency_Switcher_Action' ) || ! function_exists( 'wopb_function' ) ) {
			return;
		}

		$current_code = wopb_function()->get_setting( 'wopb_current_currency' );
		$default_code = wopb_function()->get_setting( 'wopb_default_currency' );
		$current      = \WOPB_PRO\Currency_Switcher_Action::get_currency( $current_code );

		if ( empty( $current ) || $current_code === $default_code ) {
			return;
		}

		$base_rate = ( isset( $current['wopb_currency_rate'] ) && '' !== $current['wopb_currency_rate'] && $current['wopb_currency_rate'] > 0 )
			? (float) $current['wopb_currency_rate'] : 1.0;
		$fee       = ( isset( $current['wopb_currency_exchange_fee'] ) && '' !== $current['wopb_currency_exchange_fee'] && $current['wopb_currency_exchange_fee'] >= 0 )
			? (float) $current['wopb_currency_exchange_fee'] : 0.0;

		$this->rate    = $base_rate + $fee;
		$this->enabled = true;
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
	 * Whether the switcher is changing currency.
	 *
	 * @return bool
	 */
	public function active(): bool {
		return $this->enabled;
	}

	/**
	 * Identifier.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'wowstore';
	}
}
