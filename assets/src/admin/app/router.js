/**
 * Tiny dependency-free hash router.
 *
 * Parses `location.hash` into `{ path, params, query }` and re-renders on
 * `hashchange`. Route patterns use `:name` segments. This keeps the admin
 * SPA self-contained — no react-router dependency.
 *
 * @package
 */

import { useState, useEffect, useCallback } from '@wordpress/element';

/** Ordered route table. First match wins. */
const ROUTES = [
	{ name: 'dashboard', pattern: '/' },
	{ name: 'sets', pattern: '/sets' },
	{ name: 'builder', pattern: '/set/:id' },
	{ name: 'assignment', pattern: '/set/:id/assignment' },
	{ name: 'settings', pattern: '/settings' },
	{ name: 'analytics', pattern: '/analytics' },
];

/**
 * Split a hash into its path and query string.
 *
 * @param {string} hash The raw `location.hash` value.
 * @return {{path:string, query:Object}} Parsed pieces.
 */
function parseHash( hash ) {
	let raw = ( hash || '' ).replace( /^#/, '' );
	if ( raw === '' ) {
		raw = '/';
	}
	const [ pathPart, queryPart = '' ] = raw.split( '?' );
	const query = {};
	queryPart
		.split( '&' )
		.filter( Boolean )
		.forEach( ( pair ) => {
			const [ k, v = '' ] = pair.split( '=' );
			query[ decodeURIComponent( k ) ] = decodeURIComponent( v );
		} );
	return { path: pathPart || '/', query };
}

/**
 * Match a concrete path against the route table.
 *
 * @param {string} path The hash path (e.g. `/set/12/assignment`).
 * @return {{name:string, params:Object}} Matched route + path params.
 */
function matchRoute( path ) {
	const clean = path.replace( /\/+$/, '' ) || '/';
	const segs = clean === '/' ? [ '' ] : clean.split( '/' ).slice( 1 );

	for ( const route of ROUTES ) {
		const rClean = route.pattern.replace( /\/+$/, '' ) || '/';
		const rSegs = rClean === '/' ? [ '' ] : rClean.split( '/' ).slice( 1 );
		if ( rSegs.length !== segs.length ) {
			continue;
		}
		const params = {};
		let ok = true;
		for ( let i = 0; i < rSegs.length; i++ ) {
			if ( rSegs[ i ].startsWith( ':' ) ) {
				params[ rSegs[ i ].slice( 1 ) ] = segs[ i ];
			} else if ( rSegs[ i ] !== segs[ i ] ) {
				ok = false;
				break;
			}
		}
		if ( ok ) {
			return { name: route.name, params };
		}
	}
	return { name: 'dashboard', params: {} };
}

/**
 * Programmatic navigation.
 *
 * @param {string} to Path beginning with `/` (hash is added).
 * @return {void}
 */
export function navigate( to ) {
	const target = to.startsWith( '#' ) ? to : `#${ to }`;
	if ( window.location.hash === target ) {
		// Force a re-render even when navigating to the same hash.
		window.dispatchEvent( new window.HashChangeEvent( 'hashchange' ) );
		return;
	}
	window.location.hash = target;
}

/**
 * Router hook: returns the current route descriptor and re-renders on change.
 *
 * @return {{name:string, params:Object, query:Object, path:string,
 *           navigate:Function}} Current route + navigate helper.
 */
export function useRouter() {
	const read = useCallback( () => {
		const { path, query } = parseHash( window.location.hash );
		const { name, params } = matchRoute( path );
		return { name, params, query, path };
	}, [] );

	const [ route, setRoute ] = useState( read );

	useEffect( () => {
		const onChange = () => setRoute( read() );
		window.addEventListener( 'hashchange', onChange );
		if ( ! window.location.hash ) {
			window.location.hash = '#/';
		}
		return () => window.removeEventListener( 'hashchange', onChange );
	}, [ read ] );

	return { ...route, navigate };
}
