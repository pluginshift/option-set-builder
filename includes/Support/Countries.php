<?php
/**
 * Country / dial-code provider for the Phone field.
 *
 * Single source of truth shared with the JS bundles: the same
 * assets/data/countries.json file feeds both this provider and the builder /
 * storefront scripts, so the country list and dial codes never drift.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Reads the bundled country dataset and exposes lookups plus emoji-flag
 * rendering (derived from the ISO-2 code, no flag images required).
 */
final class Countries {

	/**
	 * Cached dataset keyed by lowercase ISO-2 code.
	 *
	 * @var array<string,array{iso2:string,name:string,dial:string}>|null
	 */
	private static $map = null;

	/**
	 * Load (and cache) the dataset keyed by ISO-2.
	 *
	 * @return array<string,array>
	 */
	public static function all() {
		if ( null !== self::$map ) {
			return self::$map;
		}

		self::$map = array();
		$file      = OPTSET_PATH . 'assets/data/countries.json';
		if ( is_readable( $file ) ) {
			$raw  = (string) file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			$list = json_decode( $raw, true );
			if ( is_array( $list ) ) {
				foreach ( $list as $row ) {
					if ( isset( $row['iso2'] ) ) {
						self::$map[ strtolower( $row['iso2'] ) ] = $row;
					}
				}
			}
		}

		return self::$map;
	}

	/**
	 * Look up a single country record.
	 *
	 * @param string $iso2 Two-letter code.
	 * @return array|null
	 */
	public static function get( $iso2 ) {
		$all = self::all();
		$key = strtolower( (string) $iso2 );
		return isset( $all[ $key ] ) ? $all[ $key ] : null;
	}

	/**
	 * Dial code (without "+") for a country, '' when unknown.
	 *
	 * @param string $iso2 Two-letter code.
	 * @return string
	 */
	public static function dial( $iso2 ) {
		$row = self::get( $iso2 );
		return $row ? (string) $row['dial'] : '';
	}

	/**
	 * Display name for a country, '' when unknown.
	 *
	 * @param string $iso2 Two-letter code.
	 * @return string
	 */
	public static function name( $iso2 ) {
		$row = self::get( $iso2 );
		return $row ? (string) $row['name'] : '';
	}

	/**
	 * Emoji flag for an ISO-2 code (e.g. "bd" → 🇧🇩), '' for invalid input.
	 *
	 * @param string $iso2 Two-letter code.
	 * @return string
	 */
	public static function flag( $iso2 ) {
		$code = strtoupper( trim( (string) $iso2 ) );
		if ( ! preg_match( '/^[A-Z]{2}$/', $code ) ) {
			return '';
		}
		$out = '';
		for ( $i = 0; $i < 2; $i++ ) {
			$cp   = 0x1F1E6 + ( ord( $code[ $i ] ) - 65 );
			$out .= self::codepoint_to_utf8( $cp );
		}
		return $out;
	}

	/**
	 * Resolve the initial country: the preferred code when valid, else the
	 * WooCommerce store base country, else the United States.
	 *
	 * @param string $preferred Preferred ISO-2 code (may be empty).
	 * @return string Lowercase ISO-2 code.
	 */
	public static function resolve_default( $preferred ) {
		$preferred = strtolower( trim( (string) $preferred ) );
		if ( '' !== $preferred && null !== self::get( $preferred ) ) {
			return $preferred;
		}

		if ( function_exists( 'wc_get_base_location' ) ) {
			$base = wc_get_base_location();
			if ( isset( $base['country'] ) && null !== self::get( $base['country'] ) ) {
				return strtolower( $base['country'] );
			}
		}

		return null !== self::get( 'us' ) ? 'us' : '';
	}

	/**
	 * Encode a Unicode code point as a UTF-8 string (regional indicators are
	 * outside the BMP, so this avoids relying on mb_* / intl extensions).
	 *
	 * @param int $cp Code point.
	 * @return string
	 */
	private static function codepoint_to_utf8( $cp ) {
		return chr( 0xF0 | ( $cp >> 18 ) )
			. chr( 0x80 | ( ( $cp >> 12 ) & 0x3F ) )
			. chr( 0x80 | ( ( $cp >> 6 ) & 0x3F ) )
			. chr( 0x80 | ( $cp & 0x3F ) );
	}
}
