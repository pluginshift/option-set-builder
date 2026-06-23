<?php
/**
 * Time picker field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Text input enhanced into a time picker by the store JS.
 */
final class TimeField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'time';
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
	 * The store `wireTime` widget enhances this readonly input into a flatpickr
	 * time picker, reading the format / bounds / step below. Price attributes
	 * (from choices[0]) let the live-price layer treat it like any other
	 * single-value priced control — charged only once a time is chosen.
	 *
	 * @return string
	 */
	protected function inner() {
		$choices = $this->choices();
		$choice  = isset( $choices[0] ) && is_array( $choices[0] ) ? $choices[0] : array();
		$hour12  = false !== $this->cfg( 'hour12', true );

		$placeholder = (string) $this->prop( 'placeholder', '' );
		if ( '' === $placeholder ) {
			$placeholder = $hour12 ? 'hh:mm AM/PM' : 'HH:mm';
		}

		$input = '<input type="text" readonly class="optset-input optset-time-input" name="' . esc_attr( $this->input_name() ) . '"'
			. $this->attrs(
				array_merge(
					array(
						'placeholder'   => $placeholder,
						'data-hour12'   => $hour12 ? 'yes' : 'no',
						'data-min-time' => (string) $this->cfg( 'minTime', '' ),
						'data-max-time' => (string) $this->cfg( 'maxTime', '' ),
						'data-step'     => '' !== (string) $this->cfg( 'step', '' ) ? (int) $this->cfg( 'step' ) : '',
					),
					$this->choice_price_attrs( $choice ),
					array(
						'required' => ! empty( $this->prop( 'required' ) ),
					)
				)
			) . ' />';

		return '<div class="optset-time">'
			. '<span class="optset-time__icon" aria-hidden="true">'
			. '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'
			. '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>'
			. '<path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
			. '</svg></span>'
			. $input
			. '</div>';
	}
}
