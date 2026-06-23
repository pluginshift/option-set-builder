/**
 * General-tab config for the Section container. Mirrors the reference design:
 * a Style switch (plain Section vs. collapsible Accordion) and — for the
 * accordion — its Initial State (open or closed). Values are written to the
 * exact `config` keys SectionField.php, the canvas chrome and the store
 * `wireSection` widget consume, so the builder and storefront stay in sync.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { Field } from '../../../components';

/**
 * Small segmented (radio-like) button group.
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.value    Selected value.
 * @param {Array}    props.options  [{ value, label }].
 * @param {Function} props.onChange (value) => void.
 * @return {JSX.Element} The control.
 */
function Segmented( { value, options, onChange } ) {
	return (
		<div className="optset-seg" role="radiogroup">
			{ options.map( ( opt ) => (
				<button
					key={ opt.value }
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
 * SectionConfig.
 *
 * @param {Object}   props       Component props.
 * @param {Object}   props.node  Selected node.
 * @param {Function} props.patch (partialNode) => void.
 * @return {JSX.Element} The config block.
 */
export default function SectionConfig( { node, patch } ) {
	const cfg = node.config || {};
	const style = cfg.style === 'accordion' ? 'accordion' : 'section';
	const initialState = cfg.initialState === 'close' ? 'close' : 'open';
	const setKey = ( key, value ) =>
		patch( { config: { ...cfg, [ key ]: value } } );

	return (
		<div className="optset-settings__grid2">
			<Field
				label={ __(
					'Style',
					'option-set-builder'
				) }
			>
				<Segmented
					value={ style }
					onChange={ ( v ) => setKey( 'style', v ) }
					options={ [
						{
							value: 'section',
							label: __(
								'Section',
								'option-set-builder'
							),
						},
						{
							value: 'accordion',
							label: __(
								'Accordion',
								'option-set-builder'
							),
						},
					] }
				/>
			</Field>

			{ style === 'accordion' && (
				<Field
					label={ __(
						'Initial state',
						'option-set-builder'
					) }
				>
					<Segmented
						value={ initialState }
						onChange={ ( v ) => setKey( 'initialState', v ) }
						options={ [
							{
								value: 'open',
								label: __(
									'Open',
									'option-set-builder'
								),
							},
							{
								value: 'close',
								label: __(
									'Close',
									'option-set-builder'
								),
							},
						] }
					/>
				</Field>
			) }
		</div>
	);
}
