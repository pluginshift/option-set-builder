<?php
/**
 * Money / price formatting helpers.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Centralised price formatting so display markup is consistent and
 * currency-switcher / tax aware on the server side.
 */
final class Money {

	/**
	 * Cast any numeric-ish value to float safely.
	 *
	 * @param mixed $value Input.
	 * @return float
	 */
	public static function f( $value ) {
		if ( is_string( $value ) ) {
			$value = str_replace( ',', '', $value );
		}
		return is_numeric( $value ) ? (float) $value : 0.0;
	}

	/**
	 * Render a price using WooCommerce formatting when available.
	 *
	 * @param float $amount Amount.
	 * @return string
	 */
	public static function html( $amount ) {
		if ( function_exists( 'wc_price' ) ) {
			return wc_price( $amount );
		}
		return esc_html( number_format( (float) $amount, 2 ) );
	}

	/**
	 * Build a regular / sale price object with display HTML.
	 *
	 * @param mixed $regular Regular price.
	 * @param mixed $sale    Sale price (may be empty).
	 * @return array{price:float,html:string}
	 */
	public static function pair( $regular, $sale ) {
		$regular = self::f( $regular );
		$sale    = '' === $sale || null === $sale ? null : self::f( $sale );

		if ( null !== $sale && $sale < $regular ) {
			return array(
				'price' => $sale,
				'html'  => '<del aria-hidden="true">' . self::html( $regular ) . '</del> <ins>' . self::html( $sale ) . '</ins>',
			);
		}
		return array(
			'price' => $regular,
			'html'  => self::html( $regular ),
		);
	}
}
