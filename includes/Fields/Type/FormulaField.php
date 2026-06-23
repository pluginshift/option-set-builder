<?php
/**
 * Simple formula price field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * A non-interactive price node: the store JS evaluates the arithmetic
 * expression (referencing other fields) and feeds the result into the
 * options price. Renders nothing when no expression is configured.
 */
final class FormulaField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'formula';
	}

	/**
	 * Control markup.
	 *
	 * @return string
	 */
	protected function inner() {
		$expression = (string) $this->cfg( 'expression', '' );
		if ( '' === trim( $expression ) ) {
			return '';
		}

		return '<div class="optset-formula" data-expression="' . esc_attr( $expression ) . '">'
			. '<span class="optset-formula__value"></span>'
			. '</div>';
	}

	/**
	 * Formula fields produce no human-readable selection text.
	 *
	 * @param mixed $value Selection value.
	 * @return string
	 */
	public function summarize( $value ) {
		return '';
	}
}
