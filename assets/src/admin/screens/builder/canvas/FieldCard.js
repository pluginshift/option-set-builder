/**
 * One editable field on the canvas: a live preview wrapped with selection,
 * a floating toolbar (drag / duplicate / delete) and section nesting. Click
 * selects the field and opens the settings drawer; the toolbar floats above
 * on hover or when active, mirroring Framer/Webflow ergonomics.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { useState, useEffect } from '@wordpress/element';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, Copy, Trash2, Settings2 } from 'lucide-react';
import { useBuilder } from '../../../store/BuilderContext';
import { useBuilderUI } from '../store/builderUi';
import { fieldIcon } from '../../../fields/icons';
import { getType } from '../../../fields/registry';
import FieldPreview from '../preview/FieldPreview';
import AddFieldButton from './AddFieldButton';
import SortableContainer from './SortableContainer';

/**
 * FieldCard.
 *
 * @param {Object} props      Component props.
 * @param {Object} props.node Field node.
 * @return {JSX.Element} The card.
 */
export default function FieldCard( { node } ) {
	const { selectedId, dispatch } = useBuilder();
	const { openSettings } = useBuilderUI();
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable( { id: node.id } );

	const selected = selectedId === node.id;
	const isSection = node.type === 'section';
	const cfg = node.config || {};
	const isAccordion = isSection && cfg.style === 'accordion';
	const [ open, setOpen ] = useState( cfg.initialState !== 'close' );
	// Keep the canvas accordion state in sync with the saved initial state.
	useEffect( () => {
		setOpen( cfg.initialState !== 'close' );
	}, [ cfg.initialState, isAccordion ] );
	const Icon = fieldIcon( node.type );
	const def = getType( node.type );

	const style = {
		transform: CSS.Transform.toString( transform ),
		transition,
	};

	/** Select this field and reveal its settings. */
	const select = () => {
		dispatch( { type: 'SELECT', id: node.id } );
		openSettings();
	};

	/**
	 * Stop a toolbar action from also selecting the card.
	 *
	 * @param {Function} fn Action to run.
	 * @return {Function} Wrapped handler.
	 */
	const action = ( fn ) => ( e ) => {
		e.stopPropagation();
		fn();
	};

	return (
		<div
			ref={ setNodeRef }
			style={ style }
			className={ `optset-card optset-card--w-${ node.width || 'full' }${
				selected ? ' is-selected' : ''
			}${ isDragging ? ' is-dragging' : '' }` }
		>
			<motion.div
				layout
				className="optset-card__inner"
				role="button"
				tabIndex={ 0 }
				onClick={ select }
				onKeyDown={ ( e ) => {
					if ( e.key === 'Enter' ) {
						e.preventDefault();
						select();
					}
				} }
			>
				{ /* Toolbar swallows clicks so its empty areas don't select
				   the card; the buttons within are the real controls. */ }
				{ /* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */ }
				<div
					className="optset-card__toolbar"
					onClick={ ( e ) => e.stopPropagation() }
				>
					<button
						type="button"
						className="optset-card__tool optset-card__handle"
						aria-label={ __(
							'Drag to reorder',
							'option-set-builder'
						) }
						{ ...attributes }
						{ ...listeners }
					>
						<GripVertical size={ 15 } />
					</button>
					<span className="optset-card__chip">
						<Icon size={ 13 } aria-hidden="true" />
						{ def.label }
					</span>
					<span className="optset-card__toolbar-spacer" />
					<button
						type="button"
						className="optset-card__tool"
						aria-label={ __(
							'Edit settings',
							'option-set-builder'
						) }
						onClick={ action( select ) }
					>
						<Settings2 size={ 15 } />
					</button>
					<button
						type="button"
						className="optset-card__tool"
						aria-label={ __(
							'Duplicate',
							'option-set-builder'
						) }
						onClick={ action( () =>
							dispatch( { type: 'DUPLICATE', id: node.id } )
						) }
					>
						<Copy size={ 15 } />
					</button>
					<button
						type="button"
						className="optset-card__tool optset-card__tool--danger"
						aria-label={ __(
							'Delete',
							'option-set-builder'
						) }
						onClick={ action( () =>
							dispatch( { type: 'REMOVE', id: node.id } )
						) }
					>
						<Trash2 size={ 15 } />
					</button>
				</div>

				<div className="optset-card__body">
					{ /* Sections render their own chrome + editable children
					   (no FieldPreview, which would duplicate the children). */ }
					{ isSection ? (
						<div
							className={ `optset-section-edit${
								isAccordion ? ' is-accordion' : ''
							}${
								isAccordion && ! open ? ' is-collapsed' : ''
							}` }
						>
							{ isAccordion ? (
								// eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
								<div
									className="optset-section-edit__header"
									onClick={ ( e ) => {
										e.stopPropagation();
										setOpen( ( o ) => ! o );
									} }
								>
									<span className="optset-section-edit__title">
										{ node.label ||
											__(
												'Section',
												'option-set-builder'
											) }
									</span>
									<span
										className="optset-section-edit__chevron"
										aria-hidden="true"
									/>
								</div>
							) : (
								<div className="optset-section-edit__header optset-section-edit__header--static">
									<span className="optset-section-edit__title">
										{ node.label ||
											__(
												'Section',
												'option-set-builder'
											) }
									</span>
								</div>
							) }

							{ ( ! isAccordion || open ) && (
								// eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
								<div
									className="optset-card__children"
									onClick={ ( e ) => e.stopPropagation() }
								>
									<SortableContainer
										nodes={ node.children || [] }
										parentId={ node.id }
									/>
									<AddFieldButton
										parentId={ node.id }
										compact
									/>
								</div>
							) }
						</div>
					) : (
						<FieldPreview node={ node } />
					) }
				</div>
			</motion.div>
		</div>
	);
}
