<?php
/**
 * Shared manual-revert helper for switchers without a native revert API.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyBridge;

defined( 'ABSPATH' ) || exit;

/**
 * Some switchers expose a convert filter/function but no inverse. For those
 * we derive the effective rate + flat fee from the bridge's best-effort
 * probe (convert(1)/convert(0)) and undo it arithmetically.
 */
trait ManualRevert {

	/**
	 * Reverse a converted amount using the probed rate/extra.
	 *
	 * @param float $price Amount in the active currency.
	 * @return float Amount in base currency.
	 */
	protected function manual_revert( float $price ): float {
		$data  = CurrencyBridge::data();
		$rate  = isset( $data['rate'] ) ? (float) $data['rate'] : 1.0;
		$extra = isset( $data['extra'] ) ? (float) $data['extra'] : 0.0;

		if ( 0.0 === $rate ) {
			return 0.0;
		}

		return ( $price - $extra ) / $rate;
	}
}
