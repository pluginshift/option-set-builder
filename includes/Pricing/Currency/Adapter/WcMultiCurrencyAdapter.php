<?php
/**
 * WC Multi Currency (palscode / APBDWMC) adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * APBDWMC exposes the active currency rate via its module instance;
 * conversion is price * rate, reversion price / rate.
 */
final class WcMultiCurrencyAdapter implements CurrencyAdapter {

	/**
	 * Conversion rate.
	 *
	 * @var float
	 */
	private $rate = 1.0;

	/**
	 * Whether a non-default currency rate was resolved.
	 *
	 * @var bool
	 */
	private $enabled = false;

	/**
	 * Resolve the active conversion rate.
	 */
	public function __construct() {
		if ( ! class_exists( '\\APBDWMC_general' ) || ! method_exists( '\\APBDWMC_general', 'GetModuleInstance' ) ) {
			return;
		}
		try {
			$module = \APBDWMC_general::GetModuleInstance();
		} catch ( \Throwable $e ) {
			return;
		}
		if ( $module && ! empty( $module->active_currency ) && ! empty( $module->active_currency->rate ) ) {
			$this->rate    = (float) $module->active_currency->rate;
			$this->enabled = true;
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
		return 'wc-multi-currency';
	}
}
