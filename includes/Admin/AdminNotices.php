<?php
/**
 * Minimal, dismissible admin notice.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Admin;

use OptionSetBuilder\Core\Capabilities;

defined( 'ABSPATH' ) || exit;

/**
 * Shows a single, dismissible getting-started prompt to admins on the plugin
 * screens. Dismissal is persisted for ~90 days via a transient. Everything
 * here is capability-gated and fully escaped.
 */
final class AdminNotices {

	/**
	 * Notice identifier (bump to re-show after copy changes).
	 *
	 * @var string
	 */
	const KEY = 'getting_started_v1';

	/**
	 * Dismissal lifetime (seconds).
	 *
	 * @var int
	 */
	const TTL = 90 * DAY_IN_SECONDS;

	/**
	 * Hook dismissal handling + rendering.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'admin_init', array( $this, 'maybe_dismiss' ) );
		add_action( 'admin_notices', array( $this, 'render' ) );
	}

	/**
	 * Transient key for a notice id.
	 *
	 * @param string $key Notice key.
	 * @return string
	 */
	private function transient_key( $key ) {
		return 'optset_notice_' . $key;
	}

	/**
	 * Handle a dismissal request (`?optset_dismiss=<key>` + nonce).
	 *
	 * @return void
	 */
	public function maybe_dismiss() {
		if ( ! Capabilities::can_read() ) {
			return;
		}

		$key = isset( $_GET['optset_dismiss'] ) ? sanitize_key( wp_unslash( $_GET['optset_dismiss'] ) ) : '';
		if ( '' === $key ) {
			return;
		}

		$nonce = isset( $_GET['_optset_nonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_optset_nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'optset_notice' ) ) {
			return;
		}

		set_transient( $this->transient_key( $key ), 'off', self::TTL );
	}

	/**
	 * Whether we are on a plugin admin screen.
	 *
	 * @return bool
	 */
	private function on_plugin_screen() {
		if ( AdminMenu::is_app_screen() ) {
			return true;
		}
		// Read-only screen detection (which admin page is showing); not form processing.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- reading current page slug only, value is sanitized.
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';
		return ( AdminMenu::SLUG === $page );
	}

	/**
	 * Render the notice (single, dismissible, escaped, gated).
	 *
	 * @return void
	 */
	public function render() {
		if ( ! Capabilities::can_read() ) {
			return;
		}

		if ( ! $this->on_plugin_screen() ) {
			return;
		}

		if ( 'off' === get_transient( $this->transient_key( self::KEY ) ) ) {
			return;
		}

		$dismiss_url = wp_nonce_url(
			add_query_arg( 'optset_dismiss', self::KEY ),
			'optset_notice',
			'_optset_nonce'
		);

		?>
		<div class="notice notice-info is-dismissible optset-notice">
			<p>
				<strong><?php esc_html_e( 'Option Set Builder', 'option-set-builder' ); ?></strong>
				&mdash;
				<?php esc_html_e( 'Thanks for installing! Build your first option set to start adding custom fields to products.', 'option-set-builder' ); ?>
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . AdminMenu::SLUG . '#/sets' ) ); ?>">
					<?php esc_html_e( 'Create an Option Set', 'option-set-builder' ); ?>
				</a>
			</p>
			<p>
				<a href="<?php echo esc_url( $dismiss_url ); ?>" class="button-link">
					<?php esc_html_e( 'Dismiss', 'option-set-builder' ); ?>
				</a>
			</p>
		</div>
		<?php
	}
}
