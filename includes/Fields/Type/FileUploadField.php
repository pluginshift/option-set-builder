<?php
/**
 * File upload field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Drag-and-drop file upload. Files are POSTed to the public upload REST
 * route; the hidden input holds a JSON list of { name, path } records.
 */
final class FileUploadField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'fileupload';
	}

	/**
	 * Show the configured surcharge as a badge beside the field title
	 * ("Title  +$5"), pricing on choices[0] like the other value fields.
	 *
	 * @return string
	 */
	protected function label_suffix() {
		$choices = $this->choices();
		$choice  = isset( $choices[0] ) && is_array( $choices[0] ) ? $choices[0] : array();
		return $this->price_badge( $choice );
	}

	/**
	 * Normalise the allowed-types config into an accept string.
	 *
	 * @return string
	 */
	private function accept() {
		$types = $this->cfg( 'allowedTypes', array() );
		if ( is_string( $types ) ) {
			$types = array_filter( array_map( 'trim', explode( ',', $types ) ) );
		}
		if ( ! is_array( $types ) || empty( $types ) ) {
			return '';
		}
		return implode(
			',',
			array_map(
				static function ( $ext ) {
					$ext = ltrim( trim( (string) $ext ), '.' );
					return '.' . $ext;
				},
				$types
			)
		);
	}

	/**
	 * Comma-separated list of the configured extensions, for hint display.
	 *
	 * @return string
	 */
	private function type_list() {
		$types = $this->cfg( 'allowedTypes', array() );
		if ( is_string( $types ) ) {
			$types = array_filter( array_map( 'trim', explode( ',', $types ) ) );
		}
		if ( ! is_array( $types ) ) {
			return '';
		}
		return implode( ', ', array_map( static function ( $t ) {
			return ltrim( trim( (string) $t ), '.' );
		}, $types ) );
	}

	/**
	 * Replace a hint token in a configured prefix string.
	 *
	 * @param string $key   Config key for the prefix text.
	 * @param string $token Token to replace (e.g. [max_size]).
	 * @param string $value Replacement value.
	 * @return string Hint HTML, or '' when the prefix is empty.
	 */
	private function hint( $key, $token, $value ) {
		$text = (string) $this->cfg( $key, '' );
		if ( '' === $text ) {
			return '';
		}
		$text = str_replace( $token, $value, $text );
		return '<span class="optset-upload__hint">' . esc_html( $text ) . '</span>';
	}

	/**
	 * Control markup.
	 *
	 * @return string
	 */
	protected function inner() {
		$choices = $this->choices();
		$choice  = isset( $choices[0] ) && is_array( $choices[0] ) ? $choices[0] : array();
		$uid     = 'optset-upload-' . $this->id();

		$upload_text = (string) $this->cfg( 'uploadText', '' );
		$upload_text = '' !== $upload_text ? $upload_text : __( 'Upload', 'option-set-builder' );
		$drag_text   = (string) $this->cfg( 'dragText', '' );
		$drag_text   = '' !== $drag_text ? $drag_text : __( 'Click or drag and drop', 'option-set-builder' );

		$max_size = '' !== (string) $this->cfg( 'maxSize', '' ) ? (int) $this->cfg( 'maxSize' ) : '';
		$max_num  = '' !== (string) $this->cfg( 'maxNumber', '' ) ? (int) $this->cfg( 'maxNumber' ) : '';

		$html  = '<div class="optset-upload" data-field-id="' . esc_attr( $this->id() ) . '"'
			. $this->attrs( $this->choice_price_attrs( $choice ) ) . '>';
		$html .= '<input type="hidden" class="optset-upload__data" name="' . esc_attr( $this->input_name() ) . '" value="" />';
		$html .= '<label class="optset-dropzone" for="' . esc_attr( $uid ) . '">';
		$html .= '<span class="optset-dropzone__btn"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M6 10l6-6 6 6M4 18v2h16v-2"/></svg>' . esc_html( $upload_text ) . '</span>';
		$html .= '<span class="optset-dropzone__text">' . esc_html( $drag_text ) . '</span>';
		$html .= '<input type="file" id="' . esc_attr( $uid ) . '" class="optset-upload__input" multiple'
			. $this->attrs(
				array(
					'accept'          => $this->accept(),
					'data-max-size'   => '' !== (string) $max_size ? $max_size : '',
					'data-min'        => '' !== (string) $this->cfg( 'minNumber', '' ) ? (int) $this->cfg( 'minNumber' ) : '',
					'data-max'        => '' !== (string) $max_num ? $max_num : '',
					'data-error-size' => (string) $this->cfg( 'sizeError', '' ),
					'data-error-max'  => (string) $this->cfg( 'countError', '' ),
				)
			) . ' />';
		$html .= '</label>';
		$html .= '<div class="optset-upload__progress" hidden><span class="optset-upload__bar"></span></div>';
		$html .= '<div class="optset-upload__result"></div>';

		$hints  = $this->hint( 'sizePrefix', '[max_size]', '' !== (string) $max_size ? $max_size . 'MB' : '' );
		$hints .= $this->hint( 'countPrefix', '[max_files]', '' !== (string) $max_num ? (string) $max_num : '' );
		$hints .= $this->hint( 'typePrefix', '[allowed_types]', $this->type_list() );
		if ( '' !== $hints ) {
			$html .= '<div class="optset-upload__hints">' . $hints . '</div>';
		}

		$html .= '</div>';
		return $html;
	}

	/**
	 * Human readable representation of uploaded files.
	 *
	 * @param mixed $value Selection value.
	 * @return string
	 */
	public function summarize( $value ) {
		if ( is_array( $value ) ) {
			$names = array();
			foreach ( $value as $file ) {
				if ( is_array( $file ) && isset( $file['name'] ) ) {
					$names[] = sanitize_text_field( (string) $file['name'] );
				}
			}
			return implode( ', ', $names );
		}
		return parent::summarize( $value );
	}
}
