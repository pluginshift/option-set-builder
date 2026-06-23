<?php
/**
 * Checkbox group field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Multi-select checkbox group. Honours columns, selection bounds and an
 * optional per-choice quantity input.
 */
final class CheckboxField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'checkbox';
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

		$columns = (int) $this->cfg( 'columns', 1 );

		$html = '<div class="optset-choices optset-choices--checkbox"'
			. $this->attrs(
				array(
					'data-columns'    => $columns > 0 ? $columns : 1,
					'data-min-select' => '' !== (string) $this->cfg( 'minSelect', '' ) ? (int) $this->cfg( 'minSelect' ) : '',
					'data-max-select' => '' !== (string) $this->cfg( 'maxSelect', '' ) ? (int) $this->cfg( 'maxSelect' ) : '',
				)
			) . '>';

		foreach ( $choices as $index => $choice ) {
			$label    = isset( $choice['label'] ) ? (string) $choice['label'] : '';
			$selected = ! empty( $choice['selected'] );

			$html .= '<label class="optset-choice">';
			$html .= '<input type="checkbox" name="' . esc_attr( $this->choice_name() ) . '[]" value="' . esc_attr( $index ) . '"'
				. $this->attrs(
					array_merge(
						array(
							'data-uid'   => isset( $choice['uid'] ) ? (string) $choice['uid'] : '',
							'data-label' => $label,
						),
						$this->choice_price_attrs( is_array( $choice ) ? $choice : array() ),
						array(
							'checked' => $selected,
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
