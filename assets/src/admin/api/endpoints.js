/**
 * Typed endpoint functions, one per REST route (ARCHITECTURE §11).
 *
 * Every function returns the parsed success envelope (or rejects with a
 * normalised WP_Error). Keeping the route shapes in one module means the
 * screens never hand-build paths or remember which body keys the server
 * expects.
 *
 * @package
 */

import { get, write, upload } from './client';

/* ---------------------------------------------------------------------- *
 * Option sets
 * ---------------------------------------------------------------------- */

/**
 * List option sets (paginated).
 *
 * @param {Object} params { search, page, per_page, order }.
 * @return {Promise<{ok:boolean,total_pages:number,items:Array}>} Envelope.
 */
export const listSets = ( params ) => get( 'sets', params );

/**
 * Fetch one set (or the `new` template).
 *
 * @param {string|number} id Set id or "new".
 * @return {Promise<{ok:boolean,set:Object}>} Envelope.
 */
export const getSet = ( id ) => get( `set/${ id }` );

/**
 * Upsert a set.
 *
 * @param {Object} payload { id, title, status, fields, css }.
 * @return {Promise<{ok:boolean,id:number}>} Envelope.
 */
export const saveSet = ( payload ) => write( 'set', payload );

/**
 * Delete a set by numeric id.
 *
 * @param {number} id Set id.
 * @return {Promise<{ok:boolean,id:number}>} Envelope.
 */
export const deleteSet = ( id ) => write( `set/${ id }`, {}, 'DELETE' );

/**
 * Bulk operation over many sets.
 *
 * @param {Object} payload { op, ids, status?, payload? }.
 * @return {Promise<{ok:boolean,op:string,ids:Array}>} Envelope.
 */
export const bulkSets = ( payload ) => write( 'sets/bulk', payload );

/* ---------------------------------------------------------------------- *
 * Assignment
 * ---------------------------------------------------------------------- */

/**
 * Get the stored assignment + expanded label objects for a set.
 *
 * @param {number} id Set id.
 * @return {Promise<Object>} Envelope.
 */
export const getAssignment = ( id ) => get( `assignment/${ id }` );

/**
 * Persist an assignment.
 *
 * @param {Object} payload { set_id, scope, include, exclude, product_image }.
 * @return {Promise<Object>} Envelope.
 */
export const saveAssignment = ( payload ) => write( 'assignment', payload );

/**
 * Resolve a representative product permalink for an assignment.
 *
 * @param {number} setId      Set id.
 * @param {Object} assignment { scope, include, exclude }.
 * @return {Promise<{ok:boolean,published:boolean,productLink:string}>} Env.
 */
export const productLink = ( setId, assignment ) =>
	get( 'product-link', {
		set_id: setId,
		assignment: JSON.stringify( assignment ),
	} );

/* ---------------------------------------------------------------------- *
 * Search (assignment pickers / logic field picker)
 * ---------------------------------------------------------------------- */

/**
 * Search products.
 *
 * @param {string} term     Query term.
 * @param {Array}  excludes Product ids to exclude.
 * @return {Promise<{ok:boolean,items:Array}>} Envelope.
 */
export const searchProducts = ( term, excludes = [] ) =>
	get( 'search/products', { term, excludes, limit: 20 } );

/**
 * Search taxonomy terms.
 *
 * @param {string} taxonomy One of category|tag|brand.
 * @param {string} term     Query term.
 * @return {Promise<{ok:boolean,items:Array}>} Envelope.
 */
export const searchTerms = ( taxonomy, term ) =>
	get( 'search/terms', { taxonomy, term, limit: 20 } );

/* ---------------------------------------------------------------------- *
 * Style / Settings / Fonts
 * ---------------------------------------------------------------------- */

/** @return {Promise<Object>} Global + thematic style tokens & CSS. */
export const getStyle = () => get( 'style' );

/**
 * Persist style tokens + compiled CSS.
 *
 * @param {Object}  style    Token object.
 * @param {string}  css      Compiled CSS string.
 * @param {boolean} thematic Whether this is the thematic variant.
 * @return {Promise<Object>} Envelope.
 */
export const saveStyle = ( style, css, thematic ) =>
	write( 'style', { style: JSON.stringify( style ), css, thematic } );

/** @return {Promise<{ok:boolean,settings:Object}>} Settings envelope. */
export const getSettings = () => get( 'settings' );

/**
 * Persist settings.
 *
 * @param {Object} settings Settings map.
 * @return {Promise<{ok:boolean,settings:Object}>} Envelope.
 */
export const saveSettings = ( settings ) =>
	write( 'settings', { settings: JSON.stringify( settings ) } );

/** @return {Promise<{ok:boolean,fonts:Array}>} Custom fonts envelope. */
export const getFonts = () => get( 'fonts' );

/**
 * Upload a custom font (.woff/.woff2/.ttf).
 *
 * @param {File}   file   The font file.
 * @param {string} title  Display title.
 * @param {string} family CSS font-family name.
 * @return {Promise<{ok:boolean,font:Object}>} Envelope.
 */
export const uploadFont = ( file, title, family ) => {
	const form = new window.FormData();
	form.append( 'font_file', file );
	form.append( 'title', title );
	form.append( 'family', family );
	return upload( 'font', form );
};

/**
 * Delete a custom font.
 *
 * @param {string} id Font id.
 * @return {Promise<{ok:boolean,id:string}>} Envelope.
 */
export const deleteFont = ( id ) => write( `font/${ id }`, {}, 'DELETE' );

/**
 * Rename a custom font.
 *
 * @param {string} id     Font id.
 * @param {Object} fields { title, family }.
 * @return {Promise<{ok:boolean,id:string}>} Envelope.
 */
export const patchFont = ( id, fields ) =>
	write( `font/${ id }`, fields, 'PATCH' );

/* ---------------------------------------------------------------------- *
 * Analytics / Plugin install
 * ---------------------------------------------------------------------- */

/**
 * Aggregate analytics (table + daily series).
 *
 * @param {string} search Optional `YYYY-MM-DD..YYYY-MM-DD` range token.
 * @return {Promise<{ok:boolean,table:Array,daily:Array}>} Envelope.
 */
export const getAnalytics = ( search = '' ) => get( 'analytics', { search } );

/**
 * Install + activate a wp.org plugin (recommended plugins panel).
 *
 * @param {string} slug Plugin directory slug.
 * @return {Promise<{ok:boolean,message:string,slug:string}>} Envelope.
 */
export const installPlugin = ( slug ) => write( 'plugin/install', { slug } );
