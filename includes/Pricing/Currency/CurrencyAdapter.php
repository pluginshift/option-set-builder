<?php
/**
 * Currency switcher adapter contract.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency;

defined( 'ABSPATH' ) || exit;

/**
 * One implementation per supported third-party currency switcher.
 *
 * The plugin always stores option prices in the store base currency. An
 * adapter knows how to project a base-currency amount into the visitor's
 * active currency (convert) and how to bring an active-currency amount
 * back to base for percentage math (revert).
 */
interface CurrencyAdapter {

	/**
	 * Convert a base-currency amount into the active currency.
	 *
	 * @param float $price Amount in store base currency.
	 * @return float Amount in the visitor's active currency.
	 */
	public function convert( float $price ): float;

	/**
	 * Revert an active-currency amount back to the store base currency.
	 *
	 * @param float $price Amount in the visitor's active currency.
	 * @return float Amount in store base currency.
	 */
	public function revert( float $price ): float;

	/**
	 * Whether this switcher is installed and currently changing currency.
	 *
	 * @return bool
	 */
	public function active(): bool;

	/**
	 * Stable identifier for diagnostics / filters.
	 *
	 * @return string
	 */
	public function name(): string;
}
