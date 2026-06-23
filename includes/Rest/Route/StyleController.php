<?php
/**
 * Global style (tokens + generated CSS) controller.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Rest\Route;

use OptionSetBuilder\Core\Container;
use OptionSetBuilder\Rest\RestServer;
use OptionSetBuilder\Support\Str;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * Read/write the global and thematic style tokens + their compiled CSS.
 */
final class StyleController {

	const OPT_STYLE          = 'optset_global_style';
	const OPT_STYLE_CSS      = 'optset_global_style_css';
	const OPT_STYLE_THEMATIC = 'optset_global_style_thematic';
	const OPT_THEMATIC_CSS   = 'optset_global_style_thematic_css';

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
				'path'       => 'style',
				'methods'    => 'GET',
				'permission' => array( $s, 'can_read' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->get_style( $r, $s );
				},
			),
			array(
				'path'       => 'style',
				'methods'    => 'POST',
				'permission' => array( $s, 'can_manage' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->save_style( $r, $s );
				},
			),
		);
	}

	/**
	 * GET style.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response
	 */
	private function get_style( WP_REST_Request $r, RestServer $s ) {
		return $s->ok(
			array(
				'global'       => get_option( self::OPT_STYLE, array() ),
				'globalCss'    => (string) get_option( self::OPT_STYLE_CSS, '' ),
				'thematic'     => get_option( self::OPT_STYLE_THEMATIC, array() ),
				'thematicCss'  => (string) get_option( self::OPT_THEMATIC_CSS, '' ),
			)
		);
	}

	/**
	 * POST style.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function save_style( WP_REST_Request $r, RestServer $s ) {
		if ( ! $s->verify_nonce( $r ) ) {
			return $s->fail( 'bad_nonce', __( 'Invalid or missing nonce.', 'option-set-builder' ), 403 );
		}

		$style    = Str::json( $r->get_param( 'style' ), array() );
		$style    = is_array( $style ) ? $style : array();
		$css      = wp_strip_all_tags( (string) $r->get_param( 'css' ) );
		$thematic = rest_sanitize_boolean( $r->get_param( 'thematic' ) );

		if ( $thematic ) {
			update_option( self::OPT_STYLE_THEMATIC, $style );
			update_option( self::OPT_THEMATIC_CSS, $css );
		} else {
			update_option( self::OPT_STYLE, $style );
			update_option( self::OPT_STYLE_CSS, $css );
		}

		return $s->ok( array( 'thematic' => (bool) $thematic ) );
	}
}
