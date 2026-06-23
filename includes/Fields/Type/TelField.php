<?php
/**
 * Telephone input field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;
use OptionSetBuilder\Support\Countries;

defined( 'ABSPATH' ) || exit;

/**
 * HTML5 tel input with optional validation pattern. Can render an intl-style
 * country selector (flag + dial code) ahead of the number, controlled by the
 * `flagStyle` setting; the searchable country list is built on the client by
 * store/phone.js from the shared country dataset.
 */
final class TelField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'tel';
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
		$def     = $this->prop( 'defaults', '' );
		$def     = is_array( $def ) ? ( isset( $def[0] ) ? $def[0] : '' ) : $def;

		$number = '<input type="tel" class="optset-input optset-phone__number" name="' . esc_attr( $this->input_name() ) . '"'
			. $this->attrs(
				array_merge(
					array(
						'placeholder' => (string) $this->prop( 'placeholder', '' ),
						'value'       => (string) $def,
						'pattern'     => (string) $this->cfg( 'pattern', '' ),
					),
					$this->choice_price_attrs( $choice ),
					array(
						'required' => ! empty( $this->prop( 'required' ) ),
					)
				)
			) . ' />';

		$flag_style = (string) $this->cfg( 'flagStyle', 'flag_dial' );
		if ( 'number' === $flag_style ) {
			return $number;
		}

		$iso       = Countries::resolve_default( (string) $this->cfg( 'defaultCountry', '' ) );
		$show_dial = ( 'flag_dial' === $flag_style );

		$button = '<button type="button" class="optset-phone__country" aria-haspopup="listbox" aria-expanded="false">'
			. '<span class="optset-phone__flag">' . esc_html( Countries::flag( $iso ) ) . '</span>'
			. ( $show_dial ? '<span class="optset-phone__dial">+' . esc_html( Countries::dial( $iso ) ) . '</span>' : '' )
			. '<span class="optset-phone__caret" aria-hidden="true"></span>'
			. '</button>';

		return '<div class="optset-phone" data-flag-style="' . esc_attr( $flag_style ) . '" data-default-country="' . esc_attr( $iso ) . '">'
			. '<input type="hidden" class="optset-phone__iso" value="' . esc_attr( $iso ) . '" />'
			. $button
			. $number
			. '</div>';
	}
}
