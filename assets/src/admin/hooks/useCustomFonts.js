/**
 * Shared access to the uploaded custom fonts inside the builder/admin. Fetches
 * the list once (module-level cache shared across every caller) and injects an
 * `@font-face` <style> block into the document so font previews — the Font
 * Picker's family dropdown, the choices table and the canvas preview — render
 * in the actual uploaded face rather than a fallback.
 *
 * Mirrors FontPickerField.php's font-face generation so admin and storefront
 * stay visually identical.
 *
 * @package
 */

import { useState, useEffect } from '@wordpress/element';
import * as api from '../api/endpoints';

/** Module-level cache so the fonts are fetched + injected only once. */
let cache = null;
let inflight = null;
const subscribers = new Set();

/** Map an uploaded font extension to a CSS @font-face format() hint. */
const FORMAT_HINT = {
	ttf: 'truetype',
	otf: 'opentype',
	woff: 'woff',
	woff2: 'woff2',
};

/**
 * Inject (or refresh) the admin @font-face style block for the given fonts.
 * Exported so screens that load fonts on their own (e.g. the Settings → Fonts
 * manager) can register the faces for their previews too.
 *
 * @param {Array} fonts Custom font entries.
 * @return {void}
 */
export function injectFontFaces( fonts ) {
	if ( typeof document === 'undefined' ) {
		return;
	}
	const css = fonts
		.filter( ( f ) => f && f.family && f.src )
		.map( ( f ) => {
			const fmt =
				FORMAT_HINT[ ( f.file_type || '' ).toLowerCase() ] || 'woff2';
			return `@font-face{font-family:'${ f.family }';src:url('${ f.src }') format('${ fmt }');font-display:swap;}`;
		} )
		.join( '' );

	let el = document.getElementById( 'optset-admin-fontfaces' );
	if ( ! el ) {
		el = document.createElement( 'style' );
		el.id = 'optset-admin-fontfaces';
		document.head.appendChild( el );
	}
	el.textContent = css;
}

/**
 * Fetch the fonts once and notify subscribers.
 *
 * @return {Promise<Array>} The fonts.
 */
function load() {
	if ( cache ) {
		return Promise.resolve( cache );
	}
	if ( ! inflight ) {
		inflight = api
			.getFonts()
			.then( ( res ) => {
				cache = ( res && res.fonts ) || [];
				injectFontFaces( cache );
				subscribers.forEach( ( fn ) => fn( cache ) );
				return cache;
			} )
			.catch( () => {
				cache = [];
				return cache;
			} );
	}
	return inflight;
}

/**
 * useCustomFonts.
 *
 * @return {{ fonts: Array, loading: boolean }} Fonts + load state.
 */
export default function useCustomFonts() {
	const [ fonts, setFonts ] = useState( cache || [] );
	const [ loading, setLoading ] = useState( ! cache );

	useEffect( () => {
		let active = true;
		const onUpdate = ( list ) => {
			if ( active ) {
				setFonts( list );
			}
		};
		subscribers.add( onUpdate );
		load().then( ( list ) => {
			if ( active ) {
				setFonts( list );
				setLoading( false );
			}
		} );
		return () => {
			active = false;
			subscribers.delete( onUpdate );
		};
	}, [] );

	return { fonts, loading };
}
