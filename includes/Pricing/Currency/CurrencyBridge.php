<?php
/**
 * Currency switcher detection + conversion gateway.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Pricing\Currency;

defined( 'ABSPATH' ) || exit;

/**
 * Single entry point for currency conversion. Detects (once per request)
 * which of the supported switcher integrations is active and routes
 * convert()/revert() through it. When nothing is active every call is the
 * identity function, so the rest of the plugin never has to special-case
 * "no switcher installed".
 */
final class CurrencyBridge {

	/**
	 * Resolved adapter for the request. `false` means "not detected yet",
	 * `null` means "detected, none active".
	 *
	 * @var CurrencyAdapter|null|false
	 */
	private static $adapter = false;

	/**
	 * Default adapter class list (FQCN), highest priority first. Mirrors the
	 * detection order of the reference implementation.
	 *
	 * @return string[]
	 */
	private static function registry(): array {
		$base = __NAMESPACE__ . '\\Adapter\\';

		$list = array(
			$base . 'WowStoreAdapter',
			$base . 'CurcyAdapter',
			$base . 'WooMultiCurrencyAdapter',
			$base . 'YayCurrencyAdapter',
			$base . 'WoocsAdapter',
			$base . 'WpWhamAdapter',
			$base . 'YithCurrencyAdapter',
			$base . 'AeliaAdapter',
			$base . 'WooPaymentsAdapter',
			$base . 'XCurrencyAdapter',
			$base . 'PriceByCountryAdapter',
			$base . 'WpmlMultiCurrencyAdapter',
			$base . 'MudraAdapter',
			$base . 'WcMultiCurrencyAdapter',
		);

		/**
		 * Filter the ordered list of currency adapter classes.
		 *
		 * @param string[] $list FQCNs implementing CurrencyAdapter.
		 */
		return (array) apply_filters( 'optset_currency_adapters', $list );
	}

	/**
	 * Detect the active switcher adapter (cached for the request).
	 *
	 * @return CurrencyAdapter|null
	 */
	public static function detect(): ?CurrencyAdapter {
		if ( false !== self::$adapter ) {
			return self::$adapter;
		}

		self::$adapter = null;

		foreach ( self::registry() as $class ) {
			if ( ! is_string( $class ) || ! class_exists( $class ) ) {
				continue;
			}
			try {
				$candidate = new $class();
			} catch ( \Throwable $e ) {
				continue;
			}
			if ( ! $candidate instanceof CurrencyAdapter ) {
				continue;
			}
			if ( $candidate->active() ) {
				self::$adapter = $candidate;
				break;
			}
		}

		return self::$adapter;
	}

	/**
	 * Convert a base-currency amount into the active currency.
	 *
	 * @param float $price Amount in store base currency.
	 * @return float
	 */
	public static function convert( float $price ): float {
		$adapter = self::detect();
		$result  = $adapter ? (float) $adapter->convert( $price ) : $price;

		/**
		 * Filter the currency-converted amount.
		 *
		 * @param float                $result  Converted amount.
		 * @param float                $price   Original base amount.
		 * @param CurrencyAdapter|null $adapter Active adapter (or null).
		 */
		return (float) apply_filters( 'optset_currency_convert', $result, $price, $adapter );
	}

	/**
	 * Revert an active-currency amount back to the store base currency.
	 *
	 * @param float $price Amount in the visitor's active currency.
	 * @return float
	 */
	public static function revert( float $price ): float {
		$adapter = self::detect();
		$result  = $adapter ? (float) $adapter->revert( $price ) : $price;

		/**
		 * Filter the currency-reverted amount.
		 *
		 * @param float                $result  Reverted amount.
		 * @param float                $price   Original active amount.
		 * @param CurrencyAdapter|null $adapter Active adapter (or null).
		 */
		return (float) apply_filters( 'optset_currency_revert', $result, $price, $adapter );
	}

	/**
	 * Best-effort conversion metadata for JS localisation.
	 *
	 * `extra` is the additive component (fees applied to a 0 base) and
	 * `rate` is the multiplicative component derived from convert(1).
	 *
	 * @return array{active:bool,rate:float,extra:float}
	 */
	public static function data(): array {
		$adapter = self::detect();
		if ( ! $adapter ) {
			return array(
				'active' => false,
				'rate'   => 1.0,
				'extra'  => 0.0,
			);
		}

		$extra = (float) self::convert( 0.0 );
		$rate  = (float) self::convert( 1.0 ) - $extra;

		return array(
			'active' => true,
			'rate'   => $rate,
			'extra'  => $extra,
		);
	}

	/**
	 * Reset the cached adapter (test helper / switcher hot-swap).
	 *
	 * @return void
	 */
	public static function reset(): void {
		self::$adapter = false;
	}
}
