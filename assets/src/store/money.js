/**
 * Currency formatting + numeric parse helpers.
 *
 * Honours the `window.optsetStore.currency` shape
 * ({ symbol, pos, decimals, decimalSep, thousandSep }) and the optional
 * `conversion` block ({ active, rate, extra }). Conversion is applied for
 * DISPLAY only — the raw, base-currency amounts are what get serialised to
 * the hidden inputs so the server recomputes authoritatively.
 *
 * @package
 */

/**
 * Read the localised store config defensively.
 *
 * @return {Object} The optsetStore global, or a safe default.
 */
function cfg() {
	return ( typeof window !== 'undefined' && window.optsetStore ) || {};
}

/**
 * Coerce any numeric-ish value to a finite float (mirrors Support\Money::f).
 *
 * @param {*} value Raw value.
 * @return {number} Parsed float, 0 when not numeric.
 */
export function toNumber( value ) {
	if ( typeof value === 'number' ) {
		return isFinite( value ) ? value : 0;
	}
	if ( value === null || value === undefined ) {
		return 0;
	}
	let str = String( value ).trim();
	if ( str === '' ) {
		return 0;
	}
	// Strip grouping commas the same way the PHP helper does.
	str = str.replace( /,/g, '' );
	const n = parseFloat( str );
	return isFinite( n ) ? n : 0;
}

/**
 * Parse a user-typed money string using the active decimal separator.
 *
 * @param {string} value Raw input value.
 * @return {number} Parsed float.
 */
export function parseMoney( value ) {
	if ( value === null || value === undefined ) {
		return 0;
	}
	const c = cfg().currency || {};
	const dec = c.decimalSep || '.';
	const tho = c.thousandSep || ',';
	let str = String( value ).trim();
	if ( tho ) {
		str = str.split( tho ).join( '' );
	}
	if ( dec && dec !== '.' ) {
		str = str.split( dec ).join( '.' );
	}
	str = str.replace( /[^0-9.\-]/g, '' );
	const n = parseFloat( str );
	return isFinite( n ) ? n : 0;
}

/**
 * Apply the active currency conversion for display only.
 *
 * @param {number} amount Base-currency amount.
 * @return {number} Display amount.
 */
export function convertForDisplay( amount ) {
	const conv = cfg().conversion || {};
	let out = toNumber( amount );
	if ( conv && conv.active ) {
		out = out * toNumber( conv.rate || 1 ) + toNumber( conv.extra || 0 );
	}
	return out;
}

/**
 * Format a number with fixed decimals and the active separators.
 *
 * @param {number} amount   Amount.
 * @param {number} decimals Decimal places.
 * @param {string} decSep   Decimal separator.
 * @param {string} thoSep   Thousand separator.
 * @return {string} Formatted numeric string (no symbol).
 */
function numberFormat( amount, decimals, decSep, thoSep ) {
	const neg = amount < 0;
	const fixed = Math.abs( toNumber( amount ) ).toFixed(
		Math.max( 0, decimals )
	);
	const parts = fixed.split( '.' );
	parts[ 0 ] = parts[ 0 ].replace( /\B(?=(\d{3})+(?!\d))/g, thoSep || '' );
	const joined = parts.join( decSep || '.' );
	return ( neg ? '-' : '' ) + joined;
}

/**
 * Format a base-currency amount into a display HTML/string honouring the
 * WooCommerce currency position. Applies conversion when active.
 *
 * @param {number}  amount     Base-currency amount.
 * @param {boolean} [skipConv] When true, do not currency-convert.
 * @return {string} Formatted price string with symbol.
 */
export function formatMoney( amount, skipConv ) {
	const c = cfg().currency || {};
	const symbol = c.symbol || '';
	const pos = c.pos || 'left';
	const decimals =
		c.decimals === undefined || c.decimals === null
			? 2
			: parseInt( c.decimals, 10 );
	const value = skipConv ? toNumber( amount ) : convertForDisplay( amount );
	const num = numberFormat(
		value,
		isFinite( decimals ) ? decimals : 2,
		c.decimalSep || '.',
		c.thousandSep || ','
	);

	switch ( pos ) {
		case 'right':
			return num + symbol;
		case 'left_space':
			return symbol + ' ' + num;
		case 'right_space':
			return num + ' ' + symbol;
		case 'left':
		default:
			return symbol + num;
	}
}

/**
 * Round to a sane number of decimal places to avoid float drift.
 *
 * @param {number} amount Amount.
 * @return {number} Rounded amount.
 */
export function roundMoney( amount ) {
	return Math.round( ( toNumber( amount ) + Number.EPSILON ) * 1e6 ) / 1e6;
}
