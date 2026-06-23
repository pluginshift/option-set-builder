<?php
/**
 * Advanced formula price field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Price node evaluated by the AST expression engine
 * ({@see \OptionSetBuilder\Formula\Ast\ExpressionEngine}). Supports functions,
 * comparisons and a bid map for shipping/weight dynamics. The store JS evaluates
 * the expression live; PriceCalculator recomputes it authoritatively at cart time.
 */
final class AdvancedFormulaField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'advancedformula';
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

		$bid_map = $this->cfg( 'bidMap', array() );

		return '<div class="optset-formula optset-formula--advanced" data-expression="' . esc_attr( $expression ) . '"'
			. $this->attrs( array( 'data-bidmap' => $bid_map ) ) . '>'
			. '<span class="optset-formula__value"></span>'
			. '</div>';
	}

	/**
	 * Advanced formula fields produce no human-readable selection text.
	 *
	 * @param mixed $value Selection value.
	 * @return string
	 */
	public function summarize( $value ) {
		return '';
	}
}
