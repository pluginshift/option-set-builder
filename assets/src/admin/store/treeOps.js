/**
 * Pure helpers for manipulating the field tree (ARCHITECTURE §6).
 *
 * The tree is an ordered array of nodes; only `section` nodes carry a
 * `children` array. Every helper is non-mutating and returns a fresh tree
 * so the reducer stays predictable and undo-friendly.
 *
 * @package
 */

import { getType, newFieldId, makeChoice } from '../fields/registry';

/**
 * Deep clone a node (and its subtree), assigning fresh ids/uids so a
 * duplicated branch never collides with the original.
 *
 * @param {Object} node     Source node.
 * @param {string} parentId Parent id for the clone.
 * @return {Object} Cloned node.
 */
export function cloneNode( node, parentId = '' ) {
	const id = newFieldId();
	return {
		...JSON.parse( JSON.stringify( node ) ),
		id,
		parent: parentId,
		choices: ( node.choices || [] ).map( ( c ) => makeChoice( { ...c } ) ),
		children: ( node.children || [] ).map( ( child ) =>
			cloneNode( child, id )
		),
	};
}

/**
 * Create a new node for a given type.
 *
 * @param {string} type     Field type slug.
 * @param {string} parentId Parent section id ('' = top level).
 * @return {Object} A fully-formed §6 node.
 */
export function createNode( type, parentId = '' ) {
	const def = getType( type );
	const node = {
		...def.defaultNode(),
		id: newFieldId(),
		parent: parentId,
	};
	// Seed the title with the field's name so a freshly added field reads as
	// "Text" / "Phone" / "Dropdown" instead of "Untitled field". Bare spacers /
	// dividers carry no title, so leave those empty.
	if ( ! node.label && ! [ 'divider', 'spacer' ].includes( type ) ) {
		node.label = def.label;
	}
	return node;
}

/**
 * Recursively map every node, returning a new tree.
 *
 * @param {Array}    tree Field tree.
 * @param {Function} fn   (node) => node.
 * @return {Array} New tree.
 */
export function mapTree( tree, fn ) {
	return tree.map( ( node ) => {
		const mapped = fn( node );
		if ( mapped.children && mapped.children.length ) {
			return { ...mapped, children: mapTree( mapped.children, fn ) };
		}
		return mapped;
	} );
}

/**
 * Find a node by id anywhere in the tree.
 *
 * @param {Array}  tree Field tree.
 * @param {string} id   Field id.
 * @return {Object|null} The node or null.
 */
export function findNode( tree, id ) {
	for ( const node of tree ) {
		if ( node.id === id ) {
			return node;
		}
		if ( node.children && node.children.length ) {
			const hit = findNode( node.children, id );
			if ( hit ) {
				return hit;
			}
		}
	}
	return null;
}

/**
 * Remove a node by id, returning [newTree, removedNode].
 *
 * @param {Array}  tree Field tree.
 * @param {string} id   Field id.
 * @return {[Array, Object|null]} New tree and the removed node.
 */
export function removeNode( tree, id ) {
	let removed = null;
	const walk = ( nodes ) => {
		const out = [];
		for ( const node of nodes ) {
			if ( node.id === id ) {
				removed = node;
				continue;
			}
			if ( node.children && node.children.length ) {
				out.push( { ...node, children: walk( node.children ) } );
			} else {
				out.push( node );
			}
		}
		return out;
	};
	const next = walk( tree );
	return [ next, removed ];
}

/**
 * Insert a node relative to a target (or append to a section / root).
 *
 * @param {Array}  tree     Field tree.
 * @param {Object} node     Node to insert (its `parent` is rewritten).
 * @param {Object} location { parentId, index } — index defaults to end.
 * @return {Array} New tree.
 */
export function insertNode( tree, node, location = {} ) {
	const parentId = location.parentId || '';
	const placed = { ...node, parent: parentId };

	if ( ! parentId ) {
		const next = [ ...tree ];
		const idx = location.index === undefined ? next.length : location.index;
		next.splice( idx, 0, placed );
		return next;
	}

	return mapTree( tree, ( n ) => {
		if ( n.id !== parentId ) {
			return n;
		}
		const children = [ ...( n.children || [] ) ];
		const idx =
			location.index === undefined ? children.length : location.index;
		children.splice( idx, 0, placed );
		return { ...n, children };
	} );
}

/**
 * Flatten the tree to a depth-first list of {id,type,label,depth}, useful
 * for the logic field picker (a field can reference any prior field).
 *
 * @param {Array}  tree  Field tree.
 * @param {number} depth Current depth (internal).
 * @return {Array} Flat descriptor list.
 */
export function flatten( tree, depth = 0 ) {
	const out = [];
	for ( const node of tree ) {
		out.push( {
			id: node.id,
			type: node.type,
			label: node.label,
			depth,
		} );
		if ( node.children && node.children.length ) {
			out.push( ...flatten( node.children, depth + 1 ) );
		}
	}
	return out;
}
