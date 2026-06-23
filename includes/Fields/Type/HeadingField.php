<?php
/**
 * Heading layout field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Renders a section heading. Layout-only: no price, no label wrapper.
 */
final class HeadingField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'heading';
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
		$allowed = array( 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' );
		$tag     = strtolower( (string) $this->cfg( 'tag', 'h3' ) );
		if ( ! in_array( $tag, $allowed, true ) ) {
			$tag = 'h3';
		}
		$text = (string) $this->prop( 'label', '' );

		$html  = '<div ' . $this->wrapper_attrs() . '>';
		$html .= '<' . $tag . ' class="optset-heading">' . esc_html( $text ) . '</' . $tag . '>';
		if ( '' !== (string) $this->prop( 'description', '' ) ) {
			$html .= '<div class="optset-field__desc">' . wp_kses_post( $this->prop( 'description' ) ) . '</div>';
		}
		$html .= '</div>';
		return $html;
	}
}
