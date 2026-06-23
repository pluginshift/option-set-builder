<?php
/**
 * WooCommerce Price Based on Country (WCPBC) adapter.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency\Adapter;

use OptionSetBuilder\Pricing\Currency\CurrencyAdapter;

defined( 'ABSPATH' ) || exit;

/**
 * WCPBC keys conversion off the visitor's pricing zone. The zone object
 * exposes get_exchange_rate_price() / get_base_currency_amount().
 */
final class PriceByCountryAdapter implements CurrencyAdapter {

	/**
	 * Visitor pricing zone.
	 *
	 * @var object|null
	 */
	private $zone;

	/**
	 * Resolve the active pricing zone.
	 */
	public function __construct() {
		if ( class_exists( 'WC_Product_Price_Based_Country' ) && function_exists( 'wcpbc_the_zone' ) ) {
			$this->zone = wcpbc_the_zone();
		}
	}

	/**
	 * Convert to the zone currency.
	 *
	 * @param float $price Base amount.
	 * @return float
	 */
	public function convert( float $price ): float {
		if ( $this->zone && method_exists( $this->zone, 'get_exchange_rate_price' ) ) {
			return (float) $this->zone->get_exchange_rate_price( $price );
		}
		return $price;
	}

	/**
	 * Revert to base currency.
	 *
	 * @param float $price Zone amount.
	 * @return float
	 */
	public function revert( float $price ): float {
		if ( $this->zone && method_exists( $this->zone, 'get_base_currency_amount' ) ) {
			return (float) $this->zone->get_base_currency_amount( $price );
		}
		return $price;
	}

	/**
	 * Whether a non-default pricing zone is active.
	 *
	 * @return bool
	 */
	public function active(): bool {
		return is_object( $this->zone );
	}

	/**
	 * Identifier.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'price-based-on-country';
	}
}
