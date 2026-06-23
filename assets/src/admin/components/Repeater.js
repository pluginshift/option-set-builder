/**
 * Reorderable repeatable rows with add/remove. Used by the Choices inspector
 * tab. Rows are reordered by drag (via DragList) and rendered by the caller.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import DragList, { reorder } from './DragList';

/**
 * Repeater.
 *
 * @param {Object}      props            Component props.
 * @param {Array}       props.rows       Row data array.
 * @param {Function}    props.onChange   (nextRows) => void.
 * @param {Function}    props.renderRow  (row, index) => JSX (row body).
 * @param {Function}    props.makeRow    () => newRow.
 * @param {string}      [props.addLabel] Add button label.
 * @param {boolean}     [props.canAdd]   Whether adding is allowed.
 * @param {JSX.Element} [props.addHint]  Node shown next to a disabled add.
 * @return {JSX.Element} The repeater.
 */
export default function Repeater( {
	rows,
	onChange,
	renderRow,
	makeRow,
	addLabel = __( 'Add row', 'option-set-builder' ),
	canAdd = true,
	addHint = null,
} ) {
	/**
	 * Remove a row by index.
	 *
	 * @param {number} idx Row index.
	 * @return {void}
	 */
	const removeAt = ( idx ) =>
		onChange( rows.filter( ( _, i ) => i !== idx ) );

	return (
		<div className="optset-repeater">
			<DragList
				items={ rows.map( ( r, i ) => ( {
					...r,
					key: r.uid || i,
				} ) ) }
				onReorder={ ( from, to ) =>
					onChange( reorder( rows, from, to ) )
				}
				renderItem={ ( row, idx, handleProps ) => (
					<div className="optset-repeater__row">
						<span
							className="optset-repeater__handle dashicons dashicons-move"
							{ ...handleProps }
							aria-label={ __(
								'Drag to reorder',
								'option-set-builder'
							) }
						/>
						<div className="optset-repeater__body">
							{ renderRow( rows[ idx ], idx ) }
						</div>
						<button
							type="button"
							className="optset-icon-btn optset-repeater__remove"
							onClick={ () => removeAt( idx ) }
							aria-label={ __(
								'Remove row',
								'option-set-builder'
							) }
						>
							<span
								className="dashicons dashicons-trash"
								aria-hidden="true"
							/>
						</button>
					</div>
				) }
			/>
			<div className="optset-repeater__foot">
				<button
					type="button"
					className="optset-btn optset-btn--ghost"
					disabled={ ! canAdd }
					onClick={ () => onChange( [ ...rows, makeRow() ] ) }
				>
					<span
						className="dashicons dashicons-plus-alt2"
						aria-hidden="true"
					/>
					{ addLabel }
				</button>
				{ ! canAdd && addHint }
			</div>
		</div>
	);
}
