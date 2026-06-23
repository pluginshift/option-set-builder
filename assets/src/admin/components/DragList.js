/**
 * Generic HTML5 drag-to-reorder list (no DnD library). Caller renders each
 * row; DragList wires draggable handles and emits a reorder on drop.
 *
 * @package
 */

import { useState } from '@wordpress/element';

/**
 * Move an array item from one index to another (non-mutating).
 *
 * @param {Array}  arr  Source array.
 * @param {number} from Source index.
 * @param {number} to   Target index.
 * @return {Array} Reordered copy.
 */
export function reorder( arr, from, to ) {
	const next = [ ...arr ];
	const [ moved ] = next.splice( from, 1 );
	next.splice( to, 0, moved );
	return next;
}

/**
 * DragList.
 *
 * @param {Object}   props             Component props.
 * @param {Array}    props.items       Row data.
 * @param {Function} props.onReorder   (fromIdx, toIdx) => void.
 * @param {Function} props.renderItem  (item, index, dragHandleProps) => JSX.
 * @param {string}   [props.className] Extra class.
 * @return {JSX.Element} The list.
 */
export default function DragList( {
	items,
	onReorder,
	renderItem,
	className = '',
} ) {
	const [ dragIdx, setDragIdx ] = useState( null );
	const [ overIdx, setOverIdx ] = useState( null );

	return (
		<ul className={ `optset-draglist ${ className }`.trim() }>
			{ items.map( ( item, idx ) => {
				const handleProps = {
					draggable: true,
					onDragStart: ( e ) => {
						setDragIdx( idx );
						e.dataTransfer.effectAllowed = 'move';
					},
					onDragEnd: () => {
						setDragIdx( null );
						setOverIdx( null );
					},
				};
				return (
					<li
						key={ item.key ?? idx }
						className={ `optset-draglist__row${
							overIdx === idx ? ' is-dragover' : ''
						}${ dragIdx === idx ? ' is-dragging' : '' }` }
						onDragOver={ ( e ) => {
							e.preventDefault();
							setOverIdx( idx );
						} }
						onDrop={ ( e ) => {
							e.preventDefault();
							if ( dragIdx !== null && dragIdx !== idx ) {
								onReorder( dragIdx, idx );
							}
							setDragIdx( null );
							setOverIdx( null );
						} }
					>
						{ renderItem( item, idx, handleProps ) }
					</li>
				);
			} ) }
		</ul>
	);
}
