<?php
/**
 * Settings store (option `optset_settings`).
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Typed accessor over the single serialized settings option.
 */
final class Settings {

	const OPTION = 'optset_settings';

	/**
	 * Default values for every known setting.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			'showPriceLine'       => true,
			'priceLineLabel'      => __( 'Options Price', 'option-set-builder' ),
			'showTotalLine'       => true,
			'totalLineLabel'      => __( 'Total Price', 'option-set-builder' ),
			'hideInCart'          => false,
			'hideInCheckout'      => false,
			'shopForceSelect'     => true,
			'shopButtonText'      => __( 'Select Options', 'option-set-builder' ),
			'uploadTempDays'      => 7,
			'uploadPlacedDays'    => 0,
			'uploadCompletedDays' => 0,
		);
	}

	/**
	 * Full settings array (stored merged over defaults).
	 *
	 * @return array
	 */
	public function all() {
		$stored   = get_option( self::OPTION, array() );
		$stored   = is_array( $stored ) ? $stored : array();
		$defaults = self::defaults();
		// Keep only known keys so any legacy/duplicate keys (e.g. an old
		// sanitize_key() lowercasing bug) never leak into the API or the UI.
		return array_merge( $defaults, array_intersect_key( $stored, $defaults ) );
	}

	/**
	 * Single setting value.
	 *
	 * @param string $key     Setting key.
	 * @param mixed  $default Fallback.
	 * @return mixed
	 */
	public function get( $key, $default = null ) {
		$all = $this->all();
		if ( array_key_exists( $key, $all ) ) {
			return $all[ $key ];
		}
		return null === $default ? '' : $default;
	}

	/**
	 * Replace the settings option.
	 *
	 * @param array $values New values.
	 * @return void
	 */
	public function save( array $values ) {
		$defaults = self::defaults();
		// Persist exactly the known schema — this also rewrites (heals) any
		// option already polluted with stale duplicate keys.
		$clean = array_intersect_key( $values, $defaults );
		update_option( self::OPTION, array_merge( $defaults, $clean ) );
	}
}
