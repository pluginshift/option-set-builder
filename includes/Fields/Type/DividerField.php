<?php
/**
 * Horizontal divider field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Renders a styled rule. Layout-only: no price, no label wrapper.
 */
final class DividerField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'divider';
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
		$allowed = array( 'solid', 'dashed', 'dotted', 'double' );
		$style   = (string) $this->cfg( 'style', 'solid' );
		if ( ! in_array( $style, $allowed, true ) ) {
			$style = 'solid';
		}

		// Optional line thickness (the divider's height), in pixels.
		$height = (int) $this->cfg( 'height', 0 );
		$inline = $height > 0 ? ' style="border-top-width:' . $height . 'px"' : '';

		$html  = '<div ' . $this->wrapper_attrs() . '>';
		$html .= '<hr class="optset-divider optset-divider--' . esc_attr( $style ) . '"' . $inline . ' />';
		$html .= '</div>';
		return $html;
	}
}
