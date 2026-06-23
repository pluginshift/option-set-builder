<?php
/**
 * Checkout / order-creation integration.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Integration\WooCommerce;

use OptionSetBuilder\Core\Assets;
use OptionSetBuilder\Core\Container;
use OptionSetBuilder\Support\Upload;

defined( 'ABSPATH' ) || exit;

/**
 * Persists the computed option selection onto order line items (HPOS-safe CRUD
 * via $item->add_meta_data), copies set ids to the order, records order/revenue
 * stats and relocates uploaded files when the order completes.
 */
final class CheckoutHooks {

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
		add_action( 'woocommerce_checkout_create_order_line_item', array( $this, 'create_order_line_item' ), 10, 4 );
		add_action( 'woocommerce_checkout_order_processed', array( $this, 'order_processed' ), 10, 1 );
		add_action( 'woocommerce_store_api_checkout_order_processed', array( $this, 'order_processed' ), 10, 1 );
		add_action( 'woocommerce_order_status_completed', array( $this, 'order_completed' ), 10, 1 );
		add_action( 'woocommerce_view_order', array( $this, 'maybe_enqueue_display_assets' ), 10, 1 );
		add_action( 'woocommerce_thankyou', array( $this, 'maybe_enqueue_display_assets' ), 10, 1 );
	}

	/**
	 * Write option meta onto the order line item (HPOS-safe).
	 *
	 * @param \WC_Order_Item_Product $item          Line item.
	 * @param string                 $cart_item_key Cart item key.
	 * @param array                  $cart_item     Cart item.
	 * @param \WC_Order              $order         Order.
	 * @return void
	 */
	public function create_order_line_item( $item, $cart_item_key, $cart_item, $order ) {
		unset( $cart_item_key, $order );

		if ( empty( $cart_item['optset_field_data'] ) || ! is_array( $cart_item['optset_field_data'] ) ) {
			return;
		}

		$result  = $cart_item['optset_field_data'];
		$set_ids = isset( $cart_item['optset_published_set_ids'] )
			? array_values( array_map( 'intval', (array) $cart_item['optset_published_set_ids'] ) )
			: array();

		$item->add_meta_data( '_optset_set_ids', $set_ids, true );
		$item->add_meta_data( '_optset_field_data', $result, true );
		$item->add_meta_data( '_optset_breakdown', isset( $result['breakdown'] ) ? $result['breakdown'] : array(), true );

		foreach ( (array) ( $result['lines'] ?? array() ) as $line ) {
			if ( ! is_array( $line ) || ! isset( $line['name'] ) ) {
				continue;
			}
			$item->add_meta_data( (string) $line['name'], isset( $line['value'] ) ? $line['value'] : '' );
		}
	}

	/**
	 * Copy set ids to the order and record order/revenue stats.
	 *
	 * @param mixed $order Order id or object.
	 * @return void
	 */
	public function order_processed( $order ) {
		$order = is_object( $order ) && method_exists( $order, 'get_id' ) ? $order : wc_get_order( $order );
		if ( ! $order ) {
			return;
		}

		$all_set_ids = array();

		foreach ( $order->get_items() as $item ) {
			$set_ids = $item->get_meta( '_optset_set_ids' );
			if ( empty( $set_ids ) || ! is_array( $set_ids ) ) {
				continue;
			}
			$all_set_ids = array_merge( $all_set_ids, array_map( 'intval', $set_ids ) );

			$breakdown = $item->get_meta( '_optset_breakdown' );
			$breakdown = is_array( $breakdown ) ? $breakdown : array();

			foreach ( $set_ids as $set_id ) {
				$set_id = (int) $set_id;
				do_action( 'optset_stats_record', $set_id, 'orders', 1 );
				$amount = isset( $breakdown[ $set_id ] ) ? (float) $breakdown[ $set_id ] : 0.0;
				if ( $amount > 0 ) {
					do_action( 'optset_stats_record', $set_id, 'revenue', $amount );
				}
			}
		}

		$all_set_ids = array_values( array_unique( $all_set_ids ) );
		if ( array() !== $all_set_ids ) {
			$order->update_meta_data( '_optset_set_ids', $all_set_ids );
			$order->save();
		}
	}

	/**
	 * Relocate uploaded files to the completed bucket + rewrite link HTML.
	 *
	 * @param int $order_id Order id.
	 * @return void
	 */
	public function order_completed( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		foreach ( $order->get_items() as $item ) {
			$result = $item->get_meta( '_optset_field_data' );
			if ( empty( $result ) || ! is_array( $result ) || empty( $result['lines'] ) ) {
				continue;
			}

			$changed = false;

			foreach ( (array) $result['lines'] as $idx => $line ) {
				if ( ! is_array( $line ) || empty( $line['_meta']['files'] ) || ! is_array( $line['_meta']['files'] ) ) {
					continue;
				}

				$moved = Upload::relocate( $line['_meta']['files'], 'order_completed', true );
				if ( ! is_array( $moved ) || array() === $moved ) {
					continue;
				}

				$links = '<span class="optset-files">';
				foreach ( $moved as $file ) {
					$name = isset( $file['name'] ) ? (string) $file['name'] : '';
					$path = isset( $file['path'] ) ? (string) $file['path'] : '';
					if ( '' === $name || '' === $path ) {
						continue;
					}
					$links .= '<a href="' . esc_url( $path ) . '">' . esc_html( $name ) . '</a> ';
				}
				$links .= '</span>';

				$result['lines'][ $idx ]['value']          = $links;
				$result['lines'][ $idx ]['_meta']['files']  = $moved;

				$line_name = isset( $line['name'] ) ? (string) $line['name'] : '';
				if ( '' !== $line_name ) {
					$item->update_meta_data( $line_name, $links );
				}
				$changed = true;
			}

			if ( $changed ) {
				$item->update_meta_data( '_optset_field_data', $result );
				$item->save();
			}
		}
	}

	/**
	 * Enqueue display assets on thank-you / view-order when the order has options.
	 *
	 * @param int $order_id Order id.
	 * @return void
	 */
	public function maybe_enqueue_display_assets( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		$has_options = (bool) $order->get_meta( '_optset_set_ids' );
		if ( ! $has_options ) {
			foreach ( $order->get_items() as $item ) {
				if ( $item->get_meta( '_optset_set_ids' ) ) {
					$has_options = true;
					break;
				}
			}
		}

		if ( $has_options ) {
			Assets::style( 'optset-store-style', 'store' );
		}
	}
}
