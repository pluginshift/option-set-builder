<?php
/**
 * Custom dropdown select field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Native-styled custom select. A hidden input holds the selected choice
 * index; the option list is styled markup the store JS wires up.
 */
final class SelectField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'select';
	}

	/**
	 * Control markup.
	 *
	 * @return string
	 */
	protected function inner() {
		$choices     = $this->choices();
		$placeholder = (string) $this->prop( 'placeholder', '' );
		if ( '' === $placeholder ) {
			$placeholder = esc_html__( 'Select an option', 'option-set-builder' );
		}

		$html  = '<div class="optset-select" data-field-id="' . esc_attr( $this->id() ) . '">';
		$html .= '<input type="hidden" class="optset-select__value" name="' . esc_attr( $this->input_name() ) . '" value="" />';
		$html .= '<button type="button" class="optset-select__toggle"><span class="optset-select__placeholder">' . esc_html( $placeholder ) . '</span></button>';
		$html .= '<div class="optset-select__list" role="listbox">';

		foreach ( $choices as $index => $choice ) {
			$label = isset( $choice['label'] ) ? (string) $choice['label'] : '';
			$image = isset( $choice['image'] ) ? (string) $choice['image'] : '';

			$html .= '<div class="optset-select__opt" role="option"'
				. $this->attrs(
					array_merge(
						array(
							'data-index' => (int) $index,
							'data-uid'   => isset( $choice['uid'] ) ? (string) $choice['uid'] : '',
							'data-label' => $label,
						),
						$this->choice_price_attrs( is_array( $choice ) ? $choice : array() )
					)
				) . '>';
			if ( '' !== $image ) {
				$html .= '<span class="optset-select__opt-img"><img src="' . esc_url( $image ) . '" alt="' . esc_attr( $label ) . '" loading="lazy" /></span>';
			}
			$html .= '<span class="optset-select__opt-label">' . esc_html( $label ) . '</span>';
			$html .= $this->price_badge( is_array( $choice ) ? $choice : array() );
			$html .= '</div>';
		}

		$html .= '</div>';
		$html .= '</div>';
		return $html;
	}
}
