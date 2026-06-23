/**
 * General-tab config for the Phone field — pricing, the flag-display style and
 * the default country. The flag style controls whether the storefront shows a
 * bare input, an input with a country-flag selector, or the selector plus the
 * dial code; the default country picks the initially-selected flag/code. The
 * runtime selector (flag + searchable country list) is rendered identically in
 * the builder preview and on the storefront.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { Field, TextControl, SelectControl } from '../../../components';
import { COUNTRIES, flagEmoji } from '../../../../shared/phone';
import ValuePricing from './ValuePricing';

/** Flag-display modes for the segmented control. */
const FLAG_STYLES = [
	{
		value: 'number',
		label: __( 'Number Only', 'option-set-builder' ),
	},
	{
		value: 'flag',
		label: __( 'Number & Flag', 'option-set-builder' ),
	},
	{
		value: 'flag_dial',
		label: __(
			'Number & Flag & Dial Code',
			'option-set-builder'
		),
	},
];

/**
 * Segmented (radio-like) button group.
 *
 * @param {Object}   props          Component props.
 * @param {*}        props.value    Selected value.
 * @param {Array}    props.options  [{ value, label }].
 * @param {Function} props.onChange (value) => void.
 * @return {JSX.Element} The control.
 */
function Segmented( { value, options, onChange } ) {
	return (
		<div className="optset-seg" role="radiogroup">
			{ options.map( ( opt ) => (
				<button
					key={ String( opt.value ) }
					type="button"
					role="radio"
					aria-checked={ value === opt.value }
					className={ `optset-seg__btn${
						value === opt.value ? ' is-active' : ''
					}` }
					onClick={ () => onChange( opt.value ) }
				>
					{ opt.label }
				</button>
			) ) }
		</div>
	);
}

/**
 * TelConfig.
 *
 * @param {Object}   props       Component props.
 * @param {Object}   props.node  Selected node.
 * @param {Function} props.patch (partialNode) => void.
 * @return {JSX.Element} The config block.
 */
export default function TelConfig( { node, patch } ) {
	const cfg = node.config || {};
	const flagStyle = cfg.flagStyle || 'flag_dial';
	const setKey = ( key, value ) =>
		patch( { config: { ...cfg, [ key ]: value } } );

	const countryOptions = [
		{
			value: '',
			label: __(
				'Auto (store country)',
				'option-set-builder'
			),
		},
		...COUNTRIES.map( ( c ) => ( {
			value: c.iso2,
			label: `${ flagEmoji( c.iso2 ) } ${ c.name } (+${ c.dial })`,
		} ) ),
	];

	return (
		<>
			<ValuePricing node={ node } patch={ patch } />

			<Field
				label={ __(
					'Flag style',
					'option-set-builder'
				) }
			>
				<Segmented
					value={ flagStyle }
					options={ FLAG_STYLES }
					onChange={ ( v ) => setKey( 'flagStyle', v ) }
				/>
			</Field>

			<div className="optset-settings__grid2">
				{ flagStyle !== 'number' && (
					<Field
						label={ __(
							'Default country',
							'option-set-builder'
						) }
					>
						<SelectControl
							value={ cfg.defaultCountry || '' }
							onChange={ ( v ) => setKey( 'defaultCountry', v ) }
							options={ countryOptions }
						/>
					</Field>
				) }
				<Field
					label={ __(
						'Placeholder',
						'option-set-builder'
					) }
				>
					<TextControl
						value={ node.placeholder }
						onChange={ ( v ) => patch( { placeholder: v } ) }
					/>
				</Field>
			</div>
		</>
	);
}
