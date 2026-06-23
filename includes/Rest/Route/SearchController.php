<?php
/**
 * Product / taxonomy search controller (assignment pickers).
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Rest\Route;

use OptionSetBuilder\Core\Container;
use OptionSetBuilder\Rest\RestServer;
use WC_Data_Store;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * Routes powering the admin assignment search boxes.
 */
final class SearchController {

	/**
	 * Container.
	 *
	 * @var Container
	 */
	private $c;

	/**
	 * Constructor.
	 *
	 * @param Container $c Container.
	 */
	public function __construct( Container $c ) {
		$this->c = $c;
	}

	/**
	 * Route descriptors.
	 *
	 * @param RestServer $s Server.
	 * @return array
	 */
	public function routes( RestServer $s ) {
		return array(
			array(
				'path'       => 'search/products',
				'methods'    => 'GET',
				'permission' => array( $s, 'can_read' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->search_products( $r, $s );
				},
				'args'       => array(
					'term'  => array( 'sanitize_callback' => 'sanitize_text_field' ),
					'limit' => array(
						'sanitize_callback' => 'absint',
						'default'           => 20,
					),
				),
			),
			array(
				'path'       => 'search/terms',
				'methods'    => 'GET',
				'permission' => array( $s, 'can_read' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->search_terms( $r, $s );
				},
				'args'       => array(
					'taxonomy' => array( 'sanitize_callback' => 'sanitize_text_field' ),
					'term'     => array( 'sanitize_callback' => 'sanitize_text_field' ),
					'limit'    => array(
						'sanitize_callback' => 'absint',
						'default'           => 20,
					),
				),
			),
		);
	}

	/**
	 * GET search/products.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function search_products( WP_REST_Request $r, RestServer $s ) {
		if ( ! class_exists( WC_Data_Store::class ) || ! function_exists( 'wc_get_product' ) ) {
			return $s->fail( 'no_wc', __( 'WooCommerce is not available.', 'option-set-builder' ), 500 );
		}

		$term     = sanitize_text_field( (string) $r->get_param( 'term' ) );
		$limit    = max( 1, (int) $r->get_param( 'limit' ) );
		$excludes = array_map( 'absint', (array) $r->get_param( 'excludes' ) );
		$excludes = array_values( array_filter( $excludes ) );

		try {
			$store = WC_Data_Store::load( 'product' );
			$ids   = $store->search_products( $term, '', false, false, $limit, array(), $excludes );
		} catch ( \Exception $e ) {
			return $s->fail( 'search_failed', $e->getMessage(), 500 );
		}

		$items = array();
		foreach ( (array) $ids as $product_id ) {
			$product = wc_get_product( $product_id );
			if ( ! $product ) {
				continue;
			}

			$row = array(
				'id'         => (int) $product_id,
				'url'        => get_permalink( $product_id ),
				'label'      => rawurldecode( wp_strip_all_tags( $product->get_name() ) ),
				'img'        => wp_get_attachment_url( $product->get_image_id() ),
				'isVariable' => $product->is_type( 'variable' ),
				'regular'    => $product->get_regular_price( 'edit' ),
				'sale'       => $product->get_sale_price( 'edit' ),
				'variation'  => array(),
			);

			if ( $product->is_type( 'variable' ) ) {
				foreach ( $product->get_available_variations() as $vd ) {
					$vid       = isset( $vd['variation_id'] ) ? (int) $vd['variation_id'] : 0;
					$variation = $vid ? wc_get_product( $vid ) : null;
					if ( $variation && $variation->is_purchasable() && $variation->is_in_stock() ) {
						$row['variation'][] = array(
							'id'         => $vid,
							'url'        => get_permalink( $vid ),
							'label'      => rawurldecode( wp_strip_all_tags( $variation->get_name() ) ),
							'img'        => wp_get_attachment_url( $variation->get_image_id() ),
							'attributes' => wc_get_product_variation_attributes( $vid ),
							'regular'    => $variation->get_regular_price( 'edit' ),
							'sale'       => $variation->get_sale_price( 'edit' ),
						);
					}
				}
			}

			$items[] = $row;
		}

		return $s->ok( array( 'items' => $items ) );
	}

	/**
	 * GET search/terms.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function search_terms( WP_REST_Request $r, RestServer $s ) {
		$kind = sanitize_key( (string) $r->get_param( 'taxonomy' ) );
		$map  = array(
			'category' => 'product_cat',
			'tag'      => 'product_tag',
			'brand'    => 'product_brand',
		);
		if ( ! isset( $map[ $kind ] ) ) {
			return $s->fail( 'bad_taxonomy', __( 'Unsupported taxonomy.', 'option-set-builder' ), 400 );
		}
		$taxonomy = $map[ $kind ];
		if ( ! taxonomy_exists( $taxonomy ) ) {
			return $s->ok( array( 'items' => array() ) );
		}

		$term  = sanitize_text_field( (string) $r->get_param( 'term' ) );
		$limit = max( 1, (int) $r->get_param( 'limit' ) );

		$terms = get_terms(
			array(
				'taxonomy'   => $taxonomy,
				'orderby'    => 'name',
				'order'      => 'ASC',
				'number'     => $limit,
				'hide_empty' => false,
				'name__like' => $term,
			)
		);

		$items = array();
		if ( ! is_wp_error( $terms ) ) {
			foreach ( (array) $terms as $t ) {
				$url     = get_term_link( $t );
				$items[] = array(
					'id'    => (int) $t->term_id,
					'label' => $t->name,
					'url'   => is_string( $url ) ? $url : '',
				);
			}
		}

		return $s->ok( array( 'items' => $items ) );
	}
}
