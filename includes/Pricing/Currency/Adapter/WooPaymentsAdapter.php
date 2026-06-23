<?php
/**
 * WooPayments multi-currency adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * WooPayments' built-in multi-currency. Conversion goes through
 * MultiCurrency::get_price(); reversion divides by the selected currency's
 * rate (no-op when the default currency is selected).
 */
final class WooPaymentsAdapter implements CurrencyAdapter {

	/**
	 * Resolve the WooPayments MultiCurrency instance.
	 *
	 * @return object|null \WCPay\MultiCurrency\MultiCurrency or null.
	 */
	private function instance() {
		if ( ! class_exists( '\\WCPay\\MultiCurrency\\MultiCurrency' ) ) {
			return null;
		}
		if ( ! class_exists( 'WC_Payments' ) || ! method_exists( '\\WC_Payments', 'get_gateway' ) ) {
			return null;
		}
		if ( ! class_exists( '\\WCPay\\WC_Payments_Currency_Manager' ) ) {
			return null;
		}

		try {
			$gateway = \WC_Payments::get_gateway();
			$manager = new \WCPay\WC_Payments_Currency_Manager( $gateway );
			if ( ! method_exists( $manager, 'get_multi_currency_instance' ) ) {
				return null;
			}
			$mc = $manager->get_multi_currency_instance();
		} catch ( \Throwable $e ) {
			return null;
		}

		return ( $mc instanceof \WCPay\MultiCurrency\MultiCurrency ) ? $mc : null;
	}

	/**
	 * Convert to the active currency.
	 *
	 * @param float $price Base amount.
	 * @return float
	 */
	public function convert( float $price ): float {
		$mc = $this->instance();
		if ( $mc && method_exists( $mc, 'get_price' ) ) {
			return (float) $mc->get_price( $price, 'product' );
		}
		return $price;
	}

	/**
	 * Revert to base currency.
	 *
	 * @param float $price Active amount.
	 * @return float
	 */
	public function revert( float $price ): float {
		$mc = $this->instance();
		if ( ! $mc || ! method_exists( $mc, 'get_selected_currency' ) ) {
			return $price;
		}

		try {
			$currency = $mc->get_selected_currency();
			$rate     = (float) $currency->get_rate();
			if ( $currency->get_is_default() || $rate <= 0 ) {
				return $price;
			}
			return $price / $rate;
		} catch ( \Throwable $e ) {
			return $price;
		}
	}

	/**
	 * Whether WooPayments multi-currency is available.
	 *
	 * @return bool
	 */
	public function active(): bool {
		return null !== $this->instance();
	}

	/**
	 * Identifier.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'woopayments-multi-currency';
	}
}
