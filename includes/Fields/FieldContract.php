<?php
/**
 * Field rendering contract.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields;

defined( 'ABSPATH' ) || exit;

/**
 * Every option type implements this. Pricing is computed centrally by
 * PriceCalculator (price modes are uniform across choice types); a field
 * class is responsible for storefront markup, metadata and turning a raw
 * stored selection value into human-readable cart/order lines.
 */
interface FieldContract {

	/**
	 * Runtime type slug (must match FieldRegistry key + JS type).
	 *
	 * @return string
	 */
	public function type();

	/**
	 * Storefront HTML for this field instance.
	 *
	 * @return string
	 */
	public function render();

	/**
	 * Convert a stored selection value into display lines.
	 *
	 * @param mixed $value Selection value (shape per ARCHITECTURE §9).
	 * @return string Human-readable representation (no price).
	 */
	public function summarize( $value );

	/**
	 * Whether this type contributes a price (false = layout/markup only).
	 *
	 * @return bool
	 */
	public function priceable();
}
