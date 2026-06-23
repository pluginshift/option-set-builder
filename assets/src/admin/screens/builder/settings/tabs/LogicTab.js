/**
 * Settings drawer → Conditional Logic tab.
 *
 * Build a Show/Hide rule for the selected field that references any other
 * value field in the set. The sentence reads:
 *
 *   [Show|Hide] this field if [Any|All] of these rules match:
 *
 * Each rule is a Field / Comparison / Value row. The Value control adapts to
 * the chosen source: a dropdown of that field's options for choice fields,
 * a Checked/Unchecked picker for toggles, or a free text/number input for
 * plain inputs. The shape persisted to `node.logic` is consumed by the
 * front-end engine in `store/conditions.js` (ARCHITECTURE §6).
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { OPERATORS } from '../../../../fields/registry';
import { useBuilder } from '../../../../store/BuilderContext';
import {
	SelectControl,
	TextControl,
	ToggleField,
} from '../../../../components';

/** Operators that need no value input. */
const NO_VALUE = [ 'empty', 'not_empty', 'checked' ];

/** Operators that compare against a literal option/text value. */
const TEXT_VALUE_OPS = [ 'is', 'is_not', 'contains', 'not_contains' ];

/** Field types whose value is one of a fixed set of choices. */
const CHOICE_TYPES = [
	'checkbox',
	'radio',
	'select',
	'buttongroup',
	'colorswatch',
	'imageswatch',
	'fontpicker',
];

/** Field types that carry no comparable value (never usable as a source). */
const NON_VALUE_TYPES = [
	'heading',
	'html',
	'divider',
	'spacer',
	'section',
	'popup',
	'shortcode',
	'formula',
	'advancedformula',
	'linkedproducts',
];

/**
 * Walk the field tree (including section children) into a flat list of full
 * nodes, preserving choices/type so the Value control can adapt.
 *
 * @param {Array} tree Field tree.
 * @return {Array} Flat list of nodes.
 */
function flattenNodes( tree ) {
	const out = [];
	( tree || [] ).forEach( ( node ) => {
		out.push( node );
		if ( node.children && node.children.length ) {
			out.push( ...flattenNodes( node.children ) );
		}
	} );
	return out;
}

/**
 * Value control for a single rule, adapting to the source field type.
 *
 * @param {Object}   props          Component props.
 * @param {Object}   props.source   Source field node (or undefined).
 * @param {string}   props.operator Selected operator.
 * @param {string}   props.value    Current value.
 * @param {Function} props.onChange (value) => void.
 * @return {JSX.Element|null} The control, or null when the operator needs none.
 */
function ValueControl( { source, operator, value, onChange } ) {
	if ( NO_VALUE.includes( operator ) ) {
		return null;
	}

	const type = source ? source.type : '';

	// Toggle → Checked / Unchecked picker (sentinel values understood by the
	// front-end engine).
	if ( type === 'toggle' && TEXT_VALUE_OPS.includes( operator ) ) {
		return (
			<SelectControl
				value={ value }
				onChange={ onChange }
				options={ [
					{
						value: '',
						label: __(
							'Select state',
							'option-set-builder'
						),
					},
					{
						value: '__checked__',
						label: __(
							'Checked / On',
							'option-set-builder'
						),
					},
					{
						value: '__unchecked__',
						label: __(
							'Unchecked / Off',
							'option-set-builder'
						),
					},
				] }
			/>
		);
	}

	// Choice fields → dropdown of their option labels.
	if (
		CHOICE_TYPES.includes( type ) &&
		TEXT_VALUE_OPS.includes( operator ) &&
		Array.isArray( source.choices )
	) {
		const options = [
			{
				value: '',
				label: __(
					'Select option',
					'option-set-builder'
				),
			},
			...source.choices.map( ( c, i ) => {
				const label =
					( c.label || '' ).trim() ||
					`${ __(
						'Option',
						'option-set-builder'
					) } ${ i + 1 }`;
				return { value: c.label || label, label };
			} ),
		];
		return (
			<SelectControl
				value={ value }
				onChange={ onChange }
				options={ options }
			/>
		);
	}

	// Everything else → free text/number entry.
	return (
		<TextControl
			value={ value }
			placeholder={
				operator === 'between'
					? __(
							'e.g. 10,20',
							'option-set-builder'
					  )
					: __( 'Value', 'option-set-builder' )
			}
			onChange={ onChange }
		/>
	);
}

/**
 * LogicTab.
 *
 * @param {Object}   props       Component props.
 * @param {Object}   props.node  Selected node.
 * @param {Function} props.patch (partialNode) => void.
 * @return {JSX.Element} The tab body.
 */
export default function LogicTab( { node, patch } ) {
	const { tree } = useBuilder();
	const logic = node.logic || { action: 'show', match: 'all', rules: [] };
	const action = logic.action === 'hide' ? 'hide' : 'show';

	// Candidate source fields: every other value-carrying field in the set.
	const nodes = flattenNodes( tree ).filter(
		( f ) => f.id !== node.id && NON_VALUE_TYPES.indexOf( f.type ) === -1
	);
	const byId = {};
	nodes.forEach( ( f ) => ( byId[ f.id ] = f ) );

	const sourceOptions = nodes.map( ( f ) => ( {
		value: f.id,
		label: f.label || `${ f.type } (${ f.id.slice( 0, 6 ) })`,
	} ) );

	const rules = logic.rules || [];
	const setLogic = ( delta ) => patch( { logic: { ...logic, ...delta } } );

	const setRule = ( idx, delta ) =>
		setLogic( {
			rules: rules.map( ( r, i ) =>
				i === idx ? { ...r, ...delta } : r
			),
		} );

	const addRule = () =>
		setLogic( {
			rules: [
				...rules,
				{
					source: sourceOptions[ 0 ].value,
					operator: 'is',
					value: '',
				},
			],
		} );

	const removeRule = ( idx ) =>
		setLogic( { rules: rules.filter( ( _, i ) => i !== idx ) } );

	return (
		<div className="optset-settings__pane optset-logic">
			<div className="optset-logic__enable">
				<ToggleField
					checked={ node.logicEnabled }
					onChange={ ( v ) => patch( { logicEnabled: v } ) }
					label={ __(
						'Enable conditional logic for this element',
						'option-set-builder'
					) }
				/>
			</div>

			{ node.logicEnabled && (
				<>
					{ /* Sentence: [Show|Hide] this field if [Any|All] match */ }
					<div className="optset-logic__sentence">
						<SelectControl
							value={ action }
							onChange={ ( v ) => setLogic( { action: v } ) }
							options={ [
								{
									value: 'show',
									label: __(
										'Show',
										'option-set-builder'
									),
								},
								{
									value: 'hide',
									label: __(
										'Hide',
										'option-set-builder'
									),
								},
							] }
						/>
						<span className="optset-logic__text">
							{ __(
								'this field if',
								'option-set-builder'
							) }
						</span>
						<SelectControl
							value={ logic.match }
							onChange={ ( v ) => setLogic( { match: v } ) }
							options={ [
								{
									value: 'any',
									label: __(
										'Any',
										'option-set-builder'
									),
								},
								{
									value: 'all',
									label: __(
										'All',
										'option-set-builder'
									),
								},
							] }
						/>
						<span className="optset-logic__text">
							{ __(
								'of these rules match:',
								'option-set-builder'
							) }
						</span>
					</div>

					{ sourceOptions.length === 0 ? (
						<p className="optset-hint">
							{ __(
								'Add another field first to reference it in a rule.',
								'option-set-builder'
							) }
						</p>
					) : (
						<div className="optset-logic__table">
							<div className="optset-logic__head">
								<span>
									{ __(
										'Field',
										'option-set-builder'
									) }
								</span>
								<span>
									{ __(
										'Comparison',
										'option-set-builder'
									) }
								</span>
								<span>
									{ __(
										'Value',
										'option-set-builder'
									) }
								</span>
								<span className="optset-logic__head-act" />
							</div>

							{ rules.length === 0 && (
								<p className="optset-logic__empty">
									{ __(
										'No rules yet — add your first condition below.',
										'option-set-builder'
									) }
								</p>
							) }

							{ rules.map( ( rule, idx ) => (
								<div className="optset-logic__row" key={ idx }>
									<SelectControl
										value={ rule.source }
										onChange={ ( v ) =>
											setRule( idx, {
												source: v,
												value: '',
											} )
										}
										options={ sourceOptions }
									/>
									<SelectControl
										value={ rule.operator }
										onChange={ ( v ) =>
											setRule( idx, { operator: v } )
										}
										options={ OPERATORS }
									/>
									<div className="optset-logic__value">
										<ValueControl
											source={ byId[ rule.source ] }
											operator={ rule.operator }
											value={ rule.value }
											onChange={ ( v ) =>
												setRule( idx, { value: v } )
											}
										/>
									</div>
									<button
										type="button"
										className="optset-logic__del"
										onClick={ () => removeRule( idx ) }
										aria-label={ __(
											'Remove rule',
											'option-set-builder'
										) }
									>
										<span
											className="dashicons dashicons-trash"
											aria-hidden="true"
										/>
									</button>
								</div>
							) ) }

							<button
								type="button"
								className="optset-logic__add"
								onClick={ addRule }
							>
								<span
									className="dashicons dashicons-plus-alt2"
									aria-hidden="true"
								/>
								{ __(
									'Add condition',
									'option-set-builder'
								) }
							</button>
						</div>
					) }
				</>
			) }
		</div>
	);
}
