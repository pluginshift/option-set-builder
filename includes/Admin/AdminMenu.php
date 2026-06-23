<?php
/**
 * Admin menu + React app shell.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Admin;

use OptionSetBuilder\Core\Capabilities;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the single-page admin app. All "screens" are hash-routed
 * inside the same React mount (`#optset-admin-root`); the submenu entries
 * simply deep-link into that router. On the app screen we strip every
 * other admin notice so the SPA gets a clean shell.
 */
final class AdminMenu {

	/**
	 * Top-level menu slug.
	 *
	 * @var string
	 */
	const SLUG = 'optset-options';

	/**
	 * Hook the menu + chrome.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'in_admin_header', array( $this, 'strip_other_notices' ) );
		add_filter( 'plugin_action_links_' . OPTSET_BASENAME, array( $this, 'action_links' ) );
	}

	/**
	 * Register the top-level page and all submenus.
	 *
	 * @return void
	 */
	public function register_menu() {
		$cap = Capabilities::read();

		add_menu_page(
			esc_html__( 'Option Set', 'option-set-builder' ),
			esc_html__( 'Option Set', 'option-set-builder' ),
			$cap,
			self::SLUG,
			array( $this, 'render' ),
			'dashicons-forms',
			56
		);

		$submenus = array(
			array( self::SLUG, esc_html__( 'Dashboard', 'option-set-builder' ) ),
			array( self::SLUG . '#/sets', esc_html__( 'Option Sets', 'option-set-builder' ) ),
			array( self::SLUG . '#/analytics', esc_html__( 'Analytics', 'option-set-builder' ) ),
			array( self::SLUG . '#/settings', esc_html__( 'Settings', 'option-set-builder' ) ),
		);

		foreach ( $submenus as $submenu ) {
			add_submenu_page(
				self::SLUG,
				$submenu[1],
				$submenu[1],
				$cap,
				$submenu[0],
				array( $this, 'render' )
			);
		}
	}

	/**
	 * Render the React mount point inside a standard admin wrapper.
	 *
	 * @return void
	 */
	public function render() {
		echo '<div class="wrap optset-admin-wrap">';
		echo '<h1 class="screen-reader-text">' . esc_html__( 'Product Options', 'option-set-builder' ) . '</h1>';
		echo '<div id="optset-admin-root"></div>';
		echo '</div>';
	}

	/**
	 * Remove every other queued admin notice on the app screen.
	 *
	 * @return void
	 */
	public function strip_other_notices() {
		if ( ! self::is_app_screen() ) {
			return;
		}
		remove_all_actions( 'admin_notices' );
		remove_all_actions( 'all_admin_notices' );
	}

	/**
	 * Add an "Option Sets" deep-link to the plugin row action links.
	 *
	 * @param array $links Existing action links.
	 * @return array
	 */
	public function action_links( $links ) {
		$url   = admin_url( 'admin.php?page=' . self::SLUG . '#/sets' );
		$entry = '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Option Sets', 'option-set-builder' ) . '</a>';
		array_unshift( $links, $entry );
		return $links;
	}

	/**
	 * Whether the current admin screen is the plugin app screen.
	 *
	 * @return bool
	 */
	public static function is_app_screen() {
		if ( ! function_exists( 'get_current_screen' ) ) {
			return false;
		}
		$screen = get_current_screen();
		if ( ! $screen ) {
			return false;
		}
		// Top-level: toplevel_page_optset-options. Submenus share the same base.
		return ( false !== strpos( (string) $screen->id, self::SLUG ) );
	}
}
