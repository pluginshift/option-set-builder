<?php
/**
 * Combined date + time field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Emits both a date and a time control. The selection value is
 * { date, time } per ARCHITECTURE §9.
 */
final class DatetimeField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'datetime';
	}

	/**
	 * Show the configured surcharge as a badge beside the field title
	 * ("Title  +$5"), mirroring the standalone Date / Time fields.
	 *
	 * @return string
	 */
	protected function label_suffix() {
		$choices = $this->choices();
		$choice  = isset( $choices[0] ) && is_array( $choices[0] ) ? $choices[0] : array();
		return $this->price_badge( $choice );
	}

	/**
	 * Control markup: a date control (left) + a time control (right). Both
	 * carry the exact same `data-*` contract as the standalone Date / Time
	 * fields, so the store reuses `wireDate` + `wireTime` verbatim. Price
	 * attributes live on the wrapper (the single value-driven control); the
	 * surcharge applies only once a value is supplied (see pricing.js).
	 *
	 * @return string
	 */
	protected function inner() {
		$choices = $this->choices();
		$choice  = isset( $choices[0] ) && is_array( $choices[0] ) ? $choices[0] : array();
		$hour12  = false !== $this->cfg( 'hour12', true );

		$cal_icon = '<span class="optset-date__icon" aria-hidden="true">'
			. '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'
			. '<rect x="3" y="4.5" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="1.6"/>'
			. '<path d="M3 9h18M8 2.5v4M16 2.5v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
			. '</svg></span>';

		$clock_icon = '<span class="optset-time__icon" aria-hidden="true">'
			. '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'
			. '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>'
			. '<path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
			. '</svg></span>';

		$date_input = '<input type="text" readonly class="optset-input optset-date-input" name="' . esc_attr( $this->input_name() ) . '_date"'
			. $this->attrs(
				array(
					'placeholder'            => (string) $this->cfg( 'format', 'd/m/Y' ),
					'data-format'            => (string) $this->cfg( 'format', 'd/m/Y' ),
					'data-min-mode'          => (string) $this->cfg( 'minMode', 'none' ),
					'data-min-date'          => (string) $this->cfg( 'minDate', '' ),
					'data-max-mode'          => (string) $this->cfg( 'maxMode', 'none' ),
					'data-max-date'          => (string) $this->cfg( 'maxDate', '' ),
					'data-disable-today'     => ! empty( $this->cfg( 'disableToday' ) ) ? 'yes' : '',
					'data-disable-dates'     => array_values( (array) $this->cfg( 'disableDates', array() ) ),
					'data-disable-weekdays'  => array_values( array_map( 'intval', (array) $this->cfg( 'disableWeekdays', array() ) ) ),
					'data-disable-monthdays' => array_values( array_map( 'intval', (array) $this->cfg( 'disableMonthlyDays', array() ) ) ),
				)
			) . ' />';

		$time_input = '<input type="text" readonly class="optset-input optset-time-input" name="' . esc_attr( $this->input_name() ) . '_time"'
			. $this->attrs(
				array(
					'placeholder'   => $hour12 ? 'hh:mm AM/PM' : 'HH:mm',
					'data-hour12'   => $hour12 ? 'yes' : 'no',
					'data-min-time' => (string) $this->cfg( 'minTime', '' ),
					'data-max-time' => (string) $this->cfg( 'maxTime', '' ),
					'data-step'     => '' !== (string) $this->cfg( 'step', '' ) ? (int) $this->cfg( 'step' ) : '',
				)
			) . ' />';

		$html  = '<div class="optset-datetime" data-variant="datetime" data-field-id="' . esc_attr( $this->id() ) . '"'
			. $this->attrs( $this->choice_price_attrs( $choice ) ) . '>';
		$html .= '<div class="optset-datetime__part optset-date">' . $cal_icon . $date_input . '</div>';
		$html .= '<div class="optset-datetime__part optset-time">' . $clock_icon . $time_input . '</div>';
		$html .= '</div>';
		return $html;
	}

	/**
	 * Human readable representation of a { date, time } value.
	 *
	 * @param mixed $value Selection value.
	 * @return string
	 */
	public function summarize( $value ) {
		if ( is_array( $value ) ) {
			$date = isset( $value['date'] ) ? (string) $value['date'] : '';
			$time = isset( $value['time'] ) ? (string) $value['time'] : '';
			return sanitize_text_field( trim( $date . ' ' . $time ) );
		}
		return parent::summarize( $value );
	}
}
