<?php
/**
 * Option-set persistence (CPT wrapper).
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Data;

use OptionSetBuilder\Core\Plugin;
use OptionSetBuilder\Support\Str;

defined( 'ABSPATH' ) || exit;

/**
 * Single gateway to the `optset_option_set` post type. All field-tree /
 * assignment / css reads & writes go through here so storage shape is
 * defined in exactly one place.
 */
final class OptionSetRepository {

	const META_FIELDS     = '_optset_fields';
	const META_ASSIGNMENT = '_optset_assignment';
	const META_CSS        = '_optset_field_css';
	const META_REQUIRED   = '_optset_required';

	/**
	 * In-request cache of decoded sets keyed by id.
	 *
	 * @var array<int,array>
	 */
	private $cache = array();

	/**
	 * Fetch a single set as a normalized array.
	 *
	 * @param int $id Post id.
	 * @return array|null { id,title,status,fields,assignment,css }
	 */
	public function get( $id ) {
		$id = (int) $id;
		if ( isset( $this->cache[ $id ] ) ) {
			return $this->cache[ $id ];
		}
		$post = get_post( $id );
		if ( ! $post || Plugin::POST_TYPE !== $post->post_type ) {
			return null;
		}
		$set = array(
			'id'         => $id,
			'title'      => $post->post_title,
			'status'     => $post->post_status,
			'fields'     => Str::json( get_post_meta( $id, self::META_FIELDS, true ), array() ),
			'assignment' => Str::json(
				get_post_meta( $id, self::META_ASSIGNMENT, true ),
				array(
					'scope'   => 'none',
					'include' => array(),
					// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- decoded JSON storage key, not a query argument.
					'exclude' => array(),
				)
			),
			'css'        => (string) get_post_meta( $id, self::META_CSS, true ),
		);
		$this->cache[ $id ] = $set;
		return $set;
	}

	/**
	 * Just the field tree for a set.
	 *
	 * @param int $id Post id.
	 * @return array
	 */
	public function fields( $id ) {
		$set = $this->get( $id );
		return $set ? $set['fields'] : array();
	}

	/**
	 * Create or update a set.
	 *
	 * @param array $data { id, title, status, fields(array), css }
	 * @return int|\WP_Error New/updated post id.
	 */
	public function save( array $data ) {
		$title  = isset( $data['title'] ) ? sanitize_text_field( $data['title'] ) : __( 'Untitled', 'option-set-builder' );
		$status = ( isset( $data['status'] ) && 'publish' === $data['status'] ) ? 'publish' : 'draft';
		$fields = Sanitizer::fields( isset( $data['fields'] ) ? $data['fields'] : array() );

		$postarr = array(
			'post_type'   => Plugin::POST_TYPE,
			'post_title'  => $title,
			'post_status' => $status,
		);

		if ( ! empty( $data['id'] ) && 'new' !== $data['id'] ) {
			$postarr['ID'] = (int) $data['id'];
			$id            = wp_update_post( $postarr, true );
		} else {
			$id = wp_insert_post( $postarr, true );
		}

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		update_post_meta( $id, self::META_FIELDS, wp_slash( wp_json_encode( $fields ) ) );
		update_post_meta( $id, self::META_REQUIRED, wp_slash( wp_json_encode( Sanitizer::required_map( $fields ) ) ) );
		if ( isset( $data['css'] ) ) {
			update_post_meta( $id, self::META_CSS, wp_strip_all_tags( (string) $data['css'] ) );
		}

		unset( $this->cache[ (int) $id ] );
		do_action( 'optset_set_saved', (int) $id, $fields );
		return (int) $id;
	}

	/**
	 * Permanently delete a set.
	 *
	 * @param int $id Post id.
	 * @return bool
	 */
	public function delete( $id ) {
		$id = (int) $id;
		$ok = (bool) wp_delete_post( $id, true );
		if ( $ok ) {
			unset( $this->cache[ $id ] );
			do_action( 'optset_set_deleted', $id );
		}
		return $ok;
	}

	/**
	 * Duplicate a set (draft, "… Copy").
	 *
	 * @param int   $id     Source id.
	 * @param array $fields Optional overriding field tree.
	 * @return int|\WP_Error
	 */
	public function duplicate( $id, $fields = null ) {
		$src = $this->get( $id );
		if ( ! $src ) {
			return new \WP_Error( 'optset_not_found', __( 'Option set not found.', 'option-set-builder' ) );
		}
		return $this->save(
			array(
				'id'     => 'new',
				'title'  => $src['title'] . ' ' . __( 'Copy', 'option-set-builder' ),
				'status' => 'draft',
				'fields' => null === $fields ? $src['fields'] : $fields,
			)
		);
	}

	/**
	 * Paginated listing for the admin app.
	 *
	 * @param array $args { search, page, per_page, order }
	 * @return array { total_pages, items[] }
	 */
	public function query( array $args = array() ) {
		$q = new \WP_Query(
			array(
				'post_type'      => Plugin::POST_TYPE,
				'post_status'    => array( 'publish', 'draft' ),
				'orderby'        => 'ID',
				'order'          => ( isset( $args['order'] ) && 'ASC' === $args['order'] ) ? 'ASC' : 'DESC',
				's'              => isset( $args['search'] ) ? sanitize_text_field( $args['search'] ) : '',
				'paged'          => max( 1, (int) ( $args['page'] ?? 1 ) ),
				'posts_per_page' => max( 1, (int) ( $args['per_page'] ?? 10 ) ),
			)
		);

		$items = array();
		foreach ( $q->posts as $post ) {
			$fields = Str::json( get_post_meta( $post->ID, self::META_FIELDS, true ), array() );
			$items[] = array(
				'id'        => $post->ID,
				'title'     => $post->post_title,
				'published' => 'publish' === $post->post_status,
				'fields'    => $this->count_fields( $fields ),
				'updated'   => $post->post_modified_gmt,
			);
		}

		return array(
			'total_pages' => (int) $q->max_num_pages,
			'items'       => $items,
		);
	}

	/**
	 * Recursively count concrete fields in a tree.
	 *
	 * @param array $fields Tree.
	 * @return int
	 */
	public function count_fields( $fields ) {
		$n = 0;
		foreach ( (array) $fields as $node ) {
			if ( ! is_array( $node ) || empty( $node['id'] ) ) {
				continue;
			}
			++$n;
			if ( ! empty( $node['children'] ) ) {
				$n += $this->count_fields( $node['children'] );
			}
		}
		return $n;
	}

	/**
	 * Find a node anywhere in a tree by id.
	 *
	 * @param array  $fields Tree.
	 * @param string $field_id Target id.
	 * @return array|null
	 */
	public function find_node( $fields, $field_id ) {
		foreach ( (array) $fields as $node ) {
			if ( ! is_array( $node ) ) {
				continue;
			}
			if ( isset( $node['id'] ) && $node['id'] === $field_id ) {
				return $node;
			}
			if ( ! empty( $node['children'] ) ) {
				$found = $this->find_node( $node['children'], $field_id );
				if ( $found ) {
					return $found;
				}
			}
		}
		return null;
	}
}
