<?php
/**
 * String helpers.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Small, dependency-free string utilities used across the plugin.
 */
final class Str {

	/**
	 * Generate a short, collision-resistant id (base36).
	 *
	 * @param string $prefix Prefix for the id.
	 * @return string
	 */
	public static function uid( $prefix = 'f_' ) {
		return $prefix . substr( base_convert( (string) ( microtime( true ) * 10000 ), 10, 36 ), -7 ) . wp_rand( 100, 999 );
	}

	/**
	 * Decode a JSON string that may have been slash-escaped by WP.
	 *
	 * @param mixed $value Possibly-escaped JSON string.
	 * @param mixed $fallback Returned when decoding fails.
	 * @return mixed
	 */
	public static function json( $value, $fallback = array() ) {
		if ( is_array( $value ) || is_object( $value ) ) {
			return $value;
		}
		if ( ! is_string( $value ) || '' === $value ) {
			return $fallback;
		}
		$decoded = json_decode( $value, true );
		if ( null === $decoded ) {
			$decoded = json_decode( wp_unslash( $value ), true );
		}
		return null === $decoded ? $fallback : $decoded;
	}

	/**
	 * camelCase / snake_case to kebab-case.
	 *
	 * @param string $value Input.
	 * @return string
	 */
	public static function kebab( $value ) {
		$value = preg_replace( '/([a-z0-9])([A-Z])/', '$1-$2', (string) $value );
		return strtolower( str_replace( array( '_', ' ' ), '-', $value ) );
	}

	/**
	 * Strip slashes only from strings (recursive-safe single value).
	 *
	 * @param mixed $value Input.
	 * @return mixed
	 */
	public static function unslash( $value ) {
		return is_string( $value ) ? stripslashes( $value ) : $value;
	}
}
