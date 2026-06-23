<?php
/**
 * Section container field.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields\Type;

use OptionSetBuilder\Core\Plugin;
use OptionSetBuilder\Fields\AbstractField;

defined( 'ABSPATH' ) || exit;

/**
 * Groups child fields inside a collapsible accordion. Layout-only: it
 * contributes no price itself (children price independently).
 */
final class SectionField extends AbstractField {

	/**
	 * Runtime slug.
	 *
	 * @return string
	 */
	public function type() {
		return 'section';
	}

	/**
	 * No pricing.
	 *
	 * @return bool
	 */
	public function priceable() {
		return false;
	}

	/**
	 * Inner markup (unused; render() is overridden).
	 *
	 * @return string
	 */
	protected function inner() {
		return '';
	}

	/**
	 * Custom render: accordion header + nested child fields.
	 *
	 * @return string
	 */
	public function render() {
		$children  = $this->prop( 'children', array() );
		$children  = is_array( $children ) ? $children : array();
		$accordion = 'accordion' === (string) $this->cfg( 'style', 'section' );
		$open      = 'close' !== (string) $this->cfg( 'initialState', 'open' );
		$label     = (string) $this->prop( 'label', '' );

		$reg  = Plugin::instance()->service( 'fields' );
		$body = '';
		if ( $reg ) {
			foreach ( $children as $child ) {
				if ( ! is_array( $child ) ) {
					continue;
				}
				$field = $reg->make( $child, $this->product_id, $this->set_id );
				if ( $field ) {
					$body .= $field->render();
				}
			}
		}

		$collapsed = $accordion && ! $open;
		$sec_class = 'optset-section'
			. ( $accordion ? ' optset-section--accordion' : '' )
			. ( $collapsed ? ' is-collapsed' : '' );

		$html  = '<div ' . $this->wrapper_attrs()
			. ' data-accordion="' . ( $accordion ? 'yes' : 'no' ) . '"'
			. ' data-open="' . ( $open ? 'yes' : 'no' ) . '">';
		$html .= '<div class="' . esc_attr( $sec_class ) . '">';
		if ( $accordion ) {
			$html .= '<button type="button" class="optset-section__header" aria-expanded="' . ( $open ? 'true' : 'false' ) . '">';
			$html .= '<span class="optset-section__title">' . esc_html( $label ) . '</span>';
			$html .= '<span class="optset-section__chevron" aria-hidden="true"></span>';
			$html .= '</button>';
		} elseif ( '' !== $label ) {
			$html .= '<div class="optset-section__header optset-section__header--static"><span class="optset-section__title">' . esc_html( $label ) . '</span></div>';
		}
		$html .= '<div class="optset-section__body">' . $body . '</div>';
		$html .= '</div>';
		$html .= '</div>';
		return $html;
	}
}
