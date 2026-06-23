<?php
/**
 * Analytics read + public hit-recording controller.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Rest\Route;

use OptionSetBuilder\Core\Container;
use OptionSetBuilder\Rest\RestServer;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * Exposes aggregate stats to the admin app and a public metric-ping endpoint
 * used by the storefront.
 */
final class AnalyticsController {

	const METRICS = array( 'impressions', 'clicks', 'add_to_cart' );

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
				'path'       => 'analytics',
				'methods'    => 'GET',
				'permission' => array( $s, 'can_read' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->get_analytics( $r, $s );
				},
				'args'       => array(
					'search' => array( 'sanitize_callback' => 'sanitize_text_field' ),
				),
			),
			array(
				'path'       => 'analytics/hit',
				'methods'    => 'POST',
				'permission' => array( $s, 'public_nonce' ),
				'callback'   => function ( WP_REST_Request $r ) use ( $s ) {
					return $this->hit( $r, $s );
				},
			),
		);
	}

	/**
	 * GET analytics — table + daily series (guarded against missing service).
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response
	 */
	private function get_analytics( WP_REST_Request $r, RestServer $s ) {
		$search = sanitize_text_field( (string) $r->get_param( 'search' ) );
		$stats  = $this->c->get( 'stats' );

		$table = array();
		$daily = array();

		if ( is_object( $stats ) ) {
			if ( method_exists( $stats, 'table' ) ) {
				try {
					$table = (array) $stats->table();
				} catch ( \Throwable $e ) {
					$table = array();
				}
			}
			if ( method_exists( $stats, 'daily' ) ) {
				try {
					$daily = (array) $stats->daily( $search );
				} catch ( \Throwable $e ) {
					$daily = array();
				}
			}
		}

		return $s->ok(
			array(
				'table' => $table,
				'daily' => $daily,
			)
		);
	}

	/**
	 * POST analytics/hit — public metric ping.
	 *
	 * @param WP_REST_Request $r Request.
	 * @param RestServer      $s Server.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function hit( WP_REST_Request $r, RestServer $s ) {
		if ( ! $s->verify_nonce( $r ) ) {
			return $s->fail( 'bad_nonce', __( 'Invalid or missing nonce.', 'option-set-builder' ), 403 );
		}

		$set_id = (int) $r->get_param( 'setId' );
		$metric = sanitize_key( (string) $r->get_param( 'metric' ) );

		if ( $set_id <= 0 || ! in_array( $metric, self::METRICS, true ) ) {
			return $s->fail( 'bad_metric', __( 'Invalid analytics payload.', 'option-set-builder' ), 400 );
		}

		/**
		 * Record a stats metric.
		 *
		 * @param int    $set_id Option-set id.
		 * @param string $metric Metric key.
		 * @param int    $amount Amount (0 = increment by one).
		 */
		do_action( 'optset_stats_record', $set_id, $metric, 0 );

		return $s->ok(
			array(
				'setId'  => $set_id,
				'metric' => $metric,
			)
		);
	}
}
