<?php
/**
 * Currency Switcher for WooCommerce (WP Wham) adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * WP Wham Currency Switcher exposes alg_convert_price() but no inverse,
 * so reversion is derived from the probed rate.
 */
final class WpWhamAdapter implements CurrencyAdapter {

	use ManualRevert;

	/**
	 * Store default currency code.
	 *
	 * @var string
	 */
	private $default_code = '';

	/**
	 * Visitor's active currency code.
	 *
	 * @var string
	 */
	private $current_code = '';

	/**
	 * Whether the active currency differs from the default.
	 *
	 * @var bool
	 */
	private $enabled = false;

	/**
	 * Resolve current vs default currency.
	 */
	public function __construct() {
		if ( ! function_exists( 'alg_convert_price' ) || ! function_exists( 'alg_get_current_currency_code' ) ) {
			return;
		}
		$this->default_code = (string) get_option( 'woocommerce_currency' );
		$this->current_code = (string) alg_get_current_currency_code();
		$this->enabled      = ( '' !== $this->current_code && $this->current_code !== $this->default_code );
	}

	/**
	 * Convert to the active currency.
	 *
	 * @param float $price Base amount.
	 * @return float
	 */
	public function convert( float $price ): float {
		if ( ! $this->enabled ) {
			return $price;
		}
		return (float) alg_convert_price(
			array(
				'price'         => $price,
				'currency'      => $this->current_code,
				'currency_from' => $this->default_code,
				'format_price'  => 'no',
			)
		);
	}

	/**
	 * Revert to base currency.
	 *
	 * @param float $price Active amount.
	 * @return float
	 */
	public function revert( float $price ): float {
		if ( ! $this->enabled ) {
			return $price;
		}
		return $this->manual_revert( $price );
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
		return 'wpwham-currency-switcher';
	}
}
