/**
 * Shared "Price Type / Regular / Sales" panel for single-value priceable
 * fields (number, range, email, color picker, file upload). The price lives
 * on the field's first choice — exactly where the storefront renderer and
 * PriceCalculator read it from.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { priceModeOptionsFor, makeChoice } from '../../../fields/registry';
import { TextControl, SelectControl } from '../../../components';

/**
 * ValuePricing.
 *
 * @param {Object}   props       Component props.
 * @param {Object}   props.node  Selected node.
 * @param {Function} props.patch (partialNode) => void.
 * @return {JSX.Element} The pricing panel.
 */
export default function ValuePricing( { node, patch } ) {
	const choice = ( node.choices && node.choices[ 0 ] ) || {};

	// Filter by field type / Enable Quantity (allowedPriceModes in
	// fields/registry), keeping any saved value visible.
	const priceOptions = priceModeOptionsFor( node, choice.priceMode ).map(
		( m ) => ( {
			value: m.value,
			label: m.label,
		} )
	);

	const setPrice = ( delta ) => {
		const base =
			node.choices && node.choices.length
				? node.choices.slice()
				: [ makeChoice() ];
		base[ 0 ] = { ...( base[ 0 ] || makeChoice() ), ...delta };
		patch( { choices: base } );
	};

	return (
		<div className="optset-vprice">
			<div className="optset-vprice__head">
				<span>
					{ __(
						'Price Type',
						'option-set-builder'
					) }
				</span>
				<span>
					{ __(
						'Regular',
						'option-set-builder'
					) }
				</span>
				<span className="optset-vprice__pro">
					{ __( 'Sales', 'option-set-builder' ) }
				</span>
			</div>
			<div className="optset-vprice__row">
				<SelectControl
					value={ choice.priceMode || 'none' }
					options={ priceOptions }
					onChange={ ( v ) => setPrice( { priceMode: v } ) }
				/>
				<TextControl
					type="number"
					value={ choice.regular }
					onChange={ ( v ) => setPrice( { regular: v } ) }
				/>
				<TextControl
					type="number"
					value={ choice.sale }
					placeholder=""
					onChange={ ( v ) => setPrice( { sale: v } ) }
				/>
			</div>
		</div>
	);
}
