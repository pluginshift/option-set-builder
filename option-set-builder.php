<?php
/**
 * Plugin Name:       Option Set Builder
 * Description:       Build dynamic single-product option sets — swatches, uploads, conditional logic, formula pricing and more — with deep WooCommerce cart & checkout integration.
 * Version:           1.0.0
 * Requires at least: 6.2
 * Requires PHP:      7.4
 * Author:            pluginshift
 * Author URI:        https://pluginshift.com
 * Text Domain:       option-set-builder
 * Domain Path:       /languages
 * Requires Plugins:  woocommerce
 * License:           GPLv3
 * License URI:       https://www.gnu.org/licenses/gpl-3.0.html
 *
 * @package OptionSetBuilder
 */

defined( 'ABSPATH' ) || exit;

define( 'OPTSET_VERSION', '1.0.0' );
define( 'OPTSET_FILE', __FILE__ );
define( 'OPTSET_PATH', plugin_dir_path( __FILE__ ) );
define( 'OPTSET_URL', plugin_dir_url( __FILE__ ) );
define( 'OPTSET_BASENAME', plugin_basename( __FILE__ ) );
define( 'OPTSET_ASSETS', OPTSET_URL . 'assets/build/' );
define( 'OPTSET_MIN_WC', '7.0' );
define( 'OPTSET_MIN_PHP', '7.4' );

/**
 * PSR-4 autoloader for the OptionSetBuilder\ namespace.
 *
 * Maps OptionSetBuilder\Sub\Space\ClassName to includes/Sub/Space/ClassName.php.
 * Deliberately uses StudlyCase filenames (PSR-4 canonical form), not a
 * hyphenated/`class-` convention, so the layout is self-describing.
 *
 * @param string $fqcn Fully-qualified class name.
 * @return void
 */
spl_autoload_register(
	static function ( $fqcn ) {
		$prefix = 'OptionSetBuilder\\';
		if ( 0 !== strpos( $fqcn, $prefix ) ) {
			return;
		}
		$relative = substr( $fqcn, strlen( $prefix ) );
		$path     = OPTSET_PATH . 'includes/' . str_replace( '\\', '/', $relative ) . '.php';
		if ( is_readable( $path ) ) {
			require_once $path;
		}
	}
);

// Composer autoload, when present, takes precedence for third-party libs.
if ( is_readable( OPTSET_PATH . 'vendor/autoload.php' ) ) {
	require_once OPTSET_PATH . 'vendor/autoload.php';
}

register_activation_hook( __FILE__, array( \OptionSetBuilder\Core\Installer::class, 'activate' ) );
register_deactivation_hook( __FILE__, array( \OptionSetBuilder\Core\Installer::class, 'deactivate' ) );

/**
 * Boot the plugin once all plugins are loaded (so WooCommerce is available).
 *
 * @return void
 */
function optset() { // phpcs:ignore WordPress.NamingConventions
	return \OptionSetBuilder\Core\Plugin::instance();
}

add_action( 'plugins_loaded', 'optset', 9 );

// Declare WooCommerce feature compatibility (HPOS + Cart/Checkout blocks).
add_action(
	'before_woocommerce_init',
	static function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
		}
	}
);
