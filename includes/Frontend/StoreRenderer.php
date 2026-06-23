<?php
/**
 * Storefront option-set renderer.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Frontend;

use OptionSetBuilder\Core\Container;
use OptionSetBuilder\Data\AssignmentResolver;
use OptionSetBuilder\Data\OptionSetRepository;
use OptionSetBuilder\Fields\FieldRegistry;
use OptionSetBuilder\Pricing\PriceCalculator;
use OptionSetBuilder\Support\Money;

defined( 'ABSPATH' ) || exit;

/**
 * Emits the full storefront DOM for a product's resolved option sets,
 * faithfully following ARCHITECTURE §8 (exact ids / classes / data-*). The
 * store JS bundle (window.optsetStore) consumes everything written here, so the
 * markup contract is load-bearing.
 */
final class StoreRenderer {

	/**
	 * Service container.
	 *
	 * @var Container
	 */
	private $container;

	/**
	 * Asset enqueuer.
	 *
	 * @var StoreAssets
	 */
	private $assets;

	/**
	 * Constructor.
	 *
	 * @param Container $container Service container.
	 */
	public function __construct( Container $container ) {
		$this->container = $container;
		$this->assets    = new StoreAssets();
	}

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function register() {
		$this->assets->register();

		add_action( 'woocommerce_before_add_to_cart_button', array( $this, 'render' ), 100 );

		// Image-swatch product-image swap entry point (kept minimal — the
		// store JS performs the live swap; this filter is the server-side
		// passthrough so gallery ids can be augmented later).
		add_filter( 'woocommerce_product_get_gallery_image_ids', array( $this, 'filter_gallery_image_ids' ), 99, 2 );
	}

	/**
	 * Render the option-set wrapper before the add-to-cart button.
	 *
	 * @return void
	 */
	public function render() {
		global $product;

		if ( ! $product || ! is_a( $product, 'WC_Product' ) ) {
			return;
		}

		$product_id = (int) $product->get_id();

		/** @var AssignmentResolver $assignment */
		$assignment = $this->container->get( 'assignment' );
		$set_ids    = $assignment ? $assignment->for_product( $product_id ) : array();

		if ( array() === $set_ids ) {
			return;
		}

		/** @var OptionSetRepository $sets */
		$sets = $this->container->get( 'sets' );
		/** @var FieldRegistry $fields */
		$fields = $this->container->get( 'fields' );

		$rendered_sets = array();
		$published_ids = array();

		foreach ( $set_ids as $set_id ) {
			$set_id = (int) $set_id;
			$set    = $sets ? $sets->get( $set_id ) : null;
			if ( ! $set || 'publish' !== $set['status'] ) {
				continue;
			}

			$nodes = is_array( $set['fields'] ) ? $set['fields'] : array();
			if ( array() === $nodes ) {
				continue;
			}

			$inner = '';
			foreach ( $nodes as $node ) {
				// Render top-level nodes only (parent === '' / absent); section
				// children are emitted by their own SectionField renderer.
				if ( ! is_array( $node ) || ( isset( $node['parent'] ) && '' !== (string) $node['parent'] ) ) {
					continue;
				}
				$field = $fields ? $fields->make( $node, $product_id, $set_id ) : null;
				if ( $field ) {
					$inner .= $field->render();
				}
			}

			if ( '' === $inner ) {
				continue;
			}

			$rendered_sets[] = sprintf(
				'<div class="optset-set" data-set-id="%d">%s</div>',
				$set_id,
				$inner
			);
			$published_ids[] = $set_id;

			// Impression counter — recorded once per rendered set.
			do_action( 'optset_stats_record', $set_id, 'impressions', 0 );
		}

		if ( array() === $rendered_sets ) {
			return;
		}

		// Tell StoreAssets to attach (handles the AJAX-loaded page case too).
		do_action( 'optset_enqueue_store_assets', $product_id, $published_ids );

		$html  = sprintf(
			'<div class="optset-options optset-loading" data-product-id="%d">',
			$product_id
		);
		$html .= '<div class="optset-loader" aria-hidden="true"></div>';
		$html .= $this->hidden_inputs( $product, $published_ids );
		$html .= implode( '', $rendered_sets );
		$html .= $this->price_summary( $product );
		$html .= '</div>';

		// Escape on output. Every dynamic value is already escaped at source;
		// this final wp_kses() with the storefront allow-list is the output-time
		// guarantee, preserving the form controls and data-* contract the store
		// JS relies on. The safe_style_css filter whitelists the inline-style
		// properties the field renderers emit.
		$style_props = static function ( $props ) {
			return array_merge(
				(array) $props,
				array( 'background', 'background-color', 'border-radius', 'border-top-width', 'height', 'width', 'font-family' )
			);
		};
		add_filter( 'safe_style_css', $style_props );
		echo wp_kses( $html, self::allowed_html() );
		remove_filter( 'safe_style_css', $style_props );
	}

	/**
	 * Allow-list of tags/attributes for the storefront markup passed to
	 * wp_kses(). Extends the standard post set with the form controls, inline
	 * SVG and <style> the field renderers emit, and applies a shared attribute
	 * set (class/id/style, ARIA, SVG geometry and the data-* contract the store
	 * JS reads) to every permitted tag.
	 *
	 * @return array<string,array<string,bool>>
	 */
	private static function allowed_html() {
		// Shared attributes permitted on every tag below. All values are
		// escaped at source; allowing them here just stops wp_kses() stripping
		// the load-bearing data-*/form attributes.
		$attr = array_fill_keys(
			array(
				// Common / form.
				'class', 'id', 'style', 'title', 'role', 'hidden', 'tabindex', 'for',
				'name', 'value', 'type', 'placeholder', 'checked', 'selected', 'disabled',
				'readonly', 'required', 'multiple', 'min', 'max', 'step', 'maxlength',
				'minlength', 'pattern', 'size', 'rows', 'cols', 'accept', 'autocomplete',
				'src', 'alt', 'width', 'height', 'srcset', 'sizes', 'loading',
				// ARIA.
				'aria-hidden', 'aria-label', 'aria-labelledby', 'aria-describedby',
				'aria-expanded', 'aria-controls', 'aria-selected', 'aria-checked',
				'aria-disabled', 'aria-live',
				// Inline SVG geometry (attribute case is preserved on output).
				'viewbox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
				'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'x', 'y', 'rx', 'ry', 'points', 'transform',
				// Storefront data-* contract consumed by window.optsetStore.
				'data-accordion', 'data-bidmap', 'data-columns', 'data-cost', 'data-cost-sale',
				'data-default', 'data-default-country', 'data-defaults', 'data-disable-dates',
				'data-disable-monthdays', 'data-disable-today', 'data-disable-weekdays',
				'data-error-max', 'data-error-size', 'data-expression', 'data-field-id',
				'data-flag-style', 'data-font', 'data-format', 'data-hour12', 'data-image-id',
				'data-index', 'data-label', 'data-layout', 'data-logic', 'data-logic-rules',
				'data-lp-price', 'data-max', 'data-max-date', 'data-max-mode', 'data-max-select',
				'data-max-size', 'data-max-time', 'data-merge', 'data-min', 'data-min-date',
				'data-min-mode', 'data-min-select', 'data-min-time', 'data-multiple', 'data-off',
				'data-on', 'data-open', 'data-popup-close', 'data-popup-for', 'data-price',
				'data-price-mode', 'data-product-id', 'data-product-type', 'data-qty',
				'data-required', 'data-set-id', 'data-step', 'data-tip', 'data-type', 'data-uid',
				'data-update-image', 'data-value', 'data-variant', 'data-variation',
			),
			true
		);

		// Tags the renderers emit on top of the standard post set.
		$extra_tags = array(
			'div', 'span', 'label', 'strong', 'em', 'small', 'p', 'br', 'hr', 'del', 'ins',
			'button', 'input', 'select', 'option', 'optgroup', 'textarea', 'img', 'a',
			'style', 'svg', 'path', 'circle', 'rect', 'g', 'line', 'polyline', 'polygon',
		);

		$allowed = wp_kses_allowed_html( 'post' );
		foreach ( $extra_tags as $tag ) {
			if ( ! isset( $allowed[ $tag ] ) || ! is_array( $allowed[ $tag ] ) ) {
				$allowed[ $tag ] = array();
			}
		}
		foreach ( $allowed as $tag => $tag_attr ) {
			$allowed[ $tag ] = array_merge( is_array( $tag_attr ) ? $tag_attr : array(), $attr );
		}

		return $allowed;
	}

	/**
	 * Hidden inputs + price/variation/attribute holder spans (DOM contract §8).
	 *
	 * @param \WC_Product $product       Product.
	 * @param int[]       $published_ids Rendered set ids.
	 * @return string
	 */
	private function hidden_inputs( $product, array $published_ids ) {
		$product_id = (int) $product->get_id();

		/** @var PriceCalculator $pricing */
		$pricing  = $this->container->get( 'pricing' );
		$base     = $pricing ? $pricing->productBasePrice( $product_id, 0 ) : 0.0;
		$base_pct = $pricing ? $pricing->productPercentBase( $product_id, 0 ) : 0.0;

		$variation_prices     = array();
		$variation_prices_pct = array();
		$attribute_map        = array();

		if ( method_exists( $product, 'is_type' ) && $product->is_type( 'variable' ) ) {
			foreach ( (array) $product->get_children() as $variation_id ) {
				$variation_id = (int) $variation_id;
				$variation_prices[ $variation_id ]     = $pricing ? $pricing->productBasePrice( $product_id, $variation_id ) : 0.0;
				$variation_prices_pct[ $variation_id ] = $pricing ? $pricing->productPercentBase( $product_id, $variation_id ) : 0.0;
			}

			if ( method_exists( $product, 'get_attributes' ) ) {
				foreach ( (array) $product->get_attributes() as $attribute ) {
					if ( ! is_object( $attribute ) || ! method_exists( $attribute, 'is_taxonomy' ) || ! $attribute->is_taxonomy() ) {
						continue;
					}
					$attribute_name = $attribute->get_name();
					$terms          = function_exists( 'wc_get_product_terms' )
						? wc_get_product_terms( $product_id, $attribute_name, array( 'fields' => 'all' ) )
						: array();
					foreach ( (array) $terms as $term ) {
						if ( is_object( $term ) && isset( $term->slug, $term->term_id ) ) {
							$attribute_map[ $attribute_name ][ $term->slug ] = (int) $term->term_id;
						}
					}
				}
			}
		}

		$shipping = array(
			'weight' => method_exists( $product, 'get_weight' ) ? Money::f( $product->get_weight() ) : 0,
			'length' => method_exists( $product, 'get_length' ) ? Money::f( $product->get_length() ) : 0,
			'width'  => method_exists( $product, 'get_width' ) ? Money::f( $product->get_width() ) : 0,
			'height' => method_exists( $product, 'get_height' ) ? Money::f( $product->get_height() ) : 0,
		);

		$html  = '<input type="hidden" name="optset_field_data" class="optset-field-data" value="" />';
		$html .= '<input type="hidden" name="optset_linked_products" class="optset-linked-products" value="" />';
		$html .= sprintf(
			'<input type="hidden" name="optset_published_set_ids" value="%s" />',
			esc_attr( (string) wp_json_encode( array_values( array_map( 'intval', $published_ids ) ) ) )
		);
		$html .= sprintf(
			'<input type="hidden" name="optset_shipping_dynamics" value="%s" />',
			esc_attr( (string) wp_json_encode( $shipping ) )
		);

		$html .= sprintf(
			'<span class="optset-holder" id="optset-base-price" data-value="%s"></span>',
			esc_attr( (string) $base )
		);
		$html .= sprintf(
			'<span class="optset-holder" id="optset-base-price-pct" data-value="%s"></span>',
			esc_attr( (string) $base_pct )
		);
		$html .= sprintf(
			'<span class="optset-holder" id="optset-variation-prices" data-value="%s"></span>',
			esc_attr( (string) wp_json_encode( $variation_prices ) )
		);
		$html .= sprintf(
			'<span class="optset-holder" id="optset-variation-prices-pct" data-value="%s"></span>',
			esc_attr( (string) wp_json_encode( $variation_prices_pct ) )
		);
		$html .= sprintf(
			'<span class="optset-holder" id="optset-product-attributes" data-product-type="%s" data-value="%s"></span>',
			esc_attr( method_exists( $product, 'get_type' ) ? (string) $product->get_type() : '' ),
			esc_attr( (string) wp_json_encode( $attribute_map ) )
		);

		return $html;
	}

	/**
	 * Options-price / total summary lines (gated by settings).
	 *
	 * @param \WC_Product $product Product.
	 * @return string
	 */
	private function price_summary( $product ) {
		$settings = $this->container->get( 'settings' );
		if ( ! $settings ) {
			return '';
		}

		$show_price = (bool) $settings->get( 'showPriceLine', true );
		$show_total = (bool) $settings->get( 'showTotalLine', true );
		if ( ! $show_price && ! $show_total ) {
			return '';
		}

		/** @var PriceCalculator $pricing */
		$pricing = $this->container->get( 'pricing' );
		$base    = $pricing ? $pricing->productBasePrice( (int) $product->get_id(), 0 ) : 0.0;

		$out = '<div class="optset-price-summary">';

		if ( $show_price ) {
			$out .= sprintf(
				'<div class="optset-price-row"><strong class="optset-price-label">%s</strong> <span id="optset-options-price" class="optset-price-value">%s</span></div>',
				esc_html( (string) $settings->get( 'priceLineLabel', __( 'Options Price', 'option-set-builder' ) ) ),
				wp_kses_post( Money::html( 0 ) )
			);
		}

		if ( $show_total ) {
			$out .= sprintf(
				'<div class="optset-price-row"><strong class="optset-price-label">%s</strong> <span id="optset-options-total" class="optset-price-value">%s</span></div>',
				esc_html( (string) $settings->get( 'totalLineLabel', __( 'Total Price', 'option-set-builder' ) ) ),
				wp_kses_post( Money::html( $base ) )
			);
		}

		$out .= '</div>';
		return $out;
	}

	/**
	 * Passthrough hook for image-swatch product-image swapping.
	 *
	 * The live image swap is handled client-side by the store bundle; this
	 * filter is the server-side seam so gallery ids can be augmented without
	 * touching the renderer.
	 *
	 * @param array $gallery_image_ids Gallery attachment ids.
	 * @param mixed $product           Product (unused here).
	 * @return array
	 */
	public function filter_gallery_image_ids( $gallery_image_ids, $product ) {
		unset( $product );
		return $gallery_image_ids;
	}
}
