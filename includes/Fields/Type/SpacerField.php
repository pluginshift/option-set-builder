<?php
/**
 * Vertical spacer field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Inserts vertical whitespace. Layout-only: no price, no label wrapper.
 */
final class SpacerField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'spacer';
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
		$height = (int) $this->cfg( 'height', 24 );
		if ( $height < 0 ) {
			$height = 0;
		}

		$html  = '<div ' . $this->wrapper_attrs() . '>';
		$html .= '<div class="optset-spacer" style="height:' . esc_attr( $height ) . 'px"></div>';
		$html .= '</div>';
		return $html;
	}
}
