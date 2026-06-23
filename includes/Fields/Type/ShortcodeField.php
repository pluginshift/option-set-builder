<?php
/**
 * Shortcode embed field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Renders a WordPress shortcode inline. Layout-only: no price.
 */
final class ShortcodeField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'shortcode';
	}

	/**
	 * No pricing.
	 *
	 * @return bool
	 */
	public function priceable() {
		return false;
	}

	/**
	 * Inner markup (unused; render() is overridden).
	 *
	 * @return string
	 */
	protected function inner() {
		return '';
	}

	/**
	 * Custom render without the standard label wrapper.
	 *
	 * @return string
	 */
	public function render() {
		$shortcode = (string) $this->cfg( 'shortcode', '' );
		$html      = '<div ' . $this->wrapper_attrs() . '>';
		$html     .= '<div class="optset-shortcode">';
		if ( '' !== $shortcode ) {
			// Shortcode output is third-party HTML — constrain it to the
			// post-safe tag set before it enters the storefront markup.
			$html .= wp_kses_post( do_shortcode( $shortcode ) );
		}
		$html .= '</div>';
		$html .= '</div>';
		return $html;
	}
}
