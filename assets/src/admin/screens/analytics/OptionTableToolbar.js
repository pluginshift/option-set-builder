/**
 * Option-table toolbar: live search, a filter popover and a CSV export.
 * Reuses the shared `optset-os-btn` system so it stays visually consistent
 * with the Option Sets screen.
 *
 * @package
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/** Client-side filters over the (all-time) per-set table. */
export const FILTERS = [
	{
		id: 'all',
		label: __( 'All options', 'option-set-builder' ),
	},
	{
		id: 'orders',
		label: __( 'With orders', 'option-set-builder' ),
	},
	{
		id: 'revenue',
		label: __( 'With revenue', 'option-set-builder' ),
	},
];

/**
 * OptionTableToolbar.
 *
 * @param {Object}   props           Component props.
 * @param {string}   props.term      Search term.
 * @param {Function} props.onSearch  (value) => void.
 * @param {string}   props.filter    Active filter id.
 * @param {Function} props.onFilter  (id) => void.
 * @param {Function} props.onExport  Export handler.
 * @param {boolean}  props.canExport Whether there is data to export.
 * @return {JSX.Element} The toolbar.
 */
export default function OptionTableToolbar( {
	term,
	onSearch,
	filter,
	onFilter,
	onExport,
	canExport,
} ) {
	const [ open, setOpen ] = useState( false );
	const wrapRef = useRef( null );

	useEffect( () => {
		if ( ! open ) {
			return undefined;
		}
		const onDoc = ( e ) => {
			if ( wrapRef.current && ! wrapRef.current.contains( e.target ) ) {
				setOpen( false );
			}
		};
		const onKey = ( e ) => e.key === 'Escape' && setOpen( false );
		document.addEventListener( 'mousedown', onDoc );
		document.addEventListener( 'keydown', onKey );
		return () => {
			document.removeEventListener( 'mousedown', onDoc );
			document.removeEventListener( 'keydown', onKey );
		};
	}, [ open ] );

	const active = FILTERS.find( ( f ) => f.id === filter ) || FILTERS[ 0 ];

	return (
		<div className="optset-an-toolbar">
			<div className="optset-os-search optset-an-search">
				<span
					className="dashicons dashicons-search optset-os-search__icon"
					aria-hidden="true"
				/>
				<input
					type="search"
					className="optset-os-search__input"
					placeholder={ __(
						'Search options…',
						'option-set-builder'
					) }
					value={ term }
					onChange={ ( e ) => onSearch( e.target.value ) }
					aria-label={ __(
						'Search options',
						'option-set-builder'
					) }
				/>
			</div>

			<div className="optset-os-filter" ref={ wrapRef }>
				<button
					type="button"
					className={ `optset-os-btn optset-os-btn--ghost${
						filter !== 'all' ? ' is-on' : ''
					}` }
					aria-haspopup="menu"
					aria-expanded={ open }
					onClick={ () => setOpen( ( v ) => ! v ) }
				>
					<span
						className="dashicons dashicons-filter"
						aria-hidden="true"
					/>
					{ __(
						'Filter',
						'option-set-builder'
					) }
					{ filter !== 'all' && (
						<span className="optset-os-filter__tag">
							{ active.label }
						</span>
					) }
				</button>
				{ open && (
					<ul className="optset-os-menu" role="menu">
						{ FILTERS.map( ( f ) => (
							<li key={ f.id } role="none">
								<button
									type="button"
									role="menuitemradio"
									aria-checked={ f.id === filter }
									className={ `optset-os-menu__item${
										f.id === filter ? ' is-active' : ''
									}` }
									onClick={ () => {
										onFilter( f.id );
										setOpen( false );
									} }
								>
									<span
										className="dashicons dashicons-yes optset-os-menu__tick"
										aria-hidden="true"
									/>
									{ f.label }
								</button>
							</li>
						) ) }
					</ul>
				) }
			</div>

			<button
				type="button"
				className="optset-os-btn optset-os-btn--ghost"
				onClick={ onExport }
				disabled={ ! canExport }
			>
				<span
					className="dashicons dashicons-download"
					aria-hidden="true"
				/>
				{ __( 'Export', 'option-set-builder' ) }
			</button>
		</div>
	);
}
