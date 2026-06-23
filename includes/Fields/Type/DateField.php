<?php
/**
 * Date picker field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Text input enhanced into a date picker by the store JS.
 */
final class DateField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'date';
	}

	/**
	 * Show the configured surcharge as a badge beside the field title
	 * ("Title  +$5"), mirroring how choice fields badge each option.
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
	 * The store `wireDate` widget enhances this readonly input into a flatpickr
	 * calendar, reading every `data-*` restriction below. The price attributes
	 * (from choices[0]) let the live-price layer treat the field like any other
	 * single-value priced control.
	 *
	 * @return string
	 */
	protected function inner() {
		$choices = $this->choices();
		$choice  = isset( $choices[0] ) && is_array( $choices[0] ) ? $choices[0] : array();

		$input = '<input type="text" readonly class="optset-input optset-date-input" name="' . esc_attr( $this->input_name() ) . '"'
			. $this->attrs(
				array_merge(
					array(
						'placeholder'              => (string) $this->prop( 'placeholder', '' ),
						'data-format'              => (string) $this->cfg( 'format', 'd/m/Y' ),
						'data-min-mode'            => (string) $this->cfg( 'minMode', 'none' ),
						'data-min-date'            => (string) $this->cfg( 'minDate', '' ),
						'data-max-mode'            => (string) $this->cfg( 'maxMode', 'none' ),
						'data-max-date'            => (string) $this->cfg( 'maxDate', '' ),
						'data-disable-today'       => ! empty( $this->cfg( 'disableToday' ) ) ? 'yes' : '',
						'data-disable-dates'       => array_values( (array) $this->cfg( 'disableDates', array() ) ),
						'data-disable-weekdays'    => array_values( array_map( 'intval', (array) $this->cfg( 'disableWeekdays', array() ) ) ),
						'data-disable-monthdays'   => array_values( array_map( 'intval', (array) $this->cfg( 'disableMonthlyDays', array() ) ) ),
					),
					$this->choice_price_attrs( $choice ),
					array(
						'required' => ! empty( $this->prop( 'required' ) ),
					)
				)
			) . ' />';

		return '<div class="optset-date">'
			. '<span class="optset-date__icon" aria-hidden="true">'
			. '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'
			. '<rect x="3" y="4.5" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="1.6"/>'
			. '<path d="M3 9h18M8 2.5v4M16 2.5v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
			. '</svg></span>'
			. $input
			. '</div>';
	}
}
