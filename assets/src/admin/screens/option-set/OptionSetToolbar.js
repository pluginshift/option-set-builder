/**
 * Search + status filter + export / import / new-set actions.
 *
 * @package
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/** Status filter choices (client-side over the loaded page). */
const FILTERS = [
	{
		id: 'all',
		label: __( 'All', 'option-set-builder' ),
	},
	{
		id: 'active',
		label: __( 'Active', 'option-set-builder' ),
	},
	{
		id: 'inactive',
		label: __( 'Inactive', 'option-set-builder' ),
	},
];

/**
 * OptionSetToolbar.
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.term     Search term.
 * @param {Function} props.onSearch (value) => void.
 * @param {string}   props.filter   Active status filter id.
 * @param {Function} props.onFilter (id) => void.
 * @param {Function} props.onExport Export handler.
 * @param {Function} props.onImport Import handler (opens file picker).
 * @return {JSX.Element} The toolbar.
 */
export default function OptionSetToolbar( {
	term,
	onSearch,
	filter,
	onFilter,
	onExport,
	onImport,
} ) {
	const [ open, setOpen ] = useState( false );
	const filterRef = useRef( null );

	useEffect( () => {
		if ( ! open ) {
			return undefined;
		}
		const onDoc = ( e ) => {
			if (
				filterRef.current &&
				! filterRef.current.contains( e.target )
			) {
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

	const activeFilter =
		FILTERS.find( ( f ) => f.id === filter ) || FILTERS[ 0 ];

	return (
		<div className="optset-os-toolbar">
			<div className="optset-os-search">
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
						'Search option sets',
						'option-set-builder'
					) }
				/>
			</div>

			<div className="optset-os-filter" ref={ filterRef }>
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
							{ activeFilter.label }
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

			<div className="optset-os-toolbar__spacer" />

			<button
				type="button"
				className="optset-os-btn optset-os-btn--ghost"
				onClick={ onExport }
			>
				<span
					className="dashicons dashicons-download"
					aria-hidden="true"
				/>
				{ __( 'Export', 'option-set-builder' ) }
			</button>
			<button
				type="button"
				className="optset-os-btn optset-os-btn--ghost"
				onClick={ onImport }
			>
				<span
					className="dashicons dashicons-upload"
					aria-hidden="true"
				/>
				{ __( 'Import', 'option-set-builder' ) }
			</button>
		</div>
	);
}
