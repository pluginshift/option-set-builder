<?php
/**
 * REST server: registers the `optset/v1` namespace and delegates to controllers.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Rest;

use OptionSetBuilder\Core\Capabilities;
use OptionSetBuilder\Core\Container;
use OptionSetBuilder\Rest\Route\AnalyticsController;
use OptionSetBuilder\Rest\Route\AssignmentController;
use OptionSetBuilder\Rest\Route\FontsController;
use OptionSetBuilder\Rest\Route\PluginController;
use OptionSetBuilder\Rest\Route\SearchController;
use OptionSetBuilder\Rest\Route\SetsController;
use OptionSetBuilder\Rest\Route\SettingsController;
use OptionSetBuilder\Rest\Route\StyleController;
use OptionSetBuilder\Rest\Route\UploadController;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Central REST bootstrap.
 *
 * Controller contract: every controller in {@see \OptionSetBuilder\Rest\Route} is `final`,
 * is constructed with the {@see Container}, and exposes a single
 * `routes(): array` method. Each element of that array is a route descriptor:
 *
 *     array(
 *         'path'       => 'sets',                       // no leading slash
 *         'methods'    => 'GET' | 'POST' | 'DELETE' | 'PATCH' | WP constants,
 *         'callback'   => callable( WP_REST_Request ): WP_REST_Response|WP_Error,
 *         'permission' => callable( WP_REST_Request ): bool,
 *         'args'       => array(),                      // optional arg schema
 *     )
 *
 * RestServer collects descriptors from every controller and performs the
 * actual `register_rest_route()` calls so the wiring lives in exactly one
 * place.
 */
final class RestServer {

	const NAMESPACE_V1 = 'optset/v1';
	const NONCE_ACTION = 'optset_rest';

	/**
	 * Service container.
	 *
	 * @var Container
	 */
	private $container;

	/**
	 * Constructor.
	 *
	 * @param Container $c Service container.
	 */
	public function __construct( Container $c ) {
		$this->container = $c;
	}

	/**
	 * Hook into REST init.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Instantiate controllers and register every declared route.
	 *
	 * @return void
	 */
	public function register_routes() {
		$controllers = array(
			new SetsController( $this->container ),
			new AssignmentController( $this->container ),
			new SearchController( $this->container ),
			new StyleController( $this->container ),
			new SettingsController( $this->container ),
			new FontsController( $this->container ),
			new UploadController( $this->container ),
			new AnalyticsController( $this->container ),
			new PluginController( $this->container ),
		);

		foreach ( $controllers as $controller ) {
			if ( ! method_exists( $controller, 'routes' ) ) {
				continue;
			}
			$routes = (array) $controller->routes( $this );
			foreach ( $routes as $route ) {
				$this->add_route( $route );
			}
		}
	}

	/**
	 * Register one route descriptor.
	 *
	 * @param array $route Descriptor (see class docblock).
	 * @return void
	 */
	private function add_route( array $route ) {
		if ( empty( $route['path'] ) || empty( $route['callback'] ) ) {
			return;
		}

		$permission = isset( $route['permission'] ) && is_callable( $route['permission'] )
			? $route['permission']
			: array( $this, 'can_read' );

		register_rest_route(
			self::NAMESPACE_V1,
			'/' . ltrim( (string) $route['path'], '/' ),
			array(
				'methods'             => isset( $route['methods'] ) ? $route['methods'] : 'GET',
				'callback'            => $route['callback'],
				'permission_callback' => $permission,
				'args'                => isset( $route['args'] ) && is_array( $route['args'] ) ? $route['args'] : array(),
			)
		);
	}

	/**
	 * Container accessor for controllers that need additional services.
	 *
	 * @return Container
	 */
	public function container() {
		return $this->container;
	}

	/* --------------------------------------------------------------------- *
	 * Shared response helpers
	 * --------------------------------------------------------------------- */

	/**
	 * Success envelope: `{ ok: true, ...payload }` with HTTP 200.
	 *
	 * @param array $payload Extra payload merged into the envelope.
	 * @return WP_REST_Response
	 */
	public function ok( array $payload = array() ) {
		return new WP_REST_Response( array_merge( array( 'ok' => true ), $payload ), 200 );
	}

	/**
	 * Error envelope as a WP_Error (REST serializes it to `{code,message}`).
	 *
	 * @param string $code   Machine error code (will be `optset_`-prefixed).
	 * @param string $msg    Human readable message.
	 * @param int    $status HTTP status.
	 * @return WP_Error
	 */
	public function fail( $code, $msg, $status = 400 ) {
		$code = 0 === strpos( (string) $code, 'optset_' ) ? (string) $code : 'optset_' . (string) $code;
		return new WP_Error( $code, (string) $msg, array( 'status' => (int) $status ) );
	}

	/* --------------------------------------------------------------------- *
	 * Nonce + permission callbacks
	 * --------------------------------------------------------------------- */

	/**
	 * Verify the request nonce.
	 *
	 * The standard `X-WP-Nonce` header is already validated by WP cookie
	 * auth for logged-in users. For multipart/public requests we additionally
	 * accept a body field (`optset_nonce` or `wpnonce`) checked against the
	 * `optset_rest` action.
	 *
	 * @param WP_REST_Request $r Request.
	 * @return bool
	 */
	public function verify_nonce( WP_REST_Request $r ) {
		$header = $r->get_header( 'X-WP-Nonce' );
		if ( $header && wp_verify_nonce( sanitize_text_field( $header ), self::NONCE_ACTION ) ) {
			return true;
		}

		$candidates = array(
			$r->get_param( 'optset_nonce' ),
			$r->get_param( 'wpnonce' ),
		);

		// phpcs:disable WordPress.Security.NonceVerification.Missing
		if ( isset( $_POST['optset_nonce'] ) ) {
			$candidates[] = sanitize_text_field( wp_unslash( $_POST['optset_nonce'] ) );
		}
		if ( isset( $_POST['wpnonce'] ) ) {
			$candidates[] = sanitize_text_field( wp_unslash( $_POST['wpnonce'] ) );
		}
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		foreach ( $candidates as $candidate ) {
			if ( is_string( $candidate ) && '' !== $candidate
				&& wp_verify_nonce( sanitize_text_field( $candidate ), self::NONCE_ACTION ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Permission callback: read capability.
	 *
	 * @return bool
	 */
	public function can_read() {
		return Capabilities::can_read();
	}

	/**
	 * Permission callback: manage capability.
	 *
	 * @return bool
	 */
	public function can_manage() {
		return Capabilities::can_manage();
	}

	/**
	 * Permission callback for public endpoints. Authorization is granted at
	 * the gate, but the in-callback handler MUST still call
	 * {@see verify_nonce()} against the body nonce before mutating anything.
	 *
	 * @return bool
	 */
	public function public_nonce() {
		return true;
	}
}
