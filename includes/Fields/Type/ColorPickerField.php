<?php
/**
 * Free-form color picker field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Native color input with a hex text mirror and a reset control.
 */
final class ColorPickerField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'colorpicker';
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
		$default = (string) $this->cfg( 'defaultColor', '#000000' );

		$html  = '<div class="optset-colorpicker" data-field-id="' . esc_attr( $this->id() ) . '">';
		$html .= '<input type="color" class="optset-colorpicker__input" name="' . esc_attr( $this->input_name() ) . '"'
			. $this->attrs(
				array_merge(
					array(
						'value'        => $default,
						'data-default' => $default,
					),
					$this->choice_price_attrs( $choice )
				)
			) . ' />';
		$html .= '<input type="text" class="optset-colorpicker__hex" value="' . esc_attr( $default ) . '" maxlength="7" />';
		$html .= '<button type="button" class="optset-colorpicker__reset" aria-label="' . esc_attr__( 'Reset color', 'option-set-builder' ) . '">&times;</button>';
		$html .= '</div>';
		return $html;
	}
}
