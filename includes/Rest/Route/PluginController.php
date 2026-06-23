<?php
/**
 * Companion-plugin installer controller.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Rest\Route;

use OptionSetBuilder\Core\Container;
use OptionSetBuilder\Rest\RestServer;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * Installs + activates a plugin from the WordPress.org repository on request
 * (used by the admin "recommended plugins" panel). Hard-gated to
 * `manage_options` plus the `optset_rest` nonce.
 */
final class PluginController {

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
				'path'       => 'plugin/install',
				'methods'    => 'POST',
				'permission' => static function () {
					return current_user_can( 'manage_options' );
				},
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->install( $r, $s );
				},
			),
		);
	}

	/**
	 * POST plugin/install.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function install( WP_REST_Request $r, RestServer $s ) {
		if ( ! $s->verify_nonce( $r ) ) {
			return $s->fail( 'bad_nonce', __( 'Invalid or missing nonce.', 'option-set-builder' ), 403 );
		}
		if ( ! current_user_can( 'install_plugins' ) ) {
			return $s->fail( 'forbidden', __( 'You are not allowed to install plugins.', 'option-set-builder' ), 403 );
		}

		$slug = sanitize_key( (string) $r->get_param( 'slug' ) );
		if ( '' === $slug ) {
			return $s->fail( 'bad_slug', __( 'Missing plugin slug.', 'option-set-builder' ), 400 );
		}

		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';

		// Already installed? Just (re)activate.
		$installed = $this->find_installed_plugin( $slug );
		if ( $installed ) {
			if ( ! is_plugin_active( $installed ) ) {
				$activated = activate_plugin( $installed );
				if ( is_wp_error( $activated ) ) {
					return $s->fail( 'activate_failed', $activated->get_error_message(), 500 );
				}
			}
			return $s->ok(
				array(
					'message' => __( 'Plugin activated.', 'option-set-builder' ),
					'slug'    => $slug,
				)
			);
		}

		if ( ! class_exists( 'Plugin_Upgrader' ) || ! class_exists( 'WP_Ajax_Upgrader_Skin' ) ) {
			return $s->fail( 'no_upgrader', __( 'Plugin installer unavailable.', 'option-set-builder' ), 500 );
		}

		$api = plugins_api(
			'plugin_information',
			array(
				'slug'   => $slug,
				'fields' => array(
					'sections' => false,
				),
			)
		);

		if ( is_wp_error( $api ) || empty( $api->download_link ) ) {
			return $s->fail( 'api_failed', __( 'Could not fetch plugin information.', 'option-set-builder' ), 500 );
		}

		$upgrader = new \Plugin_Upgrader( new \WP_Ajax_Upgrader_Skin() );
		$result   = $upgrader->install( $api->download_link );

		if ( is_wp_error( $result ) ) {
			return $s->fail( 'install_failed', $result->get_error_message(), 500 );
		}
		if ( true !== $result ) {
			return $s->fail( 'install_failed', __( 'Plugin installation failed.', 'option-set-builder' ), 500 );
		}

		$installed = $this->find_installed_plugin( $slug );
		if ( $installed ) {
			$activated = activate_plugin( $installed );
			if ( is_wp_error( $activated ) ) {
				return $s->fail( 'activate_failed', $activated->get_error_message(), 500 );
			}
		}

		return $s->ok(
			array(
				'message' => __( 'Plugin installed and activated.', 'option-set-builder' ),
				'slug'    => $slug,
			)
		);
	}

	/**
	 * Locate an installed plugin file for a given slug.
	 *
	 * @param string $slug Plugin slug (directory name).
	 * @return string Plugin basename or empty string.
	 */
	private function find_installed_plugin( $slug ) {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		foreach ( array_keys( get_plugins() ) as $file ) {
			if ( 0 === strpos( $file, $slug . '/' ) ) {
				return $file;
			}
		}
		return '';
	}
}
