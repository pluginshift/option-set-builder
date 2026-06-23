<?php
/**
 * Numeric input field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * HTML5 number input with min / max / step. Priceable via per_unit mode.
 */
final class NumberField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'number';
	}

	/**
	 * Show the configured surcharge as a badge beside the field title
	 * ("Title  +$5"), pricing on choices[0] like the other value fields.
	 *
	 * @return string
	 */
	protected function label_suffix() {
		$choices = $this->choices();
		$choice  = isset( $choices[0] ) && is_array( $choices[0] ) ? $choices[0] : array();
		return $this->price_badge( $choice );
	}

	/**
	 * Control markup.
	 *
	 * @return string
	 */
	protected function inner() {
		$choices = $this->choices();
		$choice  = isset( $choices[0] ) && is_array( $choices[0] ) ? $choices[0] : array();

		return '<input type="number" class="optset-input optset-input--number" name="' . esc_attr( $this->input_name() ) . '"'
			. $this->attrs(
				array_merge(
					array(
						'placeholder' => (string) $this->prop( 'placeholder', '' ),
						'min'         => '' !== (string) $this->cfg( 'min', '' ) ? (string) $this->cfg( 'min' ) : '',
						'max'         => '' !== (string) $this->cfg( 'max', '' ) ? (string) $this->cfg( 'max' ) : '',
						'step'        => '' !== (string) $this->cfg( 'step', '' ) ? (string) $this->cfg( 'step' ) : '',
						'value'       => (string) $this->cfg( 'value', '' ),
					),
					$this->choice_price_attrs( $choice ),
					array(
						'required' => ! empty( $this->prop( 'required' ) ),
					)
				)
			) . ' />';
	}
}
