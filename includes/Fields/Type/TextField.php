<?php
/**
 * Single-line text field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Plain text input. Priceable via per_char / per_word choice modes.
 */
final class TextField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'text';
	}

	/**
	 * Show the configured surcharge as a badge beside the field title
	 * ("Title  +$5/char"), mirroring the Time field and choice fields.
	 *
	 * @return string
	 */
	protected function label_suffix() {
		$choices = $this->choices();
		$choice  = isset( $choices[0] ) && is_array( $choices[0] ) ? $choices[0] : array();
		return $this->price_badge( $choice );
	}

	/**
	 * Default scalar from the defaults bag.
	 *
	 * @return string
	 */
	protected function default_value() {
		$def = $this->prop( 'defaults', '' );
		if ( is_array( $def ) ) {
			$def = isset( $def[0] ) ? $def[0] : '';
		}
		return (string) $def;
	}

	/**
	 * Control markup.
	 *
	 * @return string
	 */
	protected function inner() {
		$choices = $this->choices();
		$choice  = isset( $choices[0] ) && is_array( $choices[0] ) ? $choices[0] : array();

		return '<input type="text" class="optset-input" name="' . esc_attr( $this->input_name() ) . '"'
			. $this->attrs(
				array_merge(
					array(
						'placeholder' => (string) $this->prop( 'placeholder', '' ),
						'value'       => $this->default_value(),
					),
					$this->choice_price_attrs( $choice ),
					array(
						'required' => ! empty( $this->prop( 'required' ) ),
					)
				)
			) . ' />';
	}
}
