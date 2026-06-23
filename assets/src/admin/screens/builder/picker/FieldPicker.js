/**
 * Centered, searchable field-type picker. Opens from any "+ Add field"
 * affordance, groups every type by category with icons, supports fuzzy
 * search (cmdk), keyboard navigation, ESC-to-close (Radix), and animated
 * open/close (framer-motion).
 *
 * @package
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { typesByCategory } from '../../../fields/registry';
import { fieldIcon, CATEGORY_ICONS } from '../../../fields/icons';
import { useBuilder } from '../../../store/BuilderContext';
import { useBuilderUI } from '../store/builderUi';

const overlay = {
	hidden: { opacity: 0 },
	visible: { opacity: 1 },
};
const panel = {
	hidden: { opacity: 0, scale: 0.94, y: 16 },
	visible: { opacity: 1, scale: 1, y: 0 },
};

/**
 * FieldPicker.
 *
 * @return {JSX.Element} The picker dialog.
 */
export default function FieldPicker() {
	const { dispatch } = useBuilder();
	const { pickerOpen, pickerParent, pickerIndex, closePicker } =
		useBuilderUI();
	const [ query, setQuery ] = useState( '' );
	const inputRef = useRef( null );
	const groups = typesByCategory();

	// Clear the query each time the picker opens.
	useEffect( () => {
		if ( pickerOpen ) {
			setQuery( '' );
			const t = setTimeout( () => inputRef.current?.focus(), 60 );
			return () => clearTimeout( t );
		}
	}, [ pickerOpen ] );

	/**
	 * Add the chosen type and close.
	 *
	 * @param {Object} type Registry entry.
	 * @return {void}
	 */
	const add = ( type ) => {
		dispatch( {
			type: 'ADD',
			fieldType: type.slug,
			parentId: pickerParent,
			index: pickerIndex,
		} );
		closePicker();
	};

	return (
		<Dialog.Root
			open={ pickerOpen }
			onOpenChange={ ( o ) => ! o && closePicker() }
		>
			<AnimatePresence>
				{ pickerOpen && (
					<Dialog.Portal forceMount>
						<Dialog.Overlay asChild forceMount>
							<motion.div
								className="optset-picker__overlay"
								variants={ overlay }
								initial="hidden"
								animate="visible"
								exit="hidden"
								transition={ { duration: 0.16 } }
							/>
						</Dialog.Overlay>
						<div className="optset-picker__wrap">
							<Dialog.Content
								asChild
								forceMount
								aria-label={ __(
									'Add a field',
									'option-set-builder'
								) }
								aria-describedby={ undefined }
								onOpenAutoFocus={ ( e ) => e.preventDefault() }
							>
								<motion.div
									className="optset-picker"
									variants={ panel }
									initial="hidden"
									animate="visible"
									exit="hidden"
									transition={ {
										type: 'spring',
										damping: 30,
										stiffness: 380,
										mass: 0.7,
									} }
								>
									<Command className="optset-picker__cmd" loop>
										<header className="optset-picker__head">
											<div className="optset-picker__search">
												<Search
													size={ 18 }
													className="optset-picker__search-icon"
													aria-hidden="true"
												/>
												<Command.Input
													ref={ inputRef }
													value={ query }
													onValueChange={ setQuery }
													placeholder={ __(
														'Search fields…',
														'option-set-builder'
													) }
													className="optset-picker__input"
												/>
											</div>
											<Dialog.Close asChild>
												<button
													type="button"
													className="optset-picker__close"
													aria-label={ __(
														'Close',
														'option-set-builder'
													) }
												>
													<X size={ 18 } />
												</button>
											</Dialog.Close>
										</header>

										<Command.List className="optset-picker__list">
											<Command.Empty className="optset-picker__empty">
												{ __(
													'No fields match your search.',
													'option-set-builder'
												) }
											</Command.Empty>

											{ groups.map( ( group ) => {
												const Cat =
													CATEGORY_ICONS[ group.key ];
												return (
													<Command.Group
														key={ group.key }
														heading={
															<span className="optset-picker__cat">
																{ Cat && (
																	<Cat
																		size={
																			13
																		}
																		aria-hidden="true"
																	/>
																) }
																{ group.label }
															</span>
														}
														className="optset-picker__group"
													>
														{ group.items.map(
															( type ) => {
																const Icon =
																	fieldIcon(
																		type.slug
																	);
																return (
																	<Command.Item
																		key={
																			type.slug
																		}
																		value={ `${ type.label } ${ type.slug } ${ group.label }` }
																		onSelect={ () =>
																			add(
																				type
																			)
																		}
																		className="optset-picker__item"
																	>
																		<span className="optset-picker__item-icon">
																			<Icon
																				size={
																					18
																				}
																				aria-hidden="true"
																			/>
																		</span>
																		<span className="optset-picker__item-label">
																			{
																				type.label
																			}
																		</span>
																	</Command.Item>
																);
															}
														) }
													</Command.Group>
												);
											} ) }
										</Command.List>
									</Command>
								</motion.div>
							</Dialog.Content>
						</div>
					</Dialog.Portal>
				) }
			</AnimatePresence>
		</Dialog.Root>
	);
}
