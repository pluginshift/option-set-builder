<?php
/**
 * Multi-line text field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Textarea input. Priceable via per_char / per_word choice modes.
 */
final class TextareaField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'textarea';
	}

	/**
	 * Show the configured surcharge as a badge beside the field title.
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
		$rows    = (int) $this->cfg( 'rows', 4 );
		$def     = $this->prop( 'defaults', '' );
		$def     = is_array( $def ) ? ( isset( $def[0] ) ? $def[0] : '' ) : $def;

		return '<textarea class="optset-input optset-textarea" name="' . esc_attr( $this->input_name() ) . '"'
			. ' rows="' . esc_attr( $rows > 0 ? $rows : 4 ) . '"'
			. $this->attrs(
				array_merge(
					array(
						'placeholder' => (string) $this->prop( 'placeholder', '' ),
					),
					$this->choice_price_attrs( $choice ),
					array(
						'required' => ! empty( $this->prop( 'required' ) ),
					)
				)
			) . '>' . esc_textarea( (string) $def ) . '</textarea>';
	}
}
