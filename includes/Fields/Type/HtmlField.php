<?php
/**
 * Raw HTML content field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Outputs sanitised author HTML. Layout-only: no price, no label wrapper.
 */
final class HtmlField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'html';
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
		$content = (string) $this->cfg( 'content', '' );
		$html    = '<div ' . $this->wrapper_attrs() . '>';
		$html   .= '<div class="optset-html">' . wp_kses_post( $content ) . '</div>';
		$html   .= '</div>';
		return $html;
	}
}
