<?php
/**
 * Color swatch choice field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Choice group rendered as colored swatches. Single-select by default,
 * multi-select when cfg('multiple') is true.
 */
final class ColorSwatchField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'colorswatch';
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
		$input_t  = $multiple ? 'checkbox' : 'radio';
		$name     = $multiple ? $this->choice_name() . '[]' : $this->choice_name();

		$html = '<div class="optset-swatches optset-swatches--color"'
			. $this->attrs(
				array(
					'data-min-select' => $multiple && '' !== (string) $this->cfg( 'minSelect', '' ) ? (int) $this->cfg( 'minSelect' ) : '',
					'data-max-select' => $multiple && '' !== (string) $this->cfg( 'maxSelect', '' ) ? (int) $this->cfg( 'maxSelect' ) : '',
				)
			) . '>';

		foreach ( $choices as $index => $choice ) {
			$label = isset( $choice['label'] ) ? (string) $choice['label'] : '';
			$color = isset( $choice['color'] ) ? (string) $choice['color'] : '#ffffff';

			$html .= '<label class="optset-swatch-item" title="' . esc_attr( $label ) . '">';
			$html .= '<input type="' . esc_attr( $input_t ) . '" class="optset-swatch-item__native" name="' . esc_attr( $name ) . '" value="' . esc_attr( $index ) . '"'
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
			$swatch_style = trim( 'background:' . $color . ';' . $this->swatch_style(), ';' );
			$html .= '<span class="optset-swatch" style="' . esc_attr( $swatch_style ) . '"></span>';
			if ( '' !== $label ) {
				$html .= '<span class="optset-swatch-item__label">' . esc_html( $label ) . '</span>';
			}
			$html .= $this->price_badge( is_array( $choice ) ? $choice : array() );
			$html .= $this->qty_input( $index );
			$html .= '</label>';
		}

		$html .= '</div>';
		return $html;
	}
}
