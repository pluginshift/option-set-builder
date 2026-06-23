<?php
/**
 * Range slider field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Slider with a numeric mirror input and optional value postfix.
 * Priceable via per_unit (value-driven) choice mode.
 */
final class RangeField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'range';
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

		$min     = '' !== (string) $this->cfg( 'min', '' ) ? (float) $this->cfg( 'min' ) : 0;
		$max     = '' !== (string) $this->cfg( 'max', '' ) ? (float) $this->cfg( 'max' ) : 100;
		$step    = '' !== (string) $this->cfg( 'step', '' ) ? (string) $this->cfg( 'step' ) : '1';
		$value   = '' !== (string) $this->cfg( 'value', '' ) ? (string) $this->cfg( 'value' ) : (string) $min;
		$postfix = (string) $this->cfg( 'postfix', '' );

		$attrs = array_merge(
			array(
				'min'   => (string) $min,
				'max'   => (string) $max,
				'step'  => $step,
				'value' => $value,
			),
			$this->choice_price_attrs( $choice )
		);

		$html  = '<div class="optset-range">';
		$html .= '<input type="range" class="optset-range__slider" name="' . esc_attr( $this->input_name() ) . '"' . $this->attrs( $attrs ) . ' />';
		$html .= '<span class="optset-range__readout">';
		$html .= '<input type="number" class="optset-range__mirror" min="' . esc_attr( (string) $min ) . '" max="' . esc_attr( (string) $max ) . '" step="' . esc_attr( $step ) . '" value="' . esc_attr( $value ) . '" />';
		if ( '' !== $postfix ) {
			$html .= '<span class="optset-range__postfix">' . esc_html( $postfix ) . '</span>';
		}
		$html .= '</span>';
		$html .= '</div>';
		return $html;
	}
}
