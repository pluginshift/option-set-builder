/**
 * Contextual table toolbar. Renders only while the caret sits inside a table
 * and exposes the row/column/header operations needed to build a fully dynamic
 * table — add or delete rows and columns, toggle the header row, merge/split
 * cells, and remove the whole table.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import {
	BetweenVerticalStart,
	BetweenVerticalEnd,
	BetweenHorizontalStart,
	BetweenHorizontalEnd,
	Columns3,
	Rows3,
	Heading,
	TableCellsMerge,
	TableCellsSplit,
	Trash2,
} from 'lucide-react';

/**
 * One labelled table-op button.
 *
 * @param {Object}      props          Component props.
 * @param {Function}    props.onClick  Click handler.
 * @param {string}      props.title    Tooltip / aria-label.
 * @param {boolean}     [props.danger] Style as destructive.
 * @param {JSX.Element} props.children Icon.
 * @return {JSX.Element} The button.
 */
function TBtn( { onClick, title, danger = false, children } ) {
	return (
		<button
			type="button"
			className={ `optset-rte__tbtn${ danger ? ' is-danger' : '' }` }
			onClick={ onClick }
			title={ title }
			aria-label={ title }
		>
			{ children }
		</button>
	);
}

/**
 * Table controls bar.
 *
 * @param {Object} props        Component props.
 * @param {Object} props.editor TipTap editor instance.
 * @return {JSX.Element|null} The bar, or null when not in a table.
 */
export default function TableControls( { editor } ) {
	if ( ! editor || ! editor.isActive( 'table' ) ) {
		return null;
	}
	const chain = () => editor.chain().focus();

	return (
		<div className="optset-rte__tablebar" role="toolbar">
			<span className="optset-rte__tablebar-label">
				{ __( 'Table', 'option-set-builder' ) }
			</span>

			<TBtn
				title={ __(
					'Add column before',
					'option-set-builder'
				) }
				onClick={ () => chain().addColumnBefore().run() }
			>
				<BetweenVerticalStart size={ 15 } />
			</TBtn>
			<TBtn
				title={ __(
					'Add column after',
					'option-set-builder'
				) }
				onClick={ () => chain().addColumnAfter().run() }
			>
				<BetweenVerticalEnd size={ 15 } />
			</TBtn>
			<TBtn
				title={ __(
					'Delete column',
					'option-set-builder'
				) }
				onClick={ () => chain().deleteColumn().run() }
			>
				<Columns3 size={ 15 } />
			</TBtn>

			<span className="optset-rte__sep" aria-hidden="true" />

			<TBtn
				title={ __(
					'Add row above',
					'option-set-builder'
				) }
				onClick={ () => chain().addRowBefore().run() }
			>
				<BetweenHorizontalStart size={ 15 } />
			</TBtn>
			<TBtn
				title={ __(
					'Add row below',
					'option-set-builder'
				) }
				onClick={ () => chain().addRowAfter().run() }
			>
				<BetweenHorizontalEnd size={ 15 } />
			</TBtn>
			<TBtn
				title={ __(
					'Delete row',
					'option-set-builder'
				) }
				onClick={ () => chain().deleteRow().run() }
			>
				<Rows3 size={ 15 } />
			</TBtn>

			<span className="optset-rte__sep" aria-hidden="true" />

			<TBtn
				title={ __(
					'Toggle header row',
					'option-set-builder'
				) }
				onClick={ () => chain().toggleHeaderRow().run() }
			>
				<Heading size={ 15 } />
			</TBtn>
			<TBtn
				title={ __(
					'Merge cells',
					'option-set-builder'
				) }
				onClick={ () => chain().mergeCells().run() }
			>
				<TableCellsMerge size={ 15 } />
			</TBtn>
			<TBtn
				title={ __(
					'Split cell',
					'option-set-builder'
				) }
				onClick={ () => chain().splitCell().run() }
			>
				<TableCellsSplit size={ 15 } />
			</TBtn>

			<span className="optset-rte__sep" aria-hidden="true" />

			<TBtn
				danger
				title={ __(
					'Delete table',
					'option-set-builder'
				) }
				onClick={ () => chain().deleteTable().run() }
			>
				<Trash2 size={ 15 } />
			</TBtn>
		</div>
	);
}
