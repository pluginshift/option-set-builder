<?php
/**
 * WPML / WooCommerce Multilingual multi-currency adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * WCML exposes its prices object through the global $woocommerce_wpml,
 * with convert_price_amount()/unconvert_price_amount() methods.
 */
final class WpmlMultiCurrencyAdapter implements CurrencyAdapter {

	/**
	 * WCML prices object.
	 *
	 * @var object|null
	 */
	private $prices;

	/**
	 * Resolve the WCML prices object when multi-currency is enabled.
	 */
	public function __construct() {
		if ( ! function_exists( 'wcml_is_multi_currency_on' ) || ! wcml_is_multi_currency_on() ) {
			return;
		}
		global $woocommerce_wpml;
		if ( isset( $woocommerce_wpml->multi_currency->prices ) && is_object( $woocommerce_wpml->multi_currency->prices ) ) {
			$this->prices = $woocommerce_wpml->multi_currency->prices;
		}
	}

	/**
	 * Convert to the active currency.
	 *
	 * @param float $price Base amount.
	 * @return float
	 */
	public function convert( float $price ): float {
		if ( $this->prices && method_exists( $this->prices, 'convert_price_amount' ) ) {
			return (float) $this->prices->convert_price_amount( $price );
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
		if ( $this->prices && method_exists( $this->prices, 'unconvert_price_amount' ) ) {
			return (float) $this->prices->unconvert_price_amount( $price );
		}
		return $price;
	}

	/**
	 * Whether WCML multi-currency is active.
	 *
	 * @return bool
	 */
	public function active(): bool {
		return is_object( $this->prices );
	}

	/**
	 * Identifier.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'wcml-multi-currency';
	}
}
