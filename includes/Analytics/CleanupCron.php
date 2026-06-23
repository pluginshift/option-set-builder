<?php
/**
 * Scheduled upload-bucket cleanup.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Analytics;

use OptionSetBuilder\Core\Settings;
use OptionSetBuilder\Support\Upload;

defined( 'ABSPATH' ) || exit;

/**
 * Daily cron worker that prunes stale files from the private upload
 * buckets (temp / order_placed / order_completed). Retention per bucket
 * is configured via the plugin settings; a non-positive / empty value
 * disables pruning for that bucket entirely.
 */
final class CleanupCron {

	/**
	 * Map of upload bucket => settings key holding its retention in days.
	 *
	 * @var array<string,string>
	 */
	const BUCKETS = array(
		'temp'            => 'uploadTempDays',
		'order_placed'    => 'uploadPlacedDays',
		'order_completed' => 'uploadCompletedDays',
	);

	/**
	 * Settings accessor.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Constructor.
	 *
	 * @param Settings $settings Settings store.
	 */
	public function __construct( Settings $settings ) {
		$this->settings = $settings;
	}

	/**
	 * Hook the cron callback.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'optset_cleanup_uploads', array( $this, 'run' ) );
	}

	/**
	 * Cron callback — delete expired files in each configured bucket.
	 *
	 * @return void
	 */
	public function run() {
		$now = time();

		foreach ( self::BUCKETS as $bucket => $setting_key ) {
			$days = (int) $this->settings->get( $setting_key, 0 );
			if ( $days <= 0 ) {
				continue;
			}

			$max_age = $days * DAY_IN_SECONDS;
			$dir     = Upload::dir( $bucket );
			if ( ! is_dir( $dir ) ) {
				continue;
			}

			$files = glob( $dir . '*' );
			if ( empty( $files ) || ! is_array( $files ) ) {
				continue;
			}

			foreach ( $files as $file ) {
				if ( ! is_file( $file ) ) {
					continue;
				}
				$mtime = filemtime( $file );
				if ( false === $mtime ) {
					continue;
				}
				if ( ( $now - $mtime ) > $max_age ) {
					wp_delete_file( $file );
				}
			}
		}
	}
}
