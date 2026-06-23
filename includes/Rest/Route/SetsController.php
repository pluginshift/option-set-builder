<?php
/**
 * Option-set CRUD + bulk operations controller.
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
 * Routes for listing, reading, upserting, deleting and bulk-managing option
 * sets (`optset_option_set` posts).
 */
final class SetsController {

	/**
	 * Service container.
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
	 * @param RestServer $s Server (shared helpers).
	 * @return array
	 */
	public function routes( RestServer $s ) {
		return array(
			array(
				'path'       => 'sets',
				'methods'    => 'GET',
				'permission' => array( $s, 'can_read' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->list_sets( $r, $s );
				},
				'args'       => array(
					'search'   => array( 'sanitize_callback' => 'sanitize_text_field' ),
					'page'     => array(
						'sanitize_callback' => 'absint',
						'default'           => 1,
					),
					'per_page' => array(
						'sanitize_callback' => 'absint',
						'default'           => 10,
					),
					'order'    => array( 'sanitize_callback' => 'sanitize_text_field' ),
				),
			),
			array(
				'path'       => 'set/(?P<id>[\\w-]+)',
				'methods'    => 'GET',
				'permission' => array( $s, 'can_read' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->get_set( $r, $s );
				},
				'args'       => array(
					'id' => array( 'sanitize_callback' => 'sanitize_text_field' ),
				),
			),
			array(
				'path'       => 'set',
				'methods'    => 'POST',
				'permission' => array( $s, 'can_manage' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->save_set( $r, $s );
				},
			),
			array(
				'path'       => 'set/(?P<id>\\d+)',
				'methods'    => 'DELETE',
				'permission' => array( $s, 'can_manage' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->delete_set( $r, $s );
				},
				'args'       => array(
					'id' => array( 'sanitize_callback' => 'absint' ),
				),
			),
			array(
				'path'       => 'sets/bulk',
				'methods'    => 'POST',
				'permission' => array( $s, 'can_manage' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->bulk( $r, $s );
				},
			),
		);
	}

	/**
	 * Repository accessor (guarded).
	 *
	 * @return OptionSetRepository|null
	 */
	private function repo() {
		$repo = $this->c->get( 'sets' );
		return $repo instanceof OptionSetRepository ? $repo : null;
	}

	/**
	 * GET sets — paginated list.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function list_sets( WP_REST_Request $r, RestServer $s ) {
		$repo = $this->repo();
		if ( ! $repo ) {
			return $s->fail( 'unavailable', __( 'Option-set storage unavailable.', 'option-set-builder' ), 500 );
		}

		$args   = array(
			'search'   => sanitize_text_field( (string) $r->get_param( 'search' ) ),
			'page'     => max( 1, (int) $r->get_param( 'page' ) ),
			'per_page' => max( 1, (int) $r->get_param( 'per_page' ) ),
			'order'    => 'ASC' === strtoupper( (string) $r->get_param( 'order' ) ) ? 'ASC' : 'DESC',
		);
		$result = $repo->query( $args );

		return $s->ok(
			array(
				'total_pages' => isset( $result['total_pages'] ) ? (int) $result['total_pages'] : 0,
				'items'       => isset( $result['items'] ) ? $result['items'] : array(),
			)
		);
	}

	/**
	 * GET set/{id} — single set (or empty template for "new").
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function get_set( WP_REST_Request $r, RestServer $s ) {
		$id = sanitize_text_field( (string) $r->get_param( 'id' ) );

		if ( 'new' === $id || '' === $id ) {
			return $s->ok(
				array(
					'set' => array(
						'id'     => 'new',
						'title'  => __( 'Untitled', 'option-set-builder' ),
						'status' => 'draft',
						'fields' => array(),
						'css'    => '',
					),
				)
			);
		}

		$repo = $this->repo();
		if ( ! $repo ) {
			return $s->fail( 'unavailable', __( 'Option-set storage unavailable.', 'option-set-builder' ), 500 );
		}

		$set = $repo->get( (int) $id );
		if ( ! $set ) {
			return $s->fail( 'not_found', __( 'Option set not found.', 'option-set-builder' ), 404 );
		}

		return $s->ok(
			array(
				'set' => array(
					'id'     => (int) $set['id'],
					'title'  => (string) $set['title'],
					'status' => (string) $set['status'],
					'fields' => isset( $set['fields'] ) ? $set['fields'] : array(),
					'css'    => isset( $set['css'] ) ? (string) $set['css'] : '',
				),
			)
		);
	}

	/**
	 * POST set — upsert.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function save_set( WP_REST_Request $r, RestServer $s ) {
		if ( ! $s->verify_nonce( $r ) ) {
			return $s->fail( 'bad_nonce', __( 'Invalid or missing nonce.', 'option-set-builder' ), 403 );
		}
		$repo = $this->repo();
		if ( ! $repo ) {
			return $s->fail( 'unavailable', __( 'Option-set storage unavailable.', 'option-set-builder' ), 500 );
		}

		$id     = $r->get_param( 'id' );
		$id     = ( null === $id || '' === $id ) ? 'new' : sanitize_text_field( (string) $id );
		$fields = Str::json( $r->get_param( 'fields' ), array() );

		$data = array(
			'id'     => $id,
			'title'  => sanitize_text_field( (string) $r->get_param( 'title' ) ),
			'status' => 'publish' === $r->get_param( 'status' ) ? 'publish' : 'draft',
			'fields' => is_array( $fields ) ? $fields : array(),
			'css'    => wp_strip_all_tags( (string) $r->get_param( 'css' ) ),
		);

		$saved = $repo->save( $data );
		if ( is_wp_error( $saved ) ) {
			return $s->fail( 'save_failed', $saved->get_error_message(), 400 );
		}

		return $s->ok( array( 'id' => (int) $saved ) );
	}

	/**
	 * DELETE set/{id}.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function delete_set( WP_REST_Request $r, RestServer $s ) {
		if ( ! $s->verify_nonce( $r ) ) {
			return $s->fail( 'bad_nonce', __( 'Invalid or missing nonce.', 'option-set-builder' ), 403 );
		}
		$repo = $this->repo();
		if ( ! $repo ) {
			return $s->fail( 'unavailable', __( 'Option-set storage unavailable.', 'option-set-builder' ), 500 );
		}

		$id = (int) $r->get_param( 'id' );
		if ( $id <= 0 ) {
			return $s->fail( 'bad_id', __( 'Invalid option-set id.', 'option-set-builder' ), 400 );
		}

		$assignment = $this->c->get( 'assignment' );
		if ( $assignment instanceof AssignmentResolver ) {
			$assignment->detach( $id );
		}

		$ok = $repo->delete( $id );
		if ( ! $ok ) {
			return $s->fail( 'delete_failed', __( 'Could not delete option set.', 'option-set-builder' ), 400 );
		}

		/**
		 * Allow stats / cleanup listeners to react to a removed set.
		 *
		 * @param int $id Deleted set id.
		 */
		do_action( 'optset_set_deleted', $id );

		return $s->ok( array( 'id' => $id ) );
	}

	/**
	 * POST sets/bulk — status|delete|duplicate|import.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function bulk( WP_REST_Request $r, RestServer $s ) {
		if ( ! $s->verify_nonce( $r ) ) {
			return $s->fail( 'bad_nonce', __( 'Invalid or missing nonce.', 'option-set-builder' ), 403 );
		}
		$repo = $this->repo();
		if ( ! $repo ) {
			return $s->fail( 'unavailable', __( 'Option-set storage unavailable.', 'option-set-builder' ), 500 );
		}

		$op  = sanitize_key( (string) $r->get_param( 'op' ) );
		$ids = array_map( 'absint', (array) $r->get_param( 'ids' ) );
		$ids = array_values( array_filter( $ids ) );

		switch ( $op ) {
			case 'status':
				$status = 'publish' === $r->get_param( 'status' ) ? 'publish' : 'draft';
				$done   = array();
				foreach ( $ids as $id ) {
					$set = $repo->get( $id );
					if ( ! $set ) {
						continue;
					}
					$res = $repo->save(
						array(
							'id'     => $id,
							'title'  => $set['title'],
							'status' => $status,
							'fields' => $set['fields'],
							'css'    => isset( $set['css'] ) ? $set['css'] : '',
						)
					);
					if ( ! is_wp_error( $res ) ) {
						$done[] = (int) $res;
					}
				}
				return $s->ok(
					array(
						'op'  => 'status',
						'ids' => $done,
					)
				);

			case 'delete':
				$assignment = $this->c->get( 'assignment' );
				$done       = array();
				foreach ( $ids as $id ) {
					if ( $assignment instanceof AssignmentResolver ) {
						$assignment->detach( $id );
					}
					if ( $repo->delete( $id ) ) {
						do_action( 'optset_set_deleted', $id );
						$done[] = $id;
					}
				}
				return $s->ok(
					array(
						'op'  => 'delete',
						'ids' => $done,
					)
				);

			case 'duplicate':
				$done = array();
				foreach ( $ids as $id ) {
					$res = $repo->duplicate( $id );
					if ( ! is_wp_error( $res ) ) {
						$done[] = (int) $res;
					}
				}
				return $s->ok(
					array(
						'op'  => 'duplicate',
						'ids' => $done,
					)
				);

			case 'import':
				$payload = Str::json( $r->get_param( 'payload' ), array() );
				$payload = is_array( $payload ) ? $payload : array();
				$rows    = isset( $payload['items'] ) && is_array( $payload['items'] ) ? $payload['items'] : $payload;
				$done    = array();
				foreach ( (array) $rows as $row ) {
					if ( ! is_array( $row ) ) {
						continue;
					}
					$res = $repo->save(
						array(
							'id'     => 'new',
							'title'  => isset( $row['title'] ) ? sanitize_text_field( $row['title'] ) : __( 'Imported', 'option-set-builder' ),
							'status' => isset( $row['status'] ) && 'publish' === $row['status'] ? 'publish' : 'draft',
							'fields' => isset( $row['fields'] ) && is_array( $row['fields'] ) ? $row['fields'] : array(),
							'css'    => isset( $row['css'] ) ? wp_strip_all_tags( (string) $row['css'] ) : '',
						)
					);
					if ( ! is_wp_error( $res ) ) {
						$done[] = (int) $res;
					}
				}
				return $s->ok(
					array(
						'op'  => 'import',
						'ids' => $done,
					)
				);

			default:
				return $s->fail( 'bad_op', __( 'Unknown bulk operation.', 'option-set-builder' ), 400 );
		}
	}
}
