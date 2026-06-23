/**
 * A single option-set table row.
 *
 * The list API returns id / title / published / fields-count only, so the
 * Category and Products cells render an honest neutral placeholder rather
 * than fabricated data — the layout still matches the design 1:1.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import useId from '../../app/useId';
import { Avatar, Badge, ProgressBar } from '../../components';

/**
 * OptionSetRow.
 *
 * @param {Object}   props                Component props.
 * @param {Object}   props.item           List row { id, title, published, fields }.
 * @param {boolean}  props.selected       Whether the row is selected.
 * @param {boolean}  props.busy           Whether a mutation is in flight.
 * @param {Function} props.onSelect       (id) => void.
 * @param {Function} props.onToggleStatus (item) => void.
 * @param {Function} props.onDuplicate    (id) => void.
 * @param {Function} props.onDelete       (id) => void.
 * @param {Function} props.onOpen         (id) => void.
 * @return {JSX.Element} The row.
 */
export default function OptionSetRow( {
	item,
	selected,
	busy,
	onSelect,
	onToggleStatus,
	onDuplicate,
	onDelete,
	onOpen,
} ) {
	const switchId = useId( 'optset-os-switch' );
	const title =
		item.title ||
		__( '(untitled)', 'option-set-builder' );

	/**
	 * Action icon button.
	 *
	 * @param {Object}   cfg          Button config.
	 * @param {string}   cfg.icon     Dashicon slug.
	 * @param {string}   cfg.label    Accessible label.
	 * @param {Function} cfg.onClick  Click handler.
	 * @param {boolean}  [cfg.danger] Destructive styling.
	 * @return {JSX.Element} The button.
	 */
	const action = ( { icon, label, onClick, danger } ) => (
		<button
			type="button"
			className={ `optset-os-iconbtn${
				danger ? ' optset-os-iconbtn--danger' : ''
			}` }
			title={ label }
			aria-label={ label }
			onClick={ onClick }
			disabled={ busy }
		>
			<span
				className={ `dashicons dashicons-${ icon }` }
				aria-hidden="true"
			/>
		</button>
	);

	return (
		<tr
			className={ `optset-os-row${ selected ? ' is-selected' : '' }${
				item.published ? '' : ' is-draft'
			}` }
		>
			<td className="optset-os-cell optset-os-cell--check">
				<input
					type="checkbox"
					className="optset-os-check"
					checked={ selected }
					onChange={ () => onSelect( item.id ) }
					aria-label={ sprintf(
						/* translators: %s: option set title */
						__(
							'Select %s',
							'option-set-builder'
						),
						title
					) }
				/>
			</td>

			<td
				className="optset-os-cell optset-os-cell--id"
				data-label={ __(
					'ID',
					'option-set-builder'
				) }
			>
				<span className="optset-os-id">#{ item.id }</span>
			</td>

			<td
				className="optset-os-cell optset-os-cell--name"
				data-label={ __(
					'Option Name',
					'option-set-builder'
				) }
			>
				<button
					type="button"
					className="optset-os-name"
					onClick={ () => onOpen( item.id ) }
				>
					<Avatar label={ title } seed={ item.id } />
					<span className="optset-os-name__text">{ title }</span>
				</button>
			</td>

			<td
				className="optset-os-cell optset-os-cell--status"
				data-label={ __(
					'Status',
					'option-set-builder'
				) }
			>
				<span className="optset-os-switch">
					<input
						id={ switchId }
						type="checkbox"
						className="optset-os-switch__input"
						checked={ !! item.published }
						disabled={ busy }
						onChange={ () => onToggleStatus( item ) }
					/>
					<label
						className="optset-os-switch__track"
						htmlFor={ switchId }
					>
						<span className="optset-os-switch__thumb" />
						<span className="screen-reader-text">
							{ sprintf(
								/* translators: %s: option set title */
								__(
									'Toggle status for %s',
									'option-set-builder'
								),
								title
							) }
						</span>
					</label>
					<span className="optset-os-switch__label">
						{ item.published
							? __(
									'Active',
									'option-set-builder'
							  )
							: __(
									'Inactive',
									'option-set-builder'
							  ) }
					</span>
				</span>
			</td>

			<td
				className="optset-os-cell optset-os-cell--category"
				data-label={ __(
					'Category',
					'option-set-builder'
				) }
			>
				<Badge variant="muted">—</Badge>
			</td>

			<td
				className="optset-os-cell optset-os-cell--products"
				data-label={ __(
					'Products',
					'option-set-builder'
				) }
			>
				<ProgressBar value={ null } />
			</td>

			<td
				className="optset-os-cell optset-os-cell--options"
				data-label={ __(
					'Options',
					'option-set-builder'
				) }
			>
				<span className="optset-os-count">
					<span
						className="dashicons dashicons-screenoptions"
						aria-hidden="true"
					/>
					{ item.fields || 0 }
				</span>
			</td>

			<td
				className="optset-os-cell optset-os-cell--actions"
				data-label={ __(
					'Actions',
					'option-set-builder'
				) }
			>
				<div className="optset-os-actions">
					{ action( {
						icon: 'visibility',
						label: __(
							'Open option set',
							'option-set-builder'
						),
						onClick: () => onOpen( item.id ),
					} ) }
					{ action( {
						icon: 'edit',
						label: __(
							'Edit option set',
							'option-set-builder'
						),
						onClick: () => onOpen( item.id ),
					} ) }
					{ action( {
						icon: 'admin-page',
						label: __(
							'Duplicate option set',
							'option-set-builder'
						),
						onClick: () => onDuplicate( item.id ),
					} ) }
					{ action( {
						icon: 'trash',
						label: __(
							'Delete option set',
							'option-set-builder'
						),
						onClick: () => onDelete( item.id ),
						danger: true,
					} ) }
				</div>
			</td>
		</tr>
	);
}
