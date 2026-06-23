<?php
/**
 * Full data purge on uninstall.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Removes every trace of the plugin: posts, options, meta, tables, cron.
 */
final class Uninstaller {

	/**
	 * Delete all plugin data.
	 *
	 * @return void
	 */
	public static function purge() {
		global $wpdb;

		$timestamp = wp_next_scheduled( 'optset_cleanup_uploads' );
		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, 'optset_cleanup_uploads' );
		}

		// Option sets.
		$ids = get_posts(
			array(
				'post_type'   => 'optset_option_set',
				'post_status' => 'any',
				'numberposts' => -1,
				'fields'      => 'ids',
			)
		);
		foreach ( $ids as $id ) {
			wp_delete_post( $id, true );
		}

		// Options.
		$options = array(
			'optset_settings',
			'optset_assign_all',
			'optset_global_style',
			'optset_global_style_css',
			'optset_global_style_thematic',
			'optset_global_style_thematic_css',
			'optset_custom_fonts',
			'optset_product_image_map',
			'optset_seeded',
			'optset_db_version',
		);
		foreach ( $options as $option ) {
			delete_option( $option );
		}

		// One-time uninstall cleanup of plugin-owned rows and tables. Direct
		// queries are intentional here: there is nothing to cache on teardown
		// and the schema drops have no Core API equivalent.
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange

		// Product / term meta.
		$wpdb->query( "DELETE FROM {$wpdb->postmeta} WHERE meta_key IN ('_optset_assigned_include','_optset_assigned_exclude')" );
		$wpdb->query( "DELETE FROM {$wpdb->termmeta} WHERE meta_key = '_optset_term_assigned'" );

		// Stats tables.
		$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}optset_stats" );
		$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}optset_stats_daily" );

		// Transients.
		$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\_transient\_optset\_%' OR option_name LIKE '\_transient\_timeout\_optset\_%'" );

		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
	}
}
