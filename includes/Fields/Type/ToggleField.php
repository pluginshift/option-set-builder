<?php
/**
 * On/off toggle switch field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * A single boolean switch. The first choice carries the price applied
 * when the switch is enabled.
 */
final class ToggleField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'toggle';
	}

	/**
	 * Control markup. Lays the switch out as a single choice-style row: the
	 * switch, an optional image, the choice title, the price badge, and — when
	 * quantity is enabled — a quantity box (kept outside the <label> so clicking
	 * it doesn't flip the switch). The price applies only while the switch is on
	 * (see store/collect.js + PriceCalculator).
	 *
	 * @return string
	 */
	protected function inner() {
		$choices = $this->choices();
		$choice  = isset( $choices[0] ) && is_array( $choices[0] ) ? $choices[0] : array();
		$on      = ! empty( $choice['selected'] );
		$label   = isset( $choice['label'] ) ? (string) $choice['label'] : '';
		$image   = isset( $choice['image'] ) ? (string) $choice['image'] : '';

		$switch  = '<label class="optset-toggle">';
		$switch .= '<input type="checkbox" class="optset-toggle__input" name="' . esc_attr( $this->choice_name() ) . '" value="0"'
			. $this->attrs(
				array_merge(
					array(
						'data-uid'   => isset( $choice['uid'] ) ? (string) $choice['uid'] : '',
						'data-label' => $label,
					),
					$this->choice_price_attrs( $choice ),
					array(
						'checked' => $on,
					)
				)
			) . ' />';
		$switch .= '<span class="optset-toggle__track"><span class="optset-toggle__thumb"></span></span>';
		if ( '' !== $image ) {
			$switch .= '<span class="optset-toggle__image"><img src="' . esc_url( $image ) . '" alt="" /></span>';
		}
		if ( '' !== $label ) {
			$switch .= '<span class="optset-toggle__label">' . esc_html( $label ) . '</span>';
		}
		if ( '' !== (string) $this->cfg( 'onText', '' ) || '' !== (string) $this->cfg( 'offText', '' ) ) {
			$switch .= '<span class="optset-toggle__text" data-on="' . esc_attr( (string) $this->cfg( 'onText', '' ) ) . '" data-off="' . esc_attr( (string) $this->cfg( 'offText', '' ) ) . '"></span>';
		}
		$switch .= $this->price_badge( $choice );
		$switch .= '</label>';

		return '<div class="optset-toggle-row">' . $switch . $this->qty_input( 0 ) . '</div>';
	}
}
