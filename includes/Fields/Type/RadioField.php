<?php
/**
 * Radio group field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Single-select radio group. When cfg('multiple') is true the inputs
 * degrade to checkboxes (multi-select behaviour, same DOM contract).
 */
final class RadioField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'radio';
	}

	/**
	 * Control markup.
	 *
	 * @return string
	 */
	protected function inner() {
		$choices = $this->choices();
		if ( empty( $choices ) ) {
			return '';
		}

		$multiple = ! empty( $this->cfg( 'multiple' ) );
		$columns  = (int) $this->cfg( 'columns', 1 );
		$input_t  = $multiple ? 'checkbox' : 'radio';
		$name     = $multiple ? $this->choice_name() . '[]' : $this->choice_name();

		$html = '<div class="optset-choices optset-choices--radio"'
			. $this->attrs(
				array(
					'data-columns'    => $columns > 0 ? $columns : 1,
					'data-min-select' => $multiple && '' !== (string) $this->cfg( 'minSelect', '' ) ? (int) $this->cfg( 'minSelect' ) : '',
					'data-max-select' => $multiple && '' !== (string) $this->cfg( 'maxSelect', '' ) ? (int) $this->cfg( 'maxSelect' ) : '',
				)
			) . '>';

		foreach ( $choices as $index => $choice ) {
			$label = isset( $choice['label'] ) ? (string) $choice['label'] : '';

			$html .= '<label class="optset-choice">';
			$html .= '<input type="' . esc_attr( $input_t ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( $index ) . '"'
				. $this->attrs(
					array_merge(
						array(
							'data-uid'   => isset( $choice['uid'] ) ? (string) $choice['uid'] : '',
							'data-label' => $label,
						),
						$this->choice_price_attrs( is_array( $choice ) ? $choice : array() ),
						array(
							'checked' => ! empty( $choice['selected'] ),
						)
					)
				) . ' />';
			$html .= '<span class="optset-choice__label">' . esc_html( $label ) . '</span>';
			$html .= $this->price_badge( is_array( $choice ) ? $choice : array() );
			$html .= $this->qty_input( $index );
			$html .= '</label>';
		}

		$html .= '</div>';
		return $html;
	}
}
