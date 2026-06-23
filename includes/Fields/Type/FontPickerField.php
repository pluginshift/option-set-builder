<?php
/**
 * Font picker field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Lets the customer pick a font for personalised products. Emits @font-face for
 * any custom uploaded font referenced by a choice.
 */
final class FontPickerField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'fontpicker';
	}

	/**
	 * Map an uploaded font's file extension to a CSS @font-face format hint.
	 *
	 * @param string $type File extension (ttf|otf|woff|woff2).
	 * @return string CSS format() token.
	 */
	private function format_hint( $type ) {
		$map = array(
			'ttf'   => 'truetype',
			'otf'   => 'opentype',
			'woff'  => 'woff',
			'woff2' => 'woff2',
		);
		$type = strtolower( (string) $type );
		return isset( $map[ $type ] ) ? $map[ $type ] : 'woff2';
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

		$custom = get_option( 'optset_custom_fonts', array() );
		$custom = is_array( $custom ) ? $custom : array();
		$src_by = array();
		foreach ( $custom as $font ) {
			if ( ! empty( $font['family'] ) && ! empty( $font['src'] ) ) {
				$src_by[ (string) $font['family'] ] = array(
					'src'  => (string) $font['src'],
					'type' => isset( $font['file_type'] ) ? (string) $font['file_type'] : 'woff2',
				);
			}
		}

		// First option flagged "active" in the builder is the default selection.
		$selected_index  = -1;
		$selected_label  = '';
		$selected_family = '';
		foreach ( $choices as $index => $choice ) {
			if ( ! empty( $choice['selected'] ) ) {
				$selected_index  = (int) $index;
				$selected_label  = isset( $choice['label'] ) ? (string) $choice['label'] : '';
				$selected_family = isset( $choice['fontFamily'] ) ? (string) $choice['fontFamily'] : '';
				break;
			}
		}
		$has_default = $selected_index >= 0;

		$placeholder = $has_default
			? '<span class="optset-select__placeholder" style="font-family:' . esc_attr( $selected_family ) . '">'
				. esc_html( '' !== $selected_label ? $selected_label : $selected_family ) . '</span>'
			: '<span class="optset-select__placeholder">'
				. esc_html__( 'Select Font', 'option-set-builder' ) . '</span>';

		$face = '';
		$html = '<div class="optset-fontpicker optset-select" data-field-id="' . esc_attr( $this->id() ) . '">';
		$html .= '<input type="hidden" class="optset-select__value" name="' . esc_attr( $this->input_name() ) . '" value="'
			. esc_attr( $has_default ? (string) $selected_index : '' ) . '" />';
		$html .= '<button type="button" class="optset-select__toggle">' . $placeholder . '</button>';
		$html .= '<div class="optset-select__list" role="listbox">';

		foreach ( $choices as $index => $choice ) {
			$label  = isset( $choice['label'] ) ? (string) $choice['label'] : '';
			$family = isset( $choice['fontFamily'] ) ? (string) $choice['fontFamily'] : '';

			if ( '' !== $family && isset( $src_by[ $family ] ) ) {
				$face .= sprintf(
					"@font-face{font-family:'%s';src:url('%s') format('%s');font-display:swap;}",
					esc_attr( $family ),
					esc_url( $src_by[ $family ]['src'] ),
					esc_attr( $this->format_hint( $src_by[ $family ]['type'] ) )
				);
			}

			$opt_class = 'optset-select__opt' . ( (int) $index === $selected_index ? ' optset-select__opt--active' : '' );
			$html     .= '<div class="' . esc_attr( $opt_class ) . '" role="option"'
				. $this->attrs(
					array_merge(
						array(
							'data-index' => (int) $index,
							'data-uid'   => isset( $choice['uid'] ) ? (string) $choice['uid'] : '',
							'data-label' => $label,
							'data-font'  => $family,
						),
						$this->choice_price_attrs( is_array( $choice ) ? $choice : array() )
					)
				) . '>';
			// Font style applies to the label only — never to the price badge.
			$html .= '<span class="optset-select__opt-label" style="font-family:' . esc_attr( $family ) . '">'
				. esc_html( '' !== $label ? $label : $family ) . '</span>';
			$html .= $this->price_badge( is_array( $choice ) ? $choice : array() );
			$html .= '</div>';
		}

		$html .= '</div></div>';

		if ( '' !== $face ) {
			$html = '<style>' . $face . '</style>' . $html;
		}
		return $html;
	}
}
