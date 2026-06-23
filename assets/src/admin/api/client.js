/**
 * Thin wrapper around @wordpress/api-fetch.
 *
 * Centralises the REST root, the X-WP-Nonce header, write-call body nonce
 * injection, and error normalisation so every endpoint helper can stay
 * declarative. The plugin server returns a `{ ok:true, ... }` success
 * envelope and a serialized WP_Error for failures; api-fetch rejects the
 * promise on a non-2xx, so callers only need to `catch ( e ) { e.message }`.
 *
 * @package
 */

import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

/**
 * Read the localized bootstrap config, tolerating its absence (tests / SSR).
 *
 * @return {Object} The optsetAdmin global or a minimal stub.
 */
function config() {
	return ( typeof window !== 'undefined' && window.optsetAdmin ) || {};
}

let bootstrapped = false;

/**
 * Absolute REST root for this plugin's namespace, with a trailing slash.
 *
 * We resolve full URLs ourselves instead of registering a second
 * `createRootURLMiddleware`. WordPress core already registers its own root
 * middleware (pointing at `/wp-json/`); two root middlewares race
 * order-dependently and the core one can win, stripping our `optset/v1`
 * namespace so requests hit `/wp-json/sets` and the server replies
 * `rest_no_route` ("No route was found…"). Passing an explicit `url`
 * makes every root middleware a no-op and is fully deterministic.
 *
 * @return {string} e.g. https://site/wp-json/optset/v1/
 */
export function restRoot() {
	const cfg = config();
	let root = cfg.restUrl || '';
	if ( ! root && typeof window !== 'undefined' && window.wpApiSettings ) {
		root = `${ window.wpApiSettings.root || '/wp-json/' }optset/v1/`;
	}
	if ( ! root ) {
		root = '/wp-json/optset/v1/';
	}
	return root.endsWith( '/' ) ? root : `${ root }/`;
}

/**
 * Configure api-fetch once: register the X-WP-Nonce middleware so every
 * request is authenticated for the logged-in administrator.
 *
 * @return {void}
 */
export function bootstrapApi() {
	if ( bootstrapped ) {
		return;
	}
	bootstrapped = true;

	const cfg = config();
	if ( cfg.nonce ) {
		apiFetch.use( apiFetch.createNonceMiddleware( cfg.nonce ) );
	}
}

/**
 * Per-request auth headers (explicit, so behaviour does not depend on
 * middleware registration order).
 *
 * @return {Object} Header map.
 */
function authHeaders() {
	const cfg = config();
	return cfg.nonce ? { 'X-WP-Nonce': cfg.nonce } : {};
}

/**
 * Normalise an unknown thrown value into a readable message string.
 *
 * @param {*} error Anything api-fetch (or JS) threw.
 * @return {string} A human readable message.
 */
export function errorMessage( error ) {
	if ( ! error ) {
		return __(
			'Unknown error.',
			'option-set-builder'
		);
	}
	if ( typeof error === 'string' ) {
		return error;
	}
	if ( error.message ) {
		return error.message;
	}
	if ( error.code ) {
		return String( error.code );
	}
	return __( 'Request failed.', 'option-set-builder' );
}

/**
 * Build a query string from a params object (skips null/undefined/'').
 *
 * @param {Object} params Key/value map.
 * @return {string} Leading-`?` query string, or empty string.
 */
export function qs( params = {} ) {
	const parts = [];
	Object.keys( params ).forEach( ( key ) => {
		const value = params[ key ];
		if ( value === null || value === undefined || value === '' ) {
			return;
		}
		if ( Array.isArray( value ) ) {
			value.forEach( ( v ) =>
				parts.push(
					`${ encodeURIComponent( key ) }[]=${ encodeURIComponent(
						v
					) }`
				)
			);
			return;
		}
		parts.push(
			`${ encodeURIComponent( key ) }=${ encodeURIComponent( value ) }`
		);
	} );
	return parts.length ? `?${ parts.join( '&' ) }` : '';
}

/**
 * Resolve a namespace-relative path to an absolute REST URL.
 *
 * @param {string} path Path relative to the optset/v1 root (no leading slash).
 * @return {string} Absolute URL.
 */
function url( path ) {
	return restRoot() + String( path ).replace( /^\/+/, '' );
}

/**
 * GET helper.
 *
 * @param {string} path  REST path relative to the optset/v1 root.
 * @param {Object} query Optional query params.
 * @return {Promise<Object>} Parsed JSON envelope.
 */
export function get( path, query = {} ) {
	return apiFetch( {
		url: `${ url( path ) }${ qs( query ) }`,
		method: 'GET',
		headers: authHeaders(),
	} );
}

/**
 * Write helper (POST/DELETE/PATCH). Injects the optset_nonce body field so the
 * server's secondary nonce check passes on every mutating route.
 *
 * @param {string} path   REST path.
 * @param {Object} body   JSON body (optset_nonce is merged in automatically).
 * @param {string} method HTTP verb (default POST).
 * @return {Promise<Object>} Parsed JSON envelope.
 */
export function write( path, body = {}, method = 'POST' ) {
	const cfg = config();
	const data =
		method === 'DELETE'
			? undefined
			: { ...body, optset_nonce: cfg.uploadNonce };
	return apiFetch( {
		url:
			method === 'DELETE'
				? `${ url( path ) }${ qs( { optset_nonce: cfg.uploadNonce } ) }`
				: url( path ),
		method,
		data,
		headers: authHeaders(),
	} );
}

/**
 * Multipart upload helper (fonts / files). Sends FormData with the body
 * nonce so it survives the public/manage nonce gate.
 *
 * @param {string}   path REST path.
 * @param {FormData} form A pre-built FormData instance.
 * @return {Promise<Object>} Parsed JSON envelope.
 */
export function upload( path, form ) {
	const cfg = config();
	if ( cfg.uploadNonce && ! form.has( 'optset_nonce' ) ) {
		form.append( 'optset_nonce', cfg.uploadNonce );
	}
	return apiFetch( {
		url: url( path ),
		method: 'POST',
		body: form,
		headers: authHeaders(),
	} );
}
