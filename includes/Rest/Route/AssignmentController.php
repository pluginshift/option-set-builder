<?php
/**
 * Assignment read/write + product-link resolution controller.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Rest\Route;

use OptionSetBuilder\Core\Container;
use OptionSetBuilder\Data\AssignmentResolver;
use OptionSetBuilder\Data\OptionSetRepository;
use OptionSetBuilder\Rest\RestServer;
use OptionSetBuilder\Support\Str;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * Routes for reading the stored assignment of a set, persisting a new
 * assignment, and resolving a representative product permalink.
 */
final class AssignmentController {

	const OPT_IMAGE_MAP = 'optset_product_image_map';

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
				'path'       => 'assignment/(?P<id>\\d+)',
				'methods'    => 'GET',
				'permission' => array( $s, 'can_read' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->get_assignment( $r, $s );
				},
				'args'       => array(
					'id' => array( 'sanitize_callback' => 'absint' ),
				),
			),
			array(
				'path'       => 'assignment',
				'methods'    => 'POST',
				'permission' => array( $s, 'can_manage' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->save_assignment( $r, $s );
				},
			),
			array(
				'path'       => 'product-link',
				'methods'    => 'GET',
				'permission' => array( $s, 'can_read' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->product_link( $r, $s );
				},
			),
		);
	}

	/**
	 * Repository accessor.
	 *
	 * @return OptionSetRepository|null
	 */
	private function repo() {
		$repo = $this->c->get( 'sets' );
		return $repo instanceof OptionSetRepository ? $repo : null;
	}

	/**
	 * Resolver accessor.
	 *
	 * @return AssignmentResolver|null
	 */
	private function resolver() {
		$res = $this->c->get( 'assignment' );
		return $res instanceof AssignmentResolver ? $res : null;
	}

	/**
	 * GET assignment/{id}.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function get_assignment( WP_REST_Request $r, RestServer $s ) {
		$repo = $this->repo();
		if ( ! $repo ) {
			return $s->fail( 'unavailable', __( 'Storage unavailable.', 'option-set-builder' ), 500 );
		}

		$id  = (int) $r->get_param( 'id' );
		$set = $repo->get( $id );
		if ( ! $set ) {
			return $s->fail( 'not_found', __( 'Option set not found.', 'option-set-builder' ), 404 );
		}

		$assignment = isset( $set['assignment'] ) && is_array( $set['assignment'] )
			? $set['assignment']
			: array(
				'scope'   => 'none',
				'include' => array(),
				// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- assignment data key, not a query argument.
				'exclude' => array(),
			);

		$scope     = isset( $assignment['scope'] ) ? (string) $assignment['scope'] : 'none';
		$image_map = get_option( self::OPT_IMAGE_MAP, array() );
		$image_map = is_array( $image_map ) ? $image_map : array();

		return $s->ok(
			array(
				'assignment' => $assignment,
				'include'    => $this->expand_objects( $scope, (array) ( $assignment['include'] ?? array() ) ),
				// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- response payload key, not a query argument.
				'exclude'    => $this->expand_objects( 'products', (array) ( $assignment['exclude'] ?? array() ) ),
				'imageMap'   => isset( $image_map[ $id ] ) ? $image_map[ $id ] : array(),
			)
		);
	}

	/**
	 * POST assignment.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function save_assignment( WP_REST_Request $r, RestServer $s ) {
		if ( ! $s->verify_nonce( $r ) ) {
			return $s->fail( 'bad_nonce', __( 'Invalid or missing nonce.', 'option-set-builder' ), 403 );
		}
		$resolver = $this->resolver();
		if ( ! $resolver ) {
			return $s->fail( 'unavailable', __( 'Assignment resolver unavailable.', 'option-set-builder' ), 500 );
		}

		$set_id = (int) $r->get_param( 'set_id' );
		if ( $set_id <= 0 ) {
			return $s->fail( 'bad_id', __( 'Missing set id.', 'option-set-builder' ), 400 );
		}

		$scope   = sanitize_key( (string) $r->get_param( 'scope' ) );
		$include = array_map( 'absint', (array) $r->get_param( 'include' ) );
		$exclude = array_map( 'absint', (array) $r->get_param( 'exclude' ) );

		$resolver->persist(
			$set_id,
			array(
				'scope'   => '' === $scope ? 'none' : $scope,
				'include' => array_values( array_filter( $include ) ),
				// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- persisted assignment key, not a query argument.
				'exclude' => array_values( array_filter( $exclude ) ),
			)
		);

		// Per-set product image overrides.
		$image = Str::json( $r->get_param( 'product_image' ), array() );
		if ( is_array( $image ) ) {
			$map            = get_option( self::OPT_IMAGE_MAP, array() );
			$map            = is_array( $map ) ? $map : array();
			$map[ $set_id ] = array_map( 'absint', array_values( $image ) );
			update_option( self::OPT_IMAGE_MAP, $map );
		}

		return $s->ok( array( 'set_id' => $set_id ) );
	}

	/**
	 * GET product-link — first matching product permalink + published flag.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function product_link( WP_REST_Request $r, RestServer $s ) {
		$set_id    = (int) $r->get_param( 'set_id' );
		$published = false;
		if ( $set_id > 0 ) {
			$published = 'publish' === get_post_status( $set_id );
		}

		$assignment = Str::json( $r->get_param( 'assignment' ), array() );
		$scope      = is_array( $assignment ) && isset( $assignment['scope'] ) ? sanitize_key( $assignment['scope'] ) : '';
		$include    = is_array( $assignment ) ? array_map( 'absint', (array) ( $assignment['include'] ?? array() ) ) : array();
		$exclude    = is_array( $assignment ) ? array_map( 'absint', (array) ( $assignment['exclude'] ?? array() ) ) : array();

		$link = '';
		if ( $published ) {
			$link = $this->first_product_link( $scope, $include, $exclude );
		}

		return $s->ok(
			array(
				'published'   => (bool) $published,
				'productLink' => $link,
			)
		);
	}

	/**
	 * Expand id lists into label objects for the admin UI.
	 *
	 * @param string $scope Assignment scope.
	 * @param array  $ids   Stored ids.
	 * @return array
	 */
	private function expand_objects( $scope, array $ids ) {
		$ids = array_values( array_filter( array_map( 'absint', $ids ) ) );
		$out = array();

		$tax_map = array(
			'category' => 'product_cat',
			'tag'      => 'product_tag',
			'brand'    => 'product_brand',
		);

		if ( isset( $tax_map[ $scope ] ) ) {
			foreach ( $ids as $term_id ) {
				$term = get_term( $term_id );
				if ( $term && ! is_wp_error( $term ) ) {
					$out[] = array(
						'id'    => (int) $term->term_id,
						'label' => $term->name,
						'url'   => is_string( get_term_link( $term ) ) ? get_term_link( $term ) : '',
					);
				}
			}
			return $out;
		}

		foreach ( $ids as $pid ) {
			if ( ! function_exists( 'wc_get_product' ) ) {
				break;
			}
			$product = wc_get_product( $pid );
			if ( $product ) {
				$out[] = array(
					'id'    => (int) $pid,
					'label' => rawurldecode( wp_strip_all_tags( $product->get_name() ) ),
					'url'   => get_permalink( $pid ),
					'img'   => wp_get_attachment_url( $product->get_image_id() ),
				);
			}
		}
		return $out;
	}

	/**
	 * Find a representative product permalink for an assignment scope.
	 *
	 * @param string $scope   Scope.
	 * @param int[]  $include Included ids.
	 * @param int[]  $exclude Excluded product ids.
	 * @return string
	 */
	private function first_product_link( $scope, array $include, array $exclude ) {
		if ( 'products' === $scope ) {
			foreach ( $include as $pid ) {
				if ( ! in_array( $pid, $exclude, true ) && 'publish' === get_post_status( $pid ) ) {
					return (string) get_permalink( $pid );
				}
			}
			return '';
		}

		$tax_map = array(
			'category' => 'product_cat',
			'tag'      => 'product_tag',
			'brand'    => 'product_brand',
		);

		// Single-product preview-URL lookup (posts_per_page = 1). The exclude set
		// is small (a set's manually excluded products), so this stays cheap.
		$query_args = array(
			'post_type'      => 'product',
			'post_status'    => 'publish',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_post__not_in -- bounded single-row preview lookup.
			'post__not_in'   => $exclude,
		);

		if ( 'all' === $scope ) {
			$ids = get_posts( $query_args );
			return $ids ? (string) get_permalink( (int) $ids[0] ) : '';
		}

		if ( isset( $tax_map[ $scope ] ) && ! empty( $include ) ) {
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- bounded single-row preview lookup (posts_per_page = 1).
			$query_args['tax_query'] = array(
				array(
					'taxonomy' => $tax_map[ $scope ],
					'field'    => 'term_id',
					'terms'    => $include,
				),
			);
			$ids                     = get_posts( $query_args );
			return $ids ? (string) get_permalink( (int) $ids[0] ) : '';
		}

		return '';
	}
}
