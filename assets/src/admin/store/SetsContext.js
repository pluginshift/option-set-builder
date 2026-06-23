/**
 * Option-set list state: paginated fetch, search, optimistic mutations
 * (status toggle / duplicate / delete / import) shared by SetsList.
 *
 * @package
 */

import {
	createContext,
	useContext,
	useState,
	useCallback,
	useRef,
} from '@wordpress/element';
import * as api from '../api/endpoints';
import { errorMessage } from '../api/client';

const SetsContext = createContext( {} );

/**
 * Provider owning the sets list + query state.
 *
 * @param {Object}      props          Component props.
 * @param {JSX.Element} props.children Subtree.
 * @return {JSX.Element} Provider.
 */
export function SetsProvider( { children } ) {
	const [ items, setItems ] = useState( [] );
	const [ totalPages, setTotalPages ] = useState( 1 );
	const [ page, setPage ] = useState( 1 );
	const [ search, setSearch ] = useState( '' );
	const [ status, setStatus ] = useState( 'idle' ); // idle|loading|error|ready
	const [ error, setError ] = useState( '' );
	const reqRef = useRef( 0 );

	/**
	 * Fetch a page of sets. Stale responses are discarded via a request id.
	 *
	 * @param {Object} opts { page, search } overrides.
	 * @return {Promise<void>} Resolves when state is updated.
	 */
	const load = useCallback(
		async ( opts = {} ) => {
			const nextPage = opts.page ?? page;
			const nextSearch = opts.search ?? search;
			reqRef.current += 1;
			const reqId = reqRef.current;
			setStatus( 'loading' );
			setError( '' );
			try {
				const res = await api.listSets( {
					page: nextPage,
					per_page: 12,
					search: nextSearch,
					order: 'DESC',
				} );
				if ( reqId !== reqRef.current ) {
					return;
				}
				setItems( res.items || [] );
				setTotalPages( res.total_pages || 1 );
				setPage( nextPage );
				setSearch( nextSearch );
				setStatus( 'ready' );
			} catch ( e ) {
				if ( reqId !== reqRef.current ) {
					return;
				}
				setError( errorMessage( e ) );
				setStatus( 'error' );
			}
		},
		[ page, search ]
	);

	/**
	 * Toggle publish/draft optimistically, reverting on failure.
	 *
	 * @param {Object} item The list row.
	 * @return {Promise<boolean>} Success flag.
	 */
	const toggleStatus = useCallback( async ( item ) => {
		const next = ! item.published;
		setItems( ( list ) =>
			list.map( ( i ) =>
				i.id === item.id ? { ...i, published: next } : i
			)
		);
		try {
			await api.bulkSets( {
				op: 'status',
				ids: [ item.id ],
				status: next ? 'publish' : 'draft',
			} );
			return true;
		} catch ( e ) {
			setItems( ( list ) =>
				list.map( ( i ) =>
					i.id === item.id ? { ...i, published: item.published } : i
				)
			);
			throw e;
		}
	}, [] );

	/**
	 * Remove a set.
	 *
	 * @param {number} id Set id.
	 * @return {Promise<void>} Resolves after reload.
	 */
	const remove = useCallback(
		async ( id ) => {
			await api.deleteSet( id );
			await load();
		},
		[ load ]
	);

	/**
	 * Duplicate a set.
	 *
	 * @param {number} id Set id.
	 * @return {Promise<void>} Resolves after reload.
	 */
	const duplicate = useCallback(
		async ( id ) => {
			await api.bulkSets( { op: 'duplicate', ids: [ id ] } );
			await load();
		},
		[ load ]
	);

	/**
	 * Import sets from a parsed JSON payload.
	 *
	 * @param {Object|Array} payload Parsed file contents.
	 * @return {Promise<void>} Resolves after reload.
	 */
	const importSets = useCallback(
		async ( payload ) => {
			await api.bulkSets( {
				op: 'import',
				ids: [],
				payload: JSON.stringify( payload ),
			} );
			await load( { page: 1 } );
		},
		[ load ]
	);

	const value = {
		items,
		totalPages,
		page,
		search,
		status,
		error,
		load,
		toggleStatus,
		remove,
		duplicate,
		importSets,
	};

	return (
		<SetsContext.Provider value={ value }>
			{ children }
		</SetsContext.Provider>
	);
}

/**
 * Access the sets list store.
 *
 * @return {Object} Sets store API.
 */
export function useSets() {
	return useContext( SetsContext );
}
