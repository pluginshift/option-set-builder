<?php
/**
 * Shop/archive loop behaviour for option-bearing products.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Integration\WooCommerce;

use OptionSetBuilder\Core\Settings;
use OptionSetBuilder\Data\AssignmentResolver;

defined( 'ABSPATH' ) || exit;

/**
 * When "force select" is enabled, products that carry option sets cannot be
 * AJAX-added from the shop loop: the add-to-cart button instead links to the
 * single-product page so the customer configures the options first.
 */
final class ShopLoop {

	/**
	 * Assignment resolver.
	 *
	 * @var AssignmentResolver
	 */
	private $assignment;

	/**
	 * Settings store.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Per-request product → has-options cache.
	 *
	 * @var array<int,bool>
	 */
	private $checked = array();

	/**
	 * Constructor.
	 *
	 * @param AssignmentResolver $assignment Assignment resolver.
	 * @param Settings           $settings   Settings store.
	 */
	public function __construct( AssignmentResolver $assignment, Settings $settings ) {
		$this->assignment = $assignment;
		$this->settings   = $settings;
	}

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function register() {
		add_filter( 'woocommerce_product_supports', array( $this, 'disable_ajax_add' ), 9999, 3 );
		add_filter( 'woocommerce_product_add_to_cart_text', array( $this, 'button_text' ), 9999, 2 );
		add_filter( 'woocommerce_product_add_to_cart_url', array( $this, 'button_url' ), 9999, 2 );
	}

	/**
	 * Disable the AJAX add-to-cart capability for option-bearing products.
	 *
	 * @param bool   $support Current support flag.
	 * @param string $feature Feature key.
	 * @param mixed  $product Product object.
	 * @return bool
	 */
	public function disable_ajax_add( $support, $feature, $product ) {
		if ( 'ajax_add_to_cart' === $feature && $this->should_force_select( $product ) ) {
			return false;
		}
		return $support;
	}

	/**
	 * Replace the add-to-cart button text.
	 *
	 * @param string $text    Button text.
	 * @param mixed  $product Product object.
	 * @return string
	 */
	public function button_text( $text, $product ) {
		if ( $this->should_force_select( $product ) ) {
			return (string) $this->settings->get( 'shopButtonText', __( 'Select Options', 'option-set-builder' ) );
		}
		return $text;
	}

	/**
	 * Point the add-to-cart button at the product page.
	 *
	 * @param string $url     Button URL.
	 * @param mixed  $product Product object.
	 * @return string
	 */
	public function button_url( $url, $product ) {
		if ( $this->should_force_select( $product ) && is_object( $product ) && method_exists( $product, 'get_permalink' ) ) {
			return $product->get_permalink();
		}
		return $url;
	}

	/**
	 * Whether this product should force the "select options" flow.
	 *
	 * @param mixed $product Product object.
	 * @return bool
	 */
	private function should_force_select( $product ) {
		if ( ! is_object( $product ) || ! method_exists( $product, 'get_id' ) ) {
			return false;
		}
		if ( ! (bool) $this->settings->get( 'shopForceSelect', true ) ) {
			return false;
		}
		if ( method_exists( $product, 'get_type' )
			&& in_array( $product->get_type(), array( 'grouped', 'external' ), true ) ) {
			return false;
		}

		$product_id = (int) $product->get_id();
		if ( isset( $this->checked[ $product_id ] ) ) {
			return $this->checked[ $product_id ];
		}

		$has = array() !== $this->assignment->for_product( $product_id );
		$this->checked[ $product_id ] = $has;
		return $has;
	}
}
