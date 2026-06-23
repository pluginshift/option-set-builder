<?php
/**
 * Resolves which option sets apply to a product.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Data;

use OptionSetBuilder\Support\Str;

defined( 'ABSPATH' ) || exit;

/**
 * THE single source of truth for product → option-set resolution.
 *
 * Final set list = ( global ∪ per-term ∪ per-product-include )
 *                  − per-product-exclude, filtered to published, cached
 * per product for the request.
 */
final class AssignmentResolver {

	const OPT_ALL          = 'optset_assign_all';
	const META_PROD_INC    = '_optset_assigned_include';
	const META_PROD_EXC    = '_optset_assigned_exclude';
	const META_TERM        = '_optset_term_assigned';
	const TAXONOMIES       = array( 'product_cat', 'product_tag', 'product_brand' );

	/**
	 * Set repository.
	 *
	 * @var OptionSetRepository
	 */
	private $sets;

	/**
	 * Per-product resolution cache.
	 *
	 * @var array<int,int[]>
	 */
	private $cache = array();

	/**
	 * Constructor.
	 *
	 * @param OptionSetRepository $sets Repository.
	 */
	public function __construct( OptionSetRepository $sets ) {
		$this->sets = $sets;
	}

	/**
	 * Resolve published set ids for a product.
	 *
	 * @param int $product_id Product id.
	 * @return int[] Sorted set ids.
	 */
	public function for_product( $product_id ) {
		$product_id = (int) $product_id;
		if ( isset( $this->cache[ $product_id ] ) ) {
			return $this->cache[ $product_id ];
		}

		$global  = $this->decode_ids( get_option( self::OPT_ALL, '[]' ) );
		$include = $this->decode_ids( get_post_meta( $product_id, self::META_PROD_INC, true ) );
		$exclude = $this->decode_ids( get_post_meta( $product_id, self::META_PROD_EXC, true ) );

		$terms = array();
		foreach ( self::TAXONOMIES as $tax ) {
			if ( ! taxonomy_exists( $tax ) ) {
				continue;
			}
			$term_ids = wp_get_post_terms( $product_id, $tax, array( 'fields' => 'ids' ) );
			foreach ( (array) $term_ids as $term_id ) {
				$terms = array_merge( $terms, $this->decode_ids( get_term_meta( $term_id, self::META_TERM, true ) ) );
			}
		}

		$merged = array_unique( array_merge( $global, $terms, $include ) );
		$ids    = array_values( array_diff( $merged, $exclude ) );
		$ids    = array_map( 'intval', $ids );

		// Keep only published sets.
		$ids = array_values(
			array_filter(
				$ids,
				static fn( $id ) => 'publish' === get_post_status( $id )
			)
		);
		sort( $ids );

		/**
		 * Filter the resolved set ids for a product.
		 *
		 * @param int[] $ids        Resolved ids.
		 * @param int   $product_id Product id.
		 */
		$ids = (array) apply_filters( 'optset_resolved_set_ids', $ids, $product_id );

		$this->cache[ $product_id ] = $ids;
		return $ids;
	}

	/**
	 * Does a product have any option set?
	 *
	 * @param int $product_id Product id.
	 * @return bool
	 */
	public function has_any( $product_id ) {
		return array() !== $this->for_product( $product_id );
	}

	/**
	 * Persist an assignment record for a set.
	 *
	 * @param int   $set_id Set id.
	 * @param array $raw    { scope, include[], exclude[] }
	 * @return void
	 */
	public function persist( $set_id, array $raw ) {
		$set_id  = (int) $set_id;
		$scope   = isset( $raw['scope'] ) ? sanitize_key( $raw['scope'] ) : 'none';
		$include = array_map( 'intval', (array) ( $raw['include'] ?? array() ) );
		$exclude = array_map( 'intval', (array) ( $raw['exclude'] ?? array() ) );

		$this->detach( $set_id );

		if ( 'all' === $scope ) {
			$all = $this->decode_ids( get_option( self::OPT_ALL, '[]' ) );
			$all[] = $set_id;
			update_option( self::OPT_ALL, wp_json_encode( array_values( array_unique( $all ) ) ) );
		} elseif ( 'products' === $scope ) {
			foreach ( $include as $pid ) {
				$this->push_meta( 'post', $pid, self::META_PROD_INC, $set_id );
			}
			foreach ( $exclude as $pid ) {
				$this->push_meta( 'post', $pid, self::META_PROD_EXC, $set_id );
			}
		} elseif ( in_array( $scope, array( 'category', 'tag', 'brand' ), true ) ) {
			foreach ( $include as $tid ) {
				$this->push_meta( 'term', $tid, self::META_TERM, $set_id );
			}
		}

		update_post_meta(
			$set_id,
			OptionSetRepository::META_ASSIGNMENT,
			wp_json_encode(
				array(
					'scope'   => $scope,
					'include' => $include,
					// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- JSON storage key, not a query argument.
					'exclude' => $exclude,
				)
			)
		);
		$this->cache = array();
	}

	/**
	 * Remove a set id from every assignment store (used before re-persist
	 * and on set deletion).
	 *
	 * @param int $set_id Set id.
	 * @return void
	 */
	public function detach( $set_id ) {
		global $wpdb;
		$set_id = (int) $set_id;

		$all = array_values( array_diff( $this->decode_ids( get_option( self::OPT_ALL, '[]' ) ), array( $set_id ) ) );
		update_option( self::OPT_ALL, wp_json_encode( $all ) );

		foreach ( array( self::META_PROD_INC, self::META_PROD_EXC ) as $meta ) {
			// Maintenance scan to strip a deleted set id from every assignment row.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- one-off cleanup keyed by indexed meta_key; nothing to cache.
			$rows = $wpdb->get_results(
				$wpdb->prepare( "SELECT post_id, meta_value FROM {$wpdb->postmeta} WHERE meta_key = %s", $meta )
			);
			foreach ( $rows as $row ) {
				$ids = array_values( array_diff( $this->decode_ids( $row->meta_value ), array( $set_id ) ) );
				update_post_meta( $row->post_id, $meta, wp_json_encode( $ids ) );
			}
		}

		// Maintenance scan to strip a deleted set id from every term assignment row.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- one-off cleanup keyed by indexed meta_key; nothing to cache.
		$rows = $wpdb->get_results(
			$wpdb->prepare( "SELECT term_id, meta_value FROM {$wpdb->termmeta} WHERE meta_key = %s", self::META_TERM )
		);
		foreach ( $rows as $row ) {
			$ids = array_values( array_diff( $this->decode_ids( $row->meta_value ), array( $set_id ) ) );
			update_term_meta( $row->term_id, self::META_TERM, wp_json_encode( $ids ) );
		}
		$this->cache = array();
	}

	/**
	 * Append an id to a json-array meta value.
	 *
	 * @param string $object_type 'post'|'term'.
	 * @param int    $object_id   Object id.
	 * @param string $meta_key    Meta key.
	 * @param int    $set_id      Set id.
	 * @return void
	 */
	private function push_meta( $object_type, $object_id, $meta_key, $set_id ) {
		$current = 'term' === $object_type
			? get_term_meta( $object_id, $meta_key, true )
			: get_post_meta( $object_id, $meta_key, true );
		$ids   = $this->decode_ids( $current );
		$ids[] = (int) $set_id;
		$ids   = array_values( array_unique( array_map( 'intval', $ids ) ) );
		if ( 'term' === $object_type ) {
			update_term_meta( $object_id, $meta_key, wp_json_encode( $ids ) );
		} else {
			update_post_meta( $object_id, $meta_key, wp_json_encode( $ids ) );
		}
	}

	/**
	 * Decode a stored id list.
	 *
	 * @param mixed $value Raw meta/option value.
	 * @return int[]
	 */
	private function decode_ids( $value ) {
		$decoded = Str::json( $value, array() );
		return is_array( $decoded ) ? array_map( 'intval', array_values( $decoded ) ) : array();
	}
}
