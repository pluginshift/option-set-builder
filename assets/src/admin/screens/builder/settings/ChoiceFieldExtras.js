/**
 * Per-type extra settings rendered below the choices table for choice-based
 * fields — quantity, selection (min/max) restriction, "allow multiple",
 * placeholder and the image-swatch product-image swap. Each block maps 1:1 to
 * the controls shown in that field type's settings reference design and writes
 * the exact `config` keys the storefront renderers already consume
 * (enableQty, minQty/maxQty, multiple, minSelect/maxSelect, updateProductImage).
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { Field, TextControl, ToggleField } from '../../../components';

/**
 * Enable-quantity toggle plus min/max quantity inputs (revealed when on).
 *
 * @param {Object}   props        Component props.
 * @param {Object}   props.cfg    Config bag.
 * @param {Function} props.setKey (key, value) => void.
 * @return {JSX.Element} The block.
 */
function QuantityBlock( { cfg, setKey } ) {
	return (
		<>
			<div className="optset-settings__toggle-row">
				<ToggleField
					checked={ !! cfg.enableQty }
					onChange={ ( v ) => setKey( 'enableQty', v ) }
					label={ __(
						'Enable Quantity',
						'option-set-builder'
					) }
				/>
			</div>
			{ cfg.enableQty && (
				<div className="optset-settings__grid2">
					<Field
						label={ __(
							'Minimum quantity',
							'option-set-builder'
						) }
					>
						<TextControl
							type="number"
							value={ cfg.minQty ?? '' }
							onChange={ ( v ) => setKey( 'minQty', v ) }
						/>
					</Field>
					<Field
						label={ __(
							'Maximum quantity',
							'option-set-builder'
						) }
					>
						<TextControl
							type="number"
							value={ cfg.maxQty ?? '' }
							onChange={ ( v ) => setKey( 'maxQty', v ) }
						/>
					</Field>
				</div>
			) }
		</>
	);
}

/**
 * Min/Max selection-restriction toggle plus the bounded inputs (with an
 * "Item" suffix), revealed when the toggle is on.
 *
 * @param {Object}   props        Component props.
 * @param {Object}   props.cfg    Config bag.
 * @param {Function} props.setKey (key, value) => void.
 * @return {JSX.Element} The block.
 */
function RestrictionBlock( { cfg, setKey } ) {
	return (
		<>
			<div className="optset-settings__toggle-row">
				<ToggleField
					checked={ !! cfg.minMaxRestriction }
					onChange={ ( v ) => setKey( 'minMaxRestriction', v ) }
					label={ __(
						'Min Max Restriction',
						'option-set-builder'
					) }
				/>
			</div>
			{ cfg.minMaxRestriction && (
				<div className="optset-settings__grid2">
					<Field
						label={ __(
							'Min restriction',
							'option-set-builder'
						) }
					>
						<span className="optset-input-suffix">
							<TextControl
								type="number"
								value={ cfg.minSelect ?? '' }
								onChange={ ( v ) => setKey( 'minSelect', v ) }
							/>
							<em>
								{ __(
									'Item',
									'option-set-builder'
								) }
							</em>
						</span>
					</Field>
					<Field
						label={ __(
							'Max restriction',
							'option-set-builder'
						) }
					>
						<span className="optset-input-suffix">
							<TextControl
								type="number"
								value={ cfg.maxSelect ?? '' }
								onChange={ ( v ) => setKey( 'maxSelect', v ) }
							/>
							<em>
								{ __(
									'Item',
									'option-set-builder'
								) }
							</em>
						</span>
					</Field>
				</div>
			) }
		</>
	);
}

/**
 * Single "Allow multiple" toggle.
 * @param root0
 * @param root0.cfg
 * @param root0.setKey
 */
function MultipleToggle( { cfg, setKey } ) {
	return (
		<div className="optset-settings__toggle-row">
			<ToggleField
				checked={ !! cfg.multiple }
				onChange={ ( v ) => setKey( 'multiple', v ) }
				label={ __(
					'Allow Multiple',
					'option-set-builder'
				) }
			/>
		</div>
	);
}

/**
 * ChoiceFieldExtras.
 *
 * @param {Object}   props       Component props.
 * @param {Object}   props.node  Selected node.
 * @param {Function} props.patch (partialNode) => void.
 * @return {JSX.Element|null} The extras block.
 */
export default function ChoiceFieldExtras( { node, patch } ) {
	const cfg = node.config || {};
	const setKey = ( key, value ) =>
		patch( { config: { ...cfg, [ key ]: value } } );

	switch ( node.type ) {
		case 'radio':
		case 'toggle':
			return <QuantityBlock cfg={ cfg } setKey={ setKey } />;

		case 'checkbox':
			return (
				<>
					<QuantityBlock cfg={ cfg } setKey={ setKey } />
					<RestrictionBlock cfg={ cfg } setKey={ setKey } />
				</>
			);

		case 'buttongroup':
			return (
				<>
					<MultipleToggle cfg={ cfg } setKey={ setKey } />
					<RestrictionBlock cfg={ cfg } setKey={ setKey } />
				</>
			);

		case 'colorswatch':
			return (
				<>
					<QuantityBlock cfg={ cfg } setKey={ setKey } />
					<MultipleToggle cfg={ cfg } setKey={ setKey } />
				</>
			);

		case 'imageswatch':
			return (
				<>
					<div className="optset-settings__toggle-row">
						<ToggleField
							checked={ !! cfg.updateProductImage }
							onChange={ ( v ) =>
								setKey( 'updateProductImage', v )
							}
							label={ __(
								'Update product image on selection',
								'option-set-builder'
							) }
						/>
					</div>
					<QuantityBlock cfg={ cfg } setKey={ setKey } />
					<MultipleToggle cfg={ cfg } setKey={ setKey } />
					<RestrictionBlock cfg={ cfg } setKey={ setKey } />
				</>
			);

		case 'select':
			return (
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
			);

		default:
			return null;
	}
}
