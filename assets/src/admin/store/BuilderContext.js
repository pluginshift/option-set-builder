/**
 * Builder state for a single option set: the field tree (managed by a
 * reducer), the selected field, the set title/status, dirty tracking, and
 * load/save side-effects. This is the heart of the builder screen.
 *
 * The reducer owns every structural mutation so the canvas, palette and
 * inspector only ever dispatch intent — never mutate the tree directly.
 *
 * @package
 */

import {
	createContext,
	useContext,
	useReducer,
	useCallback,
	useEffect,
	useState,
} from '@wordpress/element';
import * as api from '../api/endpoints';
import { errorMessage } from '../api/client';
import {
	createNode,
	cloneNode,
	removeNode,
	insertNode,
	findNode,
	mapTree,
} from './treeOps';

const BuilderContext = createContext( {} );

/** A fresh, empty assignment (matches the `_optset_assignment` shape, §4). */
const emptyAssignment = () => ( {
	scope: 'none',
	include: [],
	exclude: [],
} );

/** Initial reducer state. */
const initialState = {
	id: 'new',
	title: '',
	status: 'draft',
	tree: [],
	assignment: emptyAssignment(),
	selectedId: null,
	dirty: false,
};

/**
 * Whether an assignment actually targets something (so the set may publish).
 * "All products" counts; an empty products/category/tag/brand list or the
 * "none" scope does not.
 *
 * @param {Object} a Assignment { scope, include }.
 * @return {boolean} True when at least one product/term (or "all") is targeted.
 */
export function hasAssignment( a ) {
	if ( ! a || ! a.scope || a.scope === 'none' ) {
		return false;
	}
	if ( a.scope === 'all' ) {
		return true;
	}
	return Array.isArray( a.include ) && a.include.length > 0;
}

/**
 * Builder reducer — every structural field-tree operation lives here.
 *
 * Actions:
 *  HYDRATE      replace state from a fetched set (+ its assignment)
 *  SET_META     patch title/status
 *  SET_ASSIGNMENT replace the assignment ({ scope, include, exclude })
 *  ADD          add a node ({ fieldType, parentId, index })
 *  UPDATE       shallow-merge a patch into a node ({ id, patch })
 *  REMOVE       delete a node ({ id })
 *  DUPLICATE    clone a node next to itself ({ id })
 *  MOVE         relocate a node ({ id, parentId, index })
 *  SELECT       set the selected field ({ id })
 *  MARK_SAVED   clear the dirty flag + adopt the persisted id
 *
 * @param {Object} state  Current state.
 * @param {Object} action Dispatched action.
 * @return {Object} Next state.
 */
function reducer( state, action ) {
	switch ( action.type ) {
		case 'HYDRATE':
			return {
				id: action.set.id,
				title: action.set.title || '',
				status: action.set.status || 'draft',
				tree: Array.isArray( action.set.fields )
					? action.set.fields
					: [],
				assignment: action.assignment || emptyAssignment(),
				selectedId: null,
				dirty: false,
			};

		case 'SET_META':
			return { ...state, ...action.patch, dirty: true };

		case 'SET_ASSIGNMENT':
			return {
				...state,
				assignment: action.assignment,
				dirty: true,
			};

		case 'ADD': {
			const node = createNode( action.fieldType, action.parentId || '' );
			const tree = insertNode( state.tree, node, {
				parentId: action.parentId || '',
				index: action.index,
			} );
			return {
				...state,
				tree,
				selectedId: node.id,
				dirty: true,
			};
		}

		case 'UPDATE': {
			const tree = mapTree( state.tree, ( n ) =>
				n.id === action.id ? { ...n, ...action.patch } : n
			);
			return { ...state, tree, dirty: true };
		}

		case 'REMOVE': {
			const [ tree ] = removeNode( state.tree, action.id );
			return {
				...state,
				tree,
				selectedId:
					state.selectedId === action.id ? null : state.selectedId,
				dirty: true,
			};
		}

		case 'DUPLICATE': {
			const original = findNode( state.tree, action.id );
			if ( ! original ) {
				return state;
			}
			const copy = cloneNode( original, original.parent );
			// Insert right after the original within the same parent.
			const parentNode = original.parent
				? findNode( state.tree, original.parent )
				: null;
			const siblings =
				parentNode && parentNode.children
					? parentNode.children
					: state.tree;
			const idx = siblings.findIndex( ( n ) => n.id === action.id ) + 1;
			const tree = insertNode( state.tree, copy, {
				parentId: original.parent,
				index: idx,
			} );
			return {
				...state,
				tree,
				selectedId: copy.id,
				dirty: true,
			};
		}

		case 'MOVE': {
			const [ without, moved ] = removeNode( state.tree, action.id );
			if ( ! moved ) {
				return state;
			}
			const tree = insertNode( without, moved, {
				parentId: action.parentId || '',
				index: action.index,
			} );
			return { ...state, tree, dirty: true };
		}

		case 'SELECT':
			return { ...state, selectedId: action.id };

		case 'MARK_SAVED':
			return {
				...state,
				id: action.id ?? state.id,
				dirty: false,
			};

		default:
			return state;
	}
}

/**
 * Provider — loads the set behind `setId` and exposes the reducer + save.
 *
 * @param {Object}      props          Component props.
 * @param {string}      props.setId    Set id from the route ("new" allowed).
 * @param {JSX.Element} props.children Subtree.
 * @return {JSX.Element} Provider.
 */
export function BuilderProvider( { setId, children } ) {
	const [ state, dispatch ] = useReducer( reducer, initialState );
	const [ loading, setLoading ] = useState( true );
	const [ loadError, setLoadError ] = useState( '' );
	const [ saving, setSaving ] = useState( false );

	useEffect( () => {
		let cancelled = false;
		setLoading( true );
		setLoadError( '' );
		const isNew = ! setId || setId === 'new';
		// Load the set and (for saved sets) its stored assignment together so
		// the builder hydrates with everything the publish guard needs.
		Promise.all( [
			api.getSet( setId ),
			isNew
				? Promise.resolve( null )
				: api.getAssignment( setId ).catch( () => null ),
		] )
			.then( ( [ setRes, assignRes ] ) => {
				if ( cancelled ) {
					return;
				}
				const assignment =
					assignRes && assignRes.assignment
						? {
								scope: assignRes.assignment.scope || 'none',
								include: assignRes.include || [],
								exclude: assignRes.exclude || [],
						  }
						: emptyAssignment();
				dispatch( {
					type: 'HYDRATE',
					set: setRes.set,
					assignment,
				} );
			} )
			.catch( ( e ) => {
				if ( ! cancelled ) {
					setLoadError( errorMessage( e ) );
				}
			} )
			.finally( () => {
				if ( ! cancelled ) {
					setLoading( false );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ setId ] );

	/**
	 * Persist the full field tree (server derives the required map).
	 *
	 * @return {Promise<number>} The persisted set id.
	 */
	const save = useCallback(
		async ( overrides = {} ) => {
			setSaving( true );
			try {
				const status = overrides.status ?? state.status;
				const res = await api.saveSet( {
					id: state.id,
					title:
						state.title ||
						/* translators: default option set title */
						'Untitled',
					status,
					fields: JSON.stringify( state.tree ),
					css: '',
				} );
				// Persist the assignment against the (possibly new) set id so the
				// builder and storefront stay in sync from a single Save.
				const savedId = res.id;
				const a = state.assignment || emptyAssignment();
				await api.saveAssignment( {
					set_id: savedId,
					scope: a.scope || 'none',
					include: ( a.include || [] ).map( ( i ) => i.id ),
					exclude: ( a.exclude || [] ).map( ( i ) => i.id ),
					product_image: JSON.stringify( [] ),
				} );
				dispatch( { type: 'MARK_SAVED', id: savedId } );
				return savedId;
			} finally {
				setSaving( false );
			}
		},
		[ state.id, state.title, state.status, state.tree, state.assignment ]
	);

	const selected = state.selectedId
		? findNode( state.tree, state.selectedId )
		: null;

	const value = {
		...state,
		selected,
		loading,
		loadError,
		saving,
		dispatch,
		save,
	};

	return (
		<BuilderContext.Provider value={ value }>
			{ children }
		</BuilderContext.Provider>
	);
}

/**
 * Access the builder store.
 *
 * @return {Object} Builder store API.
 */
export function useBuilder() {
	return useContext( BuilderContext );
}
