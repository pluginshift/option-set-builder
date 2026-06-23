<?php
/**
 * Plugin settings controller (`optset_settings`).
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Rest\Route;

use OptionSetBuilder\Core\Container;
use OptionSetBuilder\Core\Settings;
use OptionSetBuilder\Rest\RestServer;
use OptionSetBuilder\Support\Str;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * Read and persist the serialized settings option.
 */
final class SettingsController {

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
				'path'       => 'settings',
				'methods'    => 'GET',
				'permission' => array( $s, 'can_read' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->get_settings( $r, $s );
				},
			),
			array(
				'path'       => 'settings',
				'methods'    => 'POST',
				'permission' => array( $s, 'can_manage' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->save_settings( $r, $s );
				},
			),
		);
	}

	/**
	 * Settings service accessor.
	 *
	 * @return Settings|null
	 */
	private function settings() {
		$svc = $this->c->get( 'settings' );
		return $svc instanceof Settings ? $svc : null;
	}

	/**
	 * GET settings.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function get_settings( WP_REST_Request $r, RestServer $s ) {
		$svc = $this->settings();
		if ( ! $svc || ! method_exists( $svc, 'all' ) ) {
			return $s->fail( 'unavailable', __( 'Settings unavailable.', 'option-set-builder' ), 500 );
		}
		return $s->ok( array( 'settings' => $svc->all() ) );
	}

	/**
	 * POST settings.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function save_settings( WP_REST_Request $r, RestServer $s ) {
		if ( ! $s->verify_nonce( $r ) ) {
			return $s->fail( 'bad_nonce', __( 'Invalid or missing nonce.', 'option-set-builder' ), 403 );
		}
		$svc = $this->settings();
		if ( ! $svc || ! method_exists( $svc, 'save' ) ) {
			return $s->fail( 'unavailable', __( 'Settings unavailable.', 'option-set-builder' ), 500 );
		}

		$values = Str::json( $r->get_param( 'settings' ), array() );
		if ( ! is_array( $values ) ) {
			return $s->fail( 'bad_payload', __( 'Invalid settings payload.', 'option-set-builder' ), 400 );
		}

		/*
		 * Validate strictly against the known schema. The keys are a fixed,
		 * camelCase set (Settings::defaults()) read verbatim across the
		 * plugin, so we must NOT run sanitize_key() over them — that would
		 * lowercase priceLineLabel → pricelinelabel and silently fork the
		 * option into a dead duplicate the rest of the code never reads.
		 * Unknown keys are dropped; each value is cast by its default type.
		 */
		$defaults = Settings::defaults();
		$clean    = array();
		foreach ( $defaults as $key => $default ) {
			if ( ! array_key_exists( $key, $values ) ) {
				continue;
			}
			$value = $values[ $key ];
			if ( is_bool( $default ) ) {
				$clean[ $key ] = rest_sanitize_boolean( $value );
			} elseif ( is_int( $default ) ) {
				$clean[ $key ] = max( 0, (int) $value );
			} else {
				$clean[ $key ] = sanitize_text_field( (string) $value );
			}
		}

		$svc->save( $clean );

		return $s->ok( array( 'settings' => $svc->all() ) );
	}
}
