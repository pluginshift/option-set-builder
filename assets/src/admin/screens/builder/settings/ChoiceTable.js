/**
 * The choices/options editor — a sortable table of choice rows (label,
 * optional image/colour, price type, regular & sale price, active default)
 * with inline add, drag reordering and per-type extras. The image/colour
 * control lives inline as its own column (matching the field-settings
 * reference designs) so editors set per-choice media without a second row.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import {
	DndContext,
	closestCenter,
	PointerSensor,
	KeyboardSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	useSortable,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, ImageIcon, X } from 'lucide-react';
import { priceModeOptionsFor, makeChoice } from '../../../fields/registry';
import useCustomFonts from '../../../hooks/useCustomFonts';

/** Map each choice type to its extra inline column (image|color|font). */
const EXTRA_BY_TYPE = {
	radio: 'image',
	checkbox: 'image',
	select: 'image',
	imageswatch: 'image',
	colorswatch: 'color',
	fontpicker: 'font',
	toggle: 'image',
};

/**
 * Compact inline image picker for a choice row. Opens the WP media frame and
 * shows a small thumbnail with a clear (×) badge once set.
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.value    Current image URL.
 * @param {Function} props.onChange ({id,url}|null) => void.
 * @return {JSX.Element} The picker cell.
 */
function ImageCell( { value, onChange } ) {
	const available = !! ( window.wp && window.wp.media );

	const open = () => {
		const media = window.wp && window.wp.media;
		if ( ! media ) {
			return;
		}
		const frame = media( {
			title: __(
				'Select image',
				'option-set-builder'
			),
			button: {
				text: __(
					'Use image',
					'option-set-builder'
				),
			},
			multiple: false,
			library: { type: 'image' },
		} );
		frame.on( 'select', () => {
			const att = frame.state().get( 'selection' ).first().toJSON();
			onChange( { id: att.id, url: att.url } );
		} );
		frame.open();
	};

	if ( value ) {
		return (
			<span className="optset-choices__media optset-choices__media--set">
				<button
					type="button"
					className="optset-choices__media-btn"
					onClick={ open }
					aria-label={ __(
						'Change image',
						'option-set-builder'
					) }
				>
					<img src={ value } alt="" />
				</button>
				<button
					type="button"
					className="optset-choices__media-clear"
					onClick={ () => onChange( null ) }
					aria-label={ __(
						'Remove image',
						'option-set-builder'
					) }
				>
					<X size={ 11 } />
				</button>
			</span>
		);
	}

	return (
		<button
			type="button"
			className="optset-choices__media optset-choices__media-btn"
			onClick={ open }
			disabled={ ! available }
			aria-label={ __(
				'Select image',
				'option-set-builder'
			) }
		>
			<ImageIcon size={ 16 } />
		</button>
	);
}

/**
 * Font-family picker cell — a dropdown of the uploaded custom fonts. Picking a
 * font stores its CSS family on the choice and seeds the option label with the
 * font title when the editor hasn't typed one. Options preview in their own
 * face (the @font-face is injected admin-side by useCustomFonts).
 *
 * @param {Object}   props         Component props.
 * @param {Object}   props.choice  Choice row.
 * @param {Function} props.onPatch (delta) => void.
 * @return {JSX.Element} The cell.
 */
function FontCell( { choice, onPatch } ) {
	const { fonts } = useCustomFonts();
	const current = choice.fontFamily || '';
	const known = fonts.some( ( f ) => f.family === current );

	const onPick = ( family ) => {
		const font = fonts.find( ( f ) => f.family === family );
		// The font title IS the option label for the Font Picker (no separate
		// title field), so always mirror the chosen font's title.
		onPatch( { fontFamily: family, label: font ? font.title : '' } );
	};

	return (
		<select
			className="optset-input optset-select-control optset-choices__font"
			style={ current ? { fontFamily: current } : undefined }
			value={ current }
			onChange={ ( e ) => onPick( e.target.value ) }
		>
			<option value="">
				{ __(
					'Select font',
					'option-set-builder'
				) }
			</option>
			{ fonts.map( ( f ) => (
				<option
					key={ f.id }
					value={ f.family }
					style={ { fontFamily: f.family } }
				>
					{ f.title }
				</option>
			) ) }
			{ current && ! known && (
				<option value={ current }>{ current }</option>
			) }
		</select>
	);
}

/**
 * One sortable choice row.
 *
 * @param {Object}   props              Component props.
 * @param {Object}   props.choice       Choice row data.
 * @param {number}   props.index        Row index.
 * @param {Array}    props.priceOptions Price-mode options.
 * @param {?string}  props.extra        Extra column kind (color|image|font).
 * @param {boolean}  props.labelless    Hide the Title input (Font Picker).
 * @param {Function} props.onPatch      (delta) => void.
 * @param {Function} props.onActive     (checked:boolean) => void.
 * @param {Function} props.onRemove     () => void.
 * @param            props.hideRemove
 * @return {JSX.Element} The row.
 */
function ChoiceRow( {
	choice,
	index,
	priceOptions,
	extra,
	labelless,
	hideRemove,
	onPatch,
	onActive,
	onRemove,
} ) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable( { id: choice.uid } );

	return (
		<div
			ref={ setNodeRef }
			style={ {
				transform: CSS.Transform.toString( transform ),
				transition,
			} }
			className={ `optset-choices__row${
				isDragging ? ' is-dragging' : ''
			}` }
		>
			<button
				type="button"
				className="optset-choices__grip"
				aria-label={ __(
					'Reorder',
					'option-set-builder'
				) }
				{ ...attributes }
				{ ...listeners }
			>
				<GripVertical size={ 15 } />
			</button>

			{ /* Font Picker has no manual title — its font dropdown drives the
			     option label, so it replaces the title input entirely. */ }
			{ labelless ? (
				<FontCell choice={ choice } onPatch={ onPatch } />
			) : (
				<input
					className="optset-input"
					value={ choice.label }
					placeholder={ sprintf(
						/* translators: %d: row number */
						__(
							'Option %d',
							'option-set-builder'
						),
						index + 1
					) }
					onChange={ ( e ) => onPatch( { label: e.target.value } ) }
				/>
			) }

			{ extra === 'image' && (
				<ImageCell
					value={ choice.image }
					onChange={ ( m ) =>
						onPatch( {
							image: m ? m.url : '',
							imageId: m ? m.id : 0,
						} )
					}
				/>
			) }
			{ extra === 'color' && (
				<input
					type="color"
					className="optset-choices__color"
					value={
						/^#[0-9a-fA-F]{6}$/.test( choice.color || '' )
							? choice.color
							: '#000000'
					}
					onChange={ ( e ) => onPatch( { color: e.target.value } ) }
					aria-label={ __(
						'Choose colour',
						'option-set-builder'
					) }
				/>
			) }

			<select
				className="optset-input optset-select-control"
				value={ choice.priceMode }
				onChange={ ( e ) => onPatch( { priceMode: e.target.value } ) }
			>
				{ priceOptions.map( ( o ) => (
					<option
						key={ o.value }
						value={ o.value }
						disabled={ o.disabled }
					>
						{ o.label }
					</option>
				) ) }
			</select>

			<input
				className="optset-input"
				type="number"
				value={ choice.regular }
				placeholder="0"
				onChange={ ( e ) => onPatch( { regular: e.target.value } ) }
			/>

			<input
				className="optset-input"
				type="number"
				value={ choice.sale }
				placeholder=""
				onChange={ ( e ) => onPatch( { sale: e.target.value } ) }
			/>

			<span
				className="optset-switch optset-choices__active"
				title={ __(
					'Selected by default',
					'option-set-builder'
				) }
			>
				<input
					type="checkbox"
					className="optset-switch__input"
					aria-label={ __(
						'Selected by default',
						'option-set-builder'
					) }
					checked={ !! choice.selected }
					onChange={ ( e ) => onActive( e.target.checked ) }
				/>
				<span className="optset-switch__track" aria-hidden="true" />
			</span>

			{ ! hideRemove && (
				<button
					type="button"
					className="optset-choices__del"
					aria-label={ __(
						'Delete option',
						'option-set-builder'
					) }
					onClick={ onRemove }
				>
					<Trash2 size={ 15 } />
				</button>
			) }
		</div>
	);
}

/**
 * ChoiceTable.
 *
 * @param {Object}   props       Component props.
 * @param {Object}   props.node  Selected node.
 * @param {Function} props.patch (partialNode) => void.
 * @return {JSX.Element} The choices editor.
 */
export default function ChoiceTable( { node, patch } ) {
	const choices = node.choices || [];
	const extra = EXTRA_BY_TYPE[ node.type ] || null;
	// Font Picker drives the option label from the chosen font, so its font
	// dropdown takes the place of the Title column entirely.
	const labelless = node.type === 'fontpicker';
	// Toggle is a single boolean choice — no add/remove, just the one row.
	const single = node.type === 'toggle';

	const sensors = useSensors(
		useSensor( PointerSensor, { activationConstraint: { distance: 5 } } ),
		useSensor( KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		} )
	);

	// Per-row price options: filtered by field type / Enable Quantity (see
	// allowedPriceModes in fields/registry). The saved value is always
	// preserved so toggling Enable Quantity off (etc.) never silently drops a
	// stored mode from a choice.
	const priceOptionsForChoice = ( choice ) =>
		priceModeOptionsFor( node, choice && choice.priceMode ).map( ( m ) => ( {
			value: m.value,
			label: m.label,
		} ) );

	const setChoice = ( idx, delta ) =>
		patch( {
			choices: choices.map( ( c, i ) =>
				i === idx ? { ...c, ...delta } : c
			),
		} );

	// Single-selection controls (dropdown / radio / font picker) can only have
	// one default-active option; activating one clears the rest.
	const singleSelect = [ 'select', 'radio', 'fontpicker' ].includes(
		node.type
	);
	const setActive = ( idx, checked ) =>
		patch( {
			choices: choices.map( ( c, i ) => {
				if ( i === idx ) {
					return { ...c, selected: checked };
				}
				return singleSelect ? { ...c, selected: false } : c;
			} ),
		} );

	const removeChoice = ( idx ) =>
		patch( { choices: choices.filter( ( _, i ) => i !== idx ) } );

	const addChoice = () => patch( { choices: [ ...choices, makeChoice() ] } );

	const onDragEnd = ( { active, over } ) => {
		if ( ! over || active.id === over.id ) {
			return;
		}
		const from = choices.findIndex( ( c ) => c.uid === active.id );
		const to = choices.findIndex( ( c ) => c.uid === over.id );
		if ( from < 0 || to < 0 ) {
			return;
		}
		patch( { choices: arrayMove( choices, from, to ) } );
	};

	const mediaLabels = {
		color: __( 'Color', 'option-set-builder' ),
		font: __( 'Font', 'option-set-builder' ),
		image: __( 'Image', 'option-set-builder' ),
	};
	const mediaLabel = mediaLabels[ extra ] || mediaLabels.image;

	let containerMod = '';
	if ( labelless ) {
		containerMod = ' optset-choices--fontpicker';
	} else if ( extra ) {
		containerMod = ' optset-choices--media';
	}

	return (
		<div className={ `optset-choices${ containerMod }` }>
			<div className="optset-choices__head">
				<span />
				<span>
					{ labelless
						? __(
								'Font',
								'option-set-builder'
						  )
						: __(
								'Title',
								'option-set-builder'
						  ) }
				</span>
				{ extra && ! labelless && <span>{ mediaLabel }</span> }
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
				<span className="optset-choices__pro-col">
					{ __( 'Sales', 'option-set-builder' ) }
				</span>
				<span>
					{ __(
						'Active',
						'option-set-builder'
					) }
				</span>
				<span />
			</div>

			<DndContext
				sensors={ sensors }
				collisionDetection={ closestCenter }
				onDragEnd={ onDragEnd }
			>
				<SortableContext
					items={ choices.map( ( c ) => c.uid ) }
					strategy={ verticalListSortingStrategy }
				>
					{ choices.map( ( choice, idx ) => (
						<ChoiceRow
							key={ choice.uid }
							choice={ choice }
							index={ idx }
							priceOptions={ priceOptionsForChoice( choice ) }
							extra={ extra }
							labelless={ labelless }
							hideRemove={ single }
							onPatch={ ( delta ) => setChoice( idx, delta ) }
							onActive={ ( checked ) =>
								setActive( idx, checked )
							}
							onRemove={ () => removeChoice( idx ) }
						/>
					) ) }
				</SortableContext>
			</DndContext>

			<div className="optset-choices__foot" hidden={ single }>
				<button
					type="button"
					className="optset-btn optset-btn--primary optset-choices__add"
					onClick={ addChoice }
				>
					<Plus size={ 15 } />
					{ __(
						'Add New Option',
						'option-set-builder'
					) }
				</button>
			</div>
		</div>
	);
}
