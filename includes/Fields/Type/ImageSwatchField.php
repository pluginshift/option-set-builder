<?php
/**
 * Image swatch choice field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Choice group rendered as image thumbnails. May optionally swap the
 * product gallery image on selection.
 */
final class ImageSwatchField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'imageswatch';
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

		$html = '<div class="optset-swatches optset-swatches--image"'
			. $this->attrs(
				array(
					'data-layout'        => (string) $this->cfg( 'layout', 'grid' ),
					'data-update-image'  => ! empty( $this->cfg( 'updateProductImage' ) ) ? 'yes' : '',
					'data-min-select'    => $multiple && '' !== (string) $this->cfg( 'minSelect', '' ) ? (int) $this->cfg( 'minSelect' ) : '',
					'data-max-select'    => $multiple && '' !== (string) $this->cfg( 'maxSelect', '' ) ? (int) $this->cfg( 'maxSelect' ) : '',
				)
			) . '>';

		foreach ( $choices as $index => $choice ) {
			$label = isset( $choice['label'] ) ? (string) $choice['label'] : '';
			$image = isset( $choice['image'] ) ? (string) $choice['image'] : '';
			$img_id = isset( $choice['imageId'] ) ? (int) $choice['imageId'] : 0;

			$html .= '<label class="optset-swatch-item optset-swatch-item--image" title="' . esc_attr( $label ) . '">';
			$html .= '<input type="' . esc_attr( $input_t ) . '" class="optset-swatch-item__native" name="' . esc_attr( $name ) . '" value="' . esc_attr( $index ) . '"'
				. $this->attrs(
					array_merge(
						array(
							'data-uid'   => isset( $choice['uid'] ) ? (string) $choice['uid'] : '',
							'data-label' => $label,
						),
						$this->choice_price_attrs( is_array( $choice ) ? $choice : array() ),
						array(
							'data-image-id' => $img_id > 0 ? $img_id : '',
							'checked'       => ! empty( $choice['selected'] ),
						)
					)
				) . ' />';
			$swatch_style = $this->swatch_style();
			$html        .= '<span class="optset-swatch-img"' . ( '' !== $swatch_style ? ' style="' . esc_attr( $swatch_style ) . '"' : '' ) . '>';
			if ( '' !== $image ) {
				$html .= '<img src="' . esc_url( $image ) . '" alt="' . esc_attr( $label ) . '" loading="lazy" />';
			}
			$html .= '</span>';
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
