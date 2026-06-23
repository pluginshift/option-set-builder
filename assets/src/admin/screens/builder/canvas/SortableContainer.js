/**
 * A drag-and-drop sortable list of field cards scoped to one container
 * (the root, or a single section's children). Each container owns its own
 * DndContext so reordering is constrained within it — predictable behaviour
 * that maps cleanly onto the reducer's MOVE action. Pointer + keyboard
 * sensors make sorting fully accessible.
 *
 * @package
 */

import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useBuilder } from '../../../store/BuilderContext';
import FieldCard from './FieldCard';

/**
 * SortableContainer.
 *
 * @param {Object} props          Component props.
 * @param {Array}  props.nodes    Sibling nodes in this container.
 * @param {string} props.parentId Container id ('' for root).
 * @return {JSX.Element} The sortable list.
 */
export default function SortableContainer( { nodes, parentId } ) {
	const { dispatch } = useBuilder();
	const sensors = useSensors(
		useSensor( PointerSensor, {
			activationConstraint: { distance: 5 },
		} ),
		useSensor( KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		} )
	);

	/**
	 * Reorder within this container on drop.
	 *
	 * @param {Object} event        dnd-kit drag-end event.
	 * @param {Object} event.active The dragged item.
	 * @param {Object} event.over   The drop target (nullable).
	 * @return {void}
	 */
	const onDragEnd = ( { active, over } ) => {
		if ( ! over || active.id === over.id ) {
			return;
		}
		const newIndex = nodes.findIndex( ( n ) => n.id === over.id );
		if ( newIndex < 0 ) {
			return;
		}
		dispatch( {
			type: 'MOVE',
			id: active.id,
			parentId,
			index: newIndex,
		} );
	};

	return (
		<DndContext
			sensors={ sensors }
			collisionDetection={ closestCenter }
			onDragEnd={ onDragEnd }
		>
			<SortableContext
				items={ nodes.map( ( n ) => n.id ) }
				strategy={ verticalListSortingStrategy }
			>
				<div className="optset-canvas__list">
					{ nodes.map( ( node ) => (
						<FieldCard
							key={ node.id }
							node={ node }
							parentId={ parentId }
						/>
					) ) }
				</div>
			</SortableContext>
		</DndContext>
	);
}
