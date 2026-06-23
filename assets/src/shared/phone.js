/**
 * Shared phone/country helpers used by both the admin builder (live preview)
 * and the storefront runtime, so the country list, flag rendering and default
 * resolution stay identical on both sides.
 *
 * The country dataset (iso2 / name / dial) lives in a single JSON file; flag
 * glyphs are derived from the iso2 code as Unicode regional-indicator pairs
 * (no flag images bundled).
 *
 * @package
 */

import data from '../../data/countries.json';

/**
 * Full country list, sorted by display name.
 *
 * @type {Array<{iso2:string,name:string,dial:string}>}
 */
export const COUNTRIES = [ ...data ].sort( ( a, b ) =>
	a.name.localeCompare( b.name )
);

/**
 * Render the emoji flag for an ISO-3166 alpha-2 code (e.g. "bd" → 🇧🇩).
 *
 * @param {string} iso2 Two-letter country code.
 * @return {string} The emoji flag, or '' for an invalid code.
 */
export function flagEmoji( iso2 ) {
	const code = String( iso2 || '' )
		.trim()
		.toUpperCase();
	if ( ! /^[A-Z]{2}$/.test( code ) ) {
		return '';
	}
	return String.fromCodePoint(
		...[ ...code ].map( ( c ) => 0x1f1e6 - 65 + c.charCodeAt( 0 ) )
	);
}

/**
 * Look up a country by ISO-2 code.
 *
 * @param {string} iso2 Two-letter country code.
 * @return {Object|undefined} The country record.
 */
export function findCountry( iso2 ) {
	const code = String( iso2 || '' )
		.trim()
		.toLowerCase();
	return COUNTRIES.find( ( c ) => c.iso2 === code );
}

/**
 * Resolve the country to show first: the preferred code when valid, otherwise
 * the United States as a safe, universally-known fallback.
 *
 * @param {string} preferred Preferred ISO-2 code (may be empty/invalid).
 * @return {Object} The resolved country record.
 */
export function resolveDefault( preferred ) {
	return findCountry( preferred ) || findCountry( 'us' ) || COUNTRIES[ 0 ];
}
