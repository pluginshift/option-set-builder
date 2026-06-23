/**
 * Option Sets screen — modern data-table layout with summary stats,
 * search, status filter, client-side sort, row selection + bulk actions,
 * import / export, pagination and a delete confirmation.
 *
 * Consumes SetsContext; presentational concerns live in sibling
 * components (Stats / Toolbar / Table / Row) for a clean, scalable tree.
 *
 * @package
 */

import {
	useEffect,
	useState,
	useRef,
	useCallback,
	useMemo,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useSets } from '../../store/SetsContext';
import { useToast } from '../../store/ToastContext';
import { navigate } from '../../app/router';
import * as api from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { ConfirmDialog, Pagination, PageFrame } from '../../components';
import OptionSetStats from './OptionSetStats';
import OptionSetToolbar from './OptionSetToolbar';
import OptionSetTable from './OptionSetTable';

const PER_PAGE = 12;

/**
 * Trigger a browser download of a JSON payload.
 *
 * @param {string} name Filename.
 * @param {*}      data Serializable payload.
 * @return {void}
 */
function downloadJSON( name, data ) {
	const blob = new window.Blob( [ JSON.stringify( data, null, 2 ) ], {
		type: 'application/json',
	} );
	const url = window.URL.createObjectURL( blob );
	const a = document.createElement( 'a' );
	a.href = url;
	a.download = name;
	a.click();
	window.URL.revokeObjectURL( url );
}

/**
 * Stable comparator for client-side sorting of the loaded page.
 *
 * @param {string} key Field key (id|title|published|fields).
 * @param {string} dir asc|desc.
 * @return {Function} Array.prototype.sort comparator.
 */
function comparator( key, dir ) {
	const sign = dir === 'asc' ? 1 : -1;
	return ( a, b ) => {
		let av = a[ key ];
		let bv = b[ key ];
		if ( key === 'title' ) {
			av = String( av || '' ).toLowerCase();
			bv = String( bv || '' ).toLowerCase();
			return av.localeCompare( bv ) * sign;
		}
		av = Number( av ) || 0;
		bv = Number( bv ) || 0;
		return ( av - bv ) * sign;
	};
}

/**
 * OptionSet — the Option Sets management screen.
 *
 * @return {JSX.Element} The screen body.
 */
export default function OptionSet() {
	const sets = useSets();
	const { notify } = useToast();
	const [ term, setTerm ] = useState( '' );
	const [ selected, setSelected ] = useState( [] );
	const [ confirm, setConfirm ] = useState( null );
	const [ filter, setFilter ] = useState( 'all' );
	const [ sort, setSort ] = useState( { key: 'id', dir: 'desc' } );
	const [ busyId, setBusyId ] = useState( null );
	const fileRef = useRef( null );
	const searchTimer = useRef( null );

	useEffect( () => {
		sets.load( { page: 1 } );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	/* Derived: filtered + sorted view of the loaded page. */
	const visible = useMemo( () => {
		let rows = sets.items || [];
		if ( filter === 'active' ) {
			rows = rows.filter( ( r ) => r.published );
		} else if ( filter === 'inactive' ) {
			rows = rows.filter( ( r ) => ! r.published );
		}
		return [ ...rows ].sort( comparator( sort.key, sort.dir ) );
	}, [ sets.items, filter, sort ] );

	const stats = useMemo( () => {
		const rows = sets.items || [];
		const active = rows.filter( ( r ) => r.published ).length;
		return {
			total: rows.length,
			active,
			inactive: rows.length - active,
			fields: rows.reduce(
				( sum, r ) => sum + ( Number( r.fields ) || 0 ),
				0
			),
		};
	}, [ sets.items ] );

	const onSearch = useCallback(
		( v ) => {
			setTerm( v );
			setSelected( [] );
			if ( searchTimer.current ) {
				window.clearTimeout( searchTimer.current );
			}
			searchTimer.current = window.setTimeout(
				() => sets.load( { page: 1, search: v } ),
				350
			);
		},
		[ sets ]
	);

	const onSort = useCallback( ( key ) => {
		setSort( ( s ) =>
			s.key === key
				? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
				: { key, dir: 'asc' }
		);
	}, [] );

	const onSelect = useCallback(
		( id ) =>
			setSelected( ( s ) =>
				s.includes( id ) ? s.filter( ( x ) => x !== id ) : [ ...s, id ]
			),
		[]
	);

	const onSelectAll = useCallback( () => {
		setSelected( ( s ) =>
			s.length === visible.length ? [] : visible.map( ( r ) => r.id )
		);
	}, [ visible ] );

	const goToPage = useCallback(
		( page ) => {
			setSelected( [] );
			sets.load( { page } );
		},
		[ sets ]
	);

	/**
	 * Run an optimistic single-row mutation with a busy lock.
	 *
	 * @param {number}   id    Row id.
	 * @param {Function} fn    Async mutation.
	 * @param {string}   okMsg Success toast.
	 * @return {Promise<void>} Resolves when settled.
	 */
	const mutate = async ( id, fn, okMsg ) => {
		setBusyId( id );
		try {
			await fn();
			if ( okMsg ) {
				notify( okMsg, 'success' );
			}
		} catch ( e ) {
			notify( errorMessage( e ), 'error' );
		} finally {
			setBusyId( null );
		}
	};

	const onToggleStatus = ( item ) =>
		mutate( item.id, () => sets.toggleStatus( item ) );

	const onDuplicate = ( id ) =>
		mutate(
			id,
			() => sets.duplicate( id ),
			__(
				'Option set duplicated.',
				'option-set-builder'
			)
		);

	/**
	 * Export the current selection (or the whole visible page) as JSON.
	 *
	 * @return {Promise<void>} Resolves after the download starts.
	 */
	const onExport = async () => {
		const ids = selected.length ? selected : visible.map( ( r ) => r.id );
		if ( ! ids.length ) {
			return;
		}
		try {
			const results = await Promise.all(
				ids.map( ( id ) => api.getSet( id ) )
			);
			downloadJSON( 'option-sets.json', {
				items: results.map( ( r ) => r.set ),
			} );
			notify(
				sprintf(
					/* translators: %d: number of sets exported */
					__(
						'Exported %d option set(s).',
						'option-set-builder'
					),
					ids.length
				),
				'success'
			);
		} catch ( e ) {
			notify( errorMessage( e ), 'error' );
		}
	};

	/**
	 * Read a chosen JSON file and import its sets.
	 *
	 * @param {Event} e File input change.
	 * @return {void}
	 */
	const onImportFile = ( e ) => {
		const file = e.target.files && e.target.files[ 0 ];
		if ( ! file ) {
			return;
		}
		const reader = new window.FileReader();
		reader.onload = async () => {
			try {
				await sets.importSets( JSON.parse( reader.result ) );
				notify(
					__(
						'Import complete.',
						'option-set-builder'
					),
					'success'
				);
			} catch ( err ) {
				notify(
					err instanceof SyntaxError
						? __(
								'Invalid JSON file.',
								'option-set-builder'
						  )
						: errorMessage( err ),
					'error'
				);
			}
		};
		reader.readAsText( file );
		e.target.value = '';
	};

	/**
	 * Run a bulk operation over the current selection.
	 *
	 * @param {string} op status-publish|status-draft|delete|duplicate.
	 * @return {Promise<void>} Resolves after reload.
	 */
	const runBulk = async ( op ) => {
		if ( ! selected.length ) {
			return;
		}
		try {
			if ( op === 'delete' ) {
				await api.bulkSets( { op: 'delete', ids: selected } );
			} else if ( op === 'duplicate' ) {
				await api.bulkSets( { op: 'duplicate', ids: selected } );
			} else {
				await api.bulkSets( {
					op: 'status',
					ids: selected,
					status: op === 'status-publish' ? 'publish' : 'draft',
				} );
			}
			setSelected( [] );
			await sets.load();
			notify(
				__(
					'Bulk action applied.',
					'option-set-builder'
				),
				'success'
			);
		} catch ( e ) {
			notify( errorMessage( e ), 'error' );
		}
	};

	const rangeStart =
		visible.length === 0 ? 0 : ( sets.page - 1 ) * PER_PAGE + 1;
	const rangeEnd = ( sets.page - 1 ) * PER_PAGE + visible.length;

	return (
		<>
			<PageFrame
				// title={ __(
				// 	'Product Options',
				// 	'option-set-builder'
				// ) }
				// subtitle={ __(
				// 	'Manage your product customization options.',
				// 	'option-set-builder'
				// ) }
				toolbar={
					<OptionSetToolbar
						term={ term }
						onSearch={ onSearch }
						filter={ filter }
						onFilter={ setFilter }
						onExport={ onExport }
						onImport={ () =>
							fileRef.current && fileRef.current.click()
						}
					/>
				}
			>
				<OptionSetStats stats={ stats } />

				<input
					type="file"
					accept="application/json,.json"
					ref={ fileRef }
					className="optset-visually-hidden"
					onChange={ onImportFile }
					tabIndex={ -1 }
				/>

				<section className="optset-os-card">
					{ selected.length > 0 && (
						<div className="optset-os-bulkbar">
							<span className="optset-os-bulkbar__count">
								{ sprintf(
									/* translators: %d: number selected */
									__(
										'%d selected',
										'option-set-builder'
									),
									selected.length
								) }
							</span>
							<div className="optset-os-bulkbar__actions">
								<button
									type="button"
									className="optset-os-btn optset-os-btn--ghost"
									onClick={ () =>
										runBulk( 'status-publish' )
									}
								>
									{ __(
										'Activate',
										'option-set-builder'
									) }
								</button>
								<button
									type="button"
									className="optset-os-btn optset-os-btn--ghost"
									onClick={ () => runBulk( 'status-draft' ) }
								>
									{ __(
										'Deactivate',
										'option-set-builder'
									) }
								</button>
								<button
									type="button"
									className="optset-os-btn optset-os-btn--ghost"
									onClick={ () => runBulk( 'duplicate' ) }
								>
									{ __(
										'Duplicate',
										'option-set-builder'
									) }
								</button>
								<button
									type="button"
									className="optset-os-btn optset-os-btn--danger"
									onClick={ () =>
										setConfirm( { bulk: true } )
									}
								>
									{ __(
										'Delete',
										'option-set-builder'
									) }
								</button>
								<button
									type="button"
									className="optset-os-btn optset-os-btn--link"
									onClick={ () => setSelected( [] ) }
								>
									{ __(
										'Clear',
										'option-set-builder'
									) }
								</button>
							</div>
						</div>
					) }

					<OptionSetTable
						status={ sets.status }
						error={ sets.error }
						items={ visible }
						sort={ sort }
						onSort={ onSort }
						selected={ selected }
						onSelect={ onSelect }
						onSelectAll={ onSelectAll }
						onToggleStatus={ onToggleStatus }
						onDuplicate={ onDuplicate }
						onDelete={ ( id ) => setConfirm( { id } ) }
						onOpen={ ( id ) => navigate( `/set/${ id }` ) }
						onCreate={ () => navigate( '/set/new' ) }
						busyId={ busyId }
					/>

					{ sets.status === 'ready' && visible.length > 0 && (
						<footer className="optset-os-foot">
							<span className="optset-os-foot__info">
								{ sprintf(
									/* translators: 1: from 2: to 3: page 4: total pages */
									__(
										'Showing %1$d to %2$d (page %3$d of %4$d)',
										'option-set-builder'
									),
									rangeStart,
									rangeEnd,
									sets.page,
									sets.totalPages
								) }
							</span>
							<Pagination
								page={ sets.page }
								total={ sets.totalPages }
								onChange={ goToPage }
							/>
						</footer>
					) }
				</section>
			</PageFrame>

			{ confirm && (
				<ConfirmDialog
					title={
						confirm.bulk
							? __(
									'Delete selected option sets',
									'option-set-builder'
							  )
							: __(
									'Delete option set',
									'option-set-builder'
							  )
					}
					message={ __(
						'This permanently removes the option set(s) and detaches them from all products. Continue?',
						'option-set-builder'
					) }
					confirmText={ __(
						'Delete',
						'option-set-builder'
					) }
					onCancel={ () => setConfirm( null ) }
					onConfirm={ async () => {
						try {
							if ( confirm.bulk ) {
								await runBulk( 'delete' );
							} else {
								await sets.remove( confirm.id );
								notify(
									__(
										'Option set deleted.',
										'option-set-builder'
									),
									'success'
								);
							}
						} catch ( e ) {
							notify( errorMessage( e ), 'error' );
						} finally {
							setConfirm( null );
						}
					} }
				/>
			) }
		</>
	);
}
