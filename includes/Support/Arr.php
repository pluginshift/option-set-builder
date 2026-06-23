<?php
/**
 * Array helpers.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Array access utilities.
 */
final class Arr {

	/**
	 * Read a key from an array with a default.
	 *
	 * @param array  $source  Source array.
	 * @param string $key     Key.
	 * @param mixed  $default Default.
	 * @return mixed
	 */
	public static function get( $source, $key, $default = '' ) {
		if ( ! is_array( $source ) ) {
			return $default;
		}
		return array_key_exists( $key, $source ) && null !== $source[ $key ] ? $source[ $key ] : $default;
	}

	/**
	 * Ensure the value is a list array.
	 *
	 * @param mixed $value Input.
	 * @return array
	 */
	public static function list( $value ) {
		if ( is_array( $value ) ) {
			return array_values( $value );
		}
		return array() === $value || '' === $value || null === $value ? array() : array( $value );
	}

	/**
	 * Recursively sanitize a value tree of unknown depth.
	 *
	 * Strings → sanitize_text_field (multiline preserved), scalars kept,
	 * arrays walked. Used for REST payloads that carry the field tree.
	 *
	 * @param mixed $value Input.
	 * @return mixed
	 */
	public static function deep_clean( $value ) {
		if ( is_array( $value ) ) {
			$out = array();
			foreach ( $value as $k => $v ) {
				$out[ sanitize_text_field( (string) $k ) ] = self::deep_clean( $v );
			}
			return $out;
		}
		if ( is_string( $value ) ) {
			return sanitize_textarea_field( wp_unslash( $value ) );
		}
		return $value;
	}
}
