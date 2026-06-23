<?php
/**
 * Admin order-item meta display polish.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Integration\WooCommerce;

use OptionSetBuilder\Core\Container;

defined( 'ABSPATH' ) || exit;

/**
 * Cleans up how the internal `_optset_*` line-item meta is presented on the admin
 * order screen: hides the machine-readable blobs and leaves the human option
 * lines visible.
 */
final class OrderHooks {

	/**
	 * Internal meta keys never shown to humans.
	 *
	 * @var string[]
	 */
	private const HIDDEN_KEYS = array( '_optset_set_ids', '_optset_field_data', '_optset_breakdown' );

	/**
	 * Service container.
	 *
	 * @var Container
	 */
	private $container;

	/**
	 * Constructor.
	 *
	 * @param Container $container Service container.
	 */
	public function __construct( Container $container ) {
		$this->container = $container;
	}

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function register() {
		add_filter( 'woocommerce_hidden_order_itemmeta', array( $this, 'hidden_order_itemmeta' ), 10, 1 );
		add_filter( 'woocommerce_order_item_display_meta_key', array( $this, 'display_meta_key' ), 10, 3 );
		add_filter( 'woocommerce_order_item_display_meta_value', array( $this, 'display_meta_value' ), 10, 3 );
	}

	/**
	 * Hide the internal meta blobs from the admin item-meta list.
	 *
	 * @param array $keys Hidden meta keys.
	 * @return array
	 */
	public function hidden_order_itemmeta( $keys ) {
		$keys = is_array( $keys ) ? $keys : array();
		return array_values( array_unique( array_merge( $keys, self::HIDDEN_KEYS ) ) );
	}

	/**
	 * Prettify / suppress internal keys when WC renders them anyway.
	 *
	 * @param string $display_key Display key.
	 * @param object $meta        Meta object.
	 * @param object $item        Order item.
	 * @return string
	 */
	public function display_meta_key( $display_key, $meta, $item ) {
		unset( $item );
		$key = is_object( $meta ) && isset( $meta->key ) ? (string) $meta->key : (string) $display_key;
		if ( in_array( $key, self::HIDDEN_KEYS, true ) || 0 === strpos( $key, '_optset_' ) ) {
			return '';
		}
		return $display_key;
	}

	/**
	 * Suppress the value for internal keys.
	 *
	 * @param string $display_value Display value.
	 * @param object $meta          Meta object.
	 * @param object $item          Order item.
	 * @return string
	 */
	public function display_meta_value( $display_value, $meta, $item ) {
		unset( $item );
		$key = is_object( $meta ) && isset( $meta->key ) ? (string) $meta->key : '';
		if ( in_array( $key, self::HIDDEN_KEYS, true ) || 0 === strpos( $key, '_optset_' ) ) {
			return '';
		}
		return $display_value;
	}
}
