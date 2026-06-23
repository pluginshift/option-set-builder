<?php
/**
 * Capability resolution.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Central place for permission decisions.
 */
final class Capabilities {

	/**
	 * Capability required for read-only endpoints/screens.
	 *
	 * @return string
	 */
	public static function read() {
		return (string) apply_filters( 'optset_cap_read', 'manage_options' );
	}

	/**
	 * Capability required for mutating endpoints/screens.
	 *
	 * @return string
	 */
	public static function manage() {
		return (string) apply_filters( 'optset_cap_manage', 'manage_options' );
	}

	/**
	 * Whether the current request may read plugin data.
	 *
	 * @return bool
	 */
	public static function can_read() {
		return current_user_can( self::read() );
	}

	/**
	 * Whether the current request may modify plugin data.
	 *
	 * @return bool
	 */
	public static function can_manage() {
		return current_user_can( self::manage() );
	}
}
