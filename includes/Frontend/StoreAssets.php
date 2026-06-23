<?php
/**
 * Storefront asset enqueue + JS localisation.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Frontend;

use OptionSetBuilder\Core\Assets;
use OptionSetBuilder\Pricing\Currency\CurrencyBridge;

defined( 'ABSPATH' ) || exit;

/**
 * Owns everything asset-related for the storefront: the built `store` JS/CSS
 * bundle, per-set inline CSS, the global thematic/standard CSS option, and the
 * `window.optsetStore` localisation object. StoreRenderer fires
 * `optset_enqueue_store_assets`; this class listens and attaches once.
 */
final class StoreAssets {

	/**
	 * Whether assets were already attached this request.
	 *
	 * @var bool
	 */
	private $done = false;

	/**
	 * Collected per-set CSS keyed by set id.
	 *
	 * @var array<int,string>
	 */
	private $set_css = array();

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'optset_enqueue_store_assets', array( $this, 'enqueue' ), 10, 2 );
	}

	/**
	 * Enqueue the store bundle + localise it.
	 *
	 * @param int   $product_id    Product id.
	 * @param int[] $published_ids Rendered set ids.
	 * @return void
	 */
	public function enqueue( $product_id = 0, $published_ids = array() ) {
		unset( $product_id );

		if ( $this->done ) {
			return;
		}
		$this->done = true;

		$attached = Assets::script(
			'optset-store',
			'store',
			array( 'jquery', 'wp-i18n', 'wp-api-fetch' )
		);

		Assets::style( 'optset-store-style', 'store' );

		$this->collect_set_css( (array) $published_ids );
		$this->print_inline_css();

		$data = $this->localized();

		if ( $attached ) {
			wp_localize_script( 'optset-store', 'optsetStore', $data );
		}

		// AJAX-loaded product templates: the wp_enqueue_scripts pipeline never
		// runs, so best-effort inline-print the global + bundle reference.
		if ( ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() )
			|| ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			$this->print_ajax_fallback( $data, $attached );
		}
	}

	/**
	 * Gather per-set CSS for the rendered sets.
	 *
	 * @param int[] $published_ids Set ids.
	 * @return void
	 */
	private function collect_set_css( array $published_ids ) {
		$plugin = function_exists( 'optset' ) ? optset() : null;
		$repo   = $plugin ? $plugin->service( 'sets' ) : null;
		if ( ! $repo ) {
			return;
		}
		foreach ( $published_ids as $set_id ) {
			$set_id = (int) $set_id;
			$set    = $repo->get( $set_id );
			if ( $set && '' !== (string) $set['css'] ) {
				$this->set_css[ $set_id ] = (string) $set['css'];
			}
		}
	}

	/**
	 * Print collected per-set CSS plus the active global style CSS.
	 *
	 * @return void
	 */
	private function print_inline_css() {
		$css = '';
		foreach ( $this->set_css as $set_id => $rules ) {
			$css .= "\n/* optset-set-" . (int) $set_id . " */\n" . $rules;
		}

		$thematic = (string) get_option( 'optset_global_style_thematic_css', '' );
		$global   = '' !== $thematic ? $thematic : (string) get_option( 'optset_global_style_css', '' );
		if ( '' !== $global ) {
			$css .= "\n/* optset-global */\n" . $global;
		}

		if ( '' === trim( $css ) ) {
			return;
		}

		if ( wp_style_is( 'optset-store-style', 'enqueued' ) || wp_style_is( 'optset-store-style', 'registered' ) ) {
			wp_add_inline_style( 'optset-store-style', $css );
			return;
		}

		// Late/AJAX render: the normal wp_enqueue_scripts pipeline never ran, so
		// attach the CSS to a src-less registered handle and emit it through the
		// styles API rather than printing a raw <style> tag.
		if ( ! wp_style_is( 'optset-inline', 'registered' ) ) {
			wp_register_style( 'optset-inline', false, array(), OPTSET_VERSION );
		}
		wp_add_inline_style( 'optset-inline', $css );
		wp_enqueue_style( 'optset-inline' );
		wp_print_styles( 'optset-inline' );
	}

	/**
	 * Build the window.optsetStore localisation payload.
	 *
	 * @return array
	 */
	private function localized() {
		$currency = array(
			'symbol'      => function_exists( 'get_woocommerce_currency_symbol' ) ? html_entity_decode( get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8' ) : '',
			'pos'         => get_option( 'woocommerce_currency_pos' ),
			'decimals'    => function_exists( 'wc_get_price_decimals' ) ? wc_get_price_decimals() : 2,
			'decimalSep'  => function_exists( 'wc_get_price_decimal_separator' ) ? wc_get_price_decimal_separator() : '.',
			'thousandSep' => function_exists( 'wc_get_price_thousand_separator' ) ? wc_get_price_thousand_separator() : ',',
		);

		return array(
			'url'         => admin_url( 'admin-ajax.php' ),
			'restUrl'     => esc_url_raw( rest_url( 'optset/v1/' ) ),
			// X-WP-Nonce header — must be `wp_rest` so WP core's REST
			// cookie auth (rest_cookie_check_errors) passes for logged-in
			// visitors. Our routes additionally verify a body `optset_nonce`
			// against the `optset_rest` action below.
			'nonce'       => wp_create_nonce( 'wp_rest' ),
			'uploadNonce' => wp_create_nonce( 'optset_rest' ),
			'currency'    => $currency,
			'conversion'  => class_exists( CurrencyBridge::class ) ? CurrencyBridge::data() : array(
				'active' => false,
				'rate'   => 1.0,
				'extra'  => 0.0,
			),
		);
	}

	/**
	 * Inline-print the global + bundle for AJAX-rendered product pages.
	 *
	 * @param array $data     Localised data.
	 * @param bool  $attached Whether the bundle handle was enqueued.
	 * @return void
	 */
	private function print_ajax_fallback( array $data, $attached ) {
		wp_print_inline_script_tag(
			sprintf(
				'window.optsetStore = window.optsetStore || %s;',
				wp_json_encode( $data )
			)
		);

		if ( ! $attached && is_readable( OPTSET_PATH . 'assets/build/store.js' ) ) {
			wp_print_script_tag( array( 'src' => esc_url( OPTSET_ASSETS . 'store.js' ) ) );
		}
	}
}
