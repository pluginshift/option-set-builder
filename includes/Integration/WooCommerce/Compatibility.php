<?php
/**
 * WooCommerce environment compatibility shims.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Integration\WooCommerce;

use OptionSetBuilder\Data\AssignmentResolver;
use OptionSetBuilder\Pricing\Currency\CurrencyBridge;
use OptionSetBuilder\Support\Money;

defined( 'ABSPATH' ) || exit;

/**
 * Houses the small cross-cutting WooCommerce adjustments that are not specific
 * to one storefront/cart/checkout subsystem: keeping product duplication clean
 * and providing the canonical implementations of the generic price-base
 * filters consumed by PriceCalculator.
 *
 * HPOS / Cart-Checkout-Blocks feature compatibility is declared from the main
 * plugin file (before_woocommerce_init), so this class deliberately does NOT
 * re-declare it.
 */
final class Compatibility {

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function register() {
		// Strip per-product assignment meta off a duplicated product so the
		// clone does not silently inherit option-set assignments.
		add_filter( 'woocommerce_product_duplicate', array( $this, 'clean_duplicate' ), 9999, 2 );

		// Canonical resolvers for the pricing base filters (sale-or-regular,
		// currency-reverted). PriceCalculator applies these on the raw amount.
		add_filter( 'optset_price_base', array( $this, 'resolve_price_base' ), 10, 3 );
		add_filter( 'optset_price_percent_base', array( $this, 'resolve_price_base' ), 10, 3 );
	}

	/**
	 * Remove option-set assignment meta from a freshly duplicated product.
	 *
	 * @param \WC_Product $duplicate Newly created clone.
	 * @param \WC_Product $product   Source product.
	 * @return void
	 */
	public function clean_duplicate( $duplicate, $product ) {
		unset( $product );
		if ( ! is_object( $duplicate ) || ! method_exists( $duplicate, 'get_id' ) ) {
			return;
		}
		$id = (int) $duplicate->get_id();
		if ( $id <= 0 ) {
			return;
		}
		delete_post_meta( $id, AssignmentResolver::META_PROD_INC );
		delete_post_meta( $id, AssignmentResolver::META_PROD_EXC );
	}

	/**
	 * Resolve the base price for option pricing math.
	 *
	 * Uses the variation when present, falls back to the parent product,
	 * prefers the sale price over the regular price and reverts the value to
	 * the store base currency so percent math is currency-stable.
	 *
	 * @param float $base         Incoming base (already resolved by caller).
	 * @param int   $product_id   Product id.
	 * @param int   $variation_id Variation id (0 = none).
	 * @return float
	 */
	public function resolve_price_base( $base, $product_id, $variation_id = 0 ) {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return (float) $base;
		}

		$target_id = (int) $variation_id > 0 ? (int) $variation_id : (int) $product_id;
		$product   = wc_get_product( $target_id );
		if ( ! $product || ! is_object( $product ) ) {
			return (float) $base;
		}

		$sale    = method_exists( $product, 'get_sale_price' ) ? $product->get_sale_price() : '';
		$regular = method_exists( $product, 'get_regular_price' ) ? $product->get_regular_price() : '';

		$resolved = ( '' !== $sale && null !== $sale )
			? Money::f( $sale )
			: Money::f( $regular );

		// No regular/sale set (e.g. variable parent) — keep caller's value.
		if ( 0.0 === $resolved && '' === (string) $regular && '' === (string) $sale ) {
			$resolved = (float) $base;
		}

		if ( class_exists( CurrencyBridge::class ) ) {
			$resolved = CurrencyBridge::revert( (float) $resolved );
		}

		return (float) $resolved;
	}
}
