/**
 * Type-specific configuration block rendered inside the General tab for
 * non-choice fields. It is schema-driven (registry `inspectorSchema`) with a
 * dedicated formula editor for the formula types — so the drawer scales to
 * future field types without bespoke wiring.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { getType, priceModeOptionsFor } from '../../../fields/registry';
import { useBuilder } from '../../../store/BuilderContext';
import { flatten } from '../../../store/treeOps';
import {
	Field,
	TextControl,
	SelectControl,
	ToggleField,
} from '../../../components';
import ValuePricing from './ValuePricing';

/**
 * Clickable variable chips + textarea for formula / advancedformula.
 *
 * @param {Object}   props          Component props.
 * @param {Object}   props.node     Selected node.
 * @param {Function} props.patch    (partialNode) => void.
 * @param {boolean}  props.advanced Whether this is the advanced formula.
 * @return {JSX.Element} The editor.
 */
function FormulaEditor( { node, patch, advanced } ) {
	const { tree } = useBuilder();
	const cfg = node.config || {};
	const vars = flatten( tree ).filter( ( f ) => f.id !== node.id );
	const token = ( id ) => ( advanced ? `[${ id }]` : `{{${ id }}}` );

	return (
		<>
			<Field
				label={
					advanced
						? __(
								'Expression',
								'option-set-builder'
						  )
						: __(
								'Formula',
								'option-set-builder'
						  )
				}
				help={
					advanced
						? __(
								'Variables in [brackets]; functions and comparisons supported.',
								'option-set-builder'
						  )
						: __(
								'Variables in {{double braces}}; arithmetic and % only.',
								'option-set-builder'
						  )
				}
			>
				<TextControl
					type="textarea"
					rows={ 4 }
					value={ cfg.formula || '' }
					onChange={ ( v ) =>
						patch( { config: { ...cfg, formula: v } } )
					}
				/>
			</Field>
			<div className="optset-formula-vars">
				<span className="optset-formula-vars__title">
					{ __(
						'Available variables',
						'option-set-builder'
					) }
				</span>
				<div className="optset-formula-vars__list">
					{ vars.length === 0 && (
						<span className="optset-hint">
							{ __(
								'No other fields yet.',
								'option-set-builder'
							) }
						</span>
					) }
					{ vars.map( ( v ) => (
						<button
							key={ v.id }
							type="button"
							className="optset-token"
							onClick={ () =>
								patch( {
									config: {
										...cfg,
										formula: `${
											cfg.formula || ''
										}${ token( v.id ) }`,
									},
								} )
							}
						>
							{ v.label || v.type } → { token( v.id ) }
						</button>
					) ) }
				</div>
			</div>
		</>
	);
}

/**
 * TypeConfig.
 *
 * @param {Object}   props       Component props.
 * @param {Object}   props.node  Selected node.
 * @param {Function} props.patch (partialNode) => void.
 * @return {JSX.Element|null} The config block.
 */
export default function TypeConfig( { node, patch } ) {
	const def = getType( node.type );
	const cfg = node.config || {};

	if ( node.type === 'formula' || node.type === 'advancedformula' ) {
		return (
			<FormulaEditor
				node={ node }
				patch={ patch }
				advanced={ node.type === 'advancedformula' }
			/>
		);
	}

	const schema = ( def.inspectorSchema || [] ).filter(
		// Width/placement live on the Styles tab; price modes on choices.
		( s ) => s.control !== 'priceMode'
	);

	const setKey = ( key, value ) =>
		patch( { config: { ...cfg, [ key ]: value } } );

	// Filtered by field type / Enable Quantity; saved value is preserved.
	const priceModeOptions = priceModeOptionsFor( node, cfg.priceModeFull ).map(
		( m ) => ( {
			value: m.value,
			label: m.label,
		} )
	);

	// Layout/special types have no placeholder; everything else does.
	const showPlaceholder = ! [
		'heading',
		'divider',
		'spacer',
		'section',
		'html',
		'shortcode',
	].includes( node.type );

	// Split the schema so compact controls sit side-by-side in a 2-col grid,
	// while toggles and full-width textareas keep their own rows.
	const toggleItems = schema.filter( ( s ) => s.control === 'toggle' );
	const wideItems = schema.filter(
		( s ) => s.control === 'textarea' || s.control === 'formula'
	);
	const compactItems = schema.filter(
		( s ) => ! [ 'toggle', 'textarea', 'formula' ].includes( s.control )
	);

	/**
	 * Render the input control for one compact schema item.
	 *
	 * @param {Object} item Schema descriptor.
	 * @return {JSX.Element} The control.
	 */
	const renderControl = ( item ) => {
		const value = cfg[ item.key ];
		if ( item.control === 'select' ) {
			return (
				<SelectControl
					value={ value ?? '' }
					onChange={ ( v ) => setKey( item.key, v ) }
					options={ item.options || [] }
				/>
			);
		}
		if ( item.control === 'priceModeFull' ) {
			return (
				<SelectControl
					value={ value ?? 'none' }
					onChange={ ( v ) => setKey( item.key, v ) }
					options={ priceModeOptions }
				/>
			);
		}
		return (
			<TextControl
				type={ item.control === 'number' ? 'number' : 'text' }
				value={ value ?? '' }
				onChange={ ( v ) => setKey( item.key, v ) }
			/>
		);
	};

	return (
		<>
			{ def.priceable && <ValuePricing node={ node } patch={ patch } /> }

			{ toggleItems.map( ( item ) => (
				<div key={ item.key } className="optset-settings__toggle-row">
					<ToggleField
						checked={ !! cfg[ item.key ] }
						onChange={ ( v ) => setKey( item.key, v ) }
						label={ item.label }
					/>
				</div>
			) ) }

			{ ( showPlaceholder || compactItems.length > 0 ) && (
				<div className="optset-settings__grid2">
					{ showPlaceholder && (
						<Field
							label={ __(
								'Placeholder',
								'option-set-builder'
							) }
						>
							<TextControl
								value={ node.placeholder }
								onChange={ ( v ) =>
									patch( { placeholder: v } )
								}
							/>
						</Field>
					) }
					{ compactItems.map( ( item ) => (
						<Field key={ item.key } label={ item.label }>
							{ renderControl( item ) }
						</Field>
					) ) }
				</div>
			) }

			{ wideItems.map( ( item ) => (
				<Field key={ item.key } label={ item.label }>
					<TextControl
						type="textarea"
						rows={ item.control === 'formula' ? 3 : undefined }
						value={ cfg[ item.key ] ?? '' }
						onChange={ ( v ) => setKey( item.key, v ) }
					/>
				</Field>
			) ) }
		</>
	);
}
