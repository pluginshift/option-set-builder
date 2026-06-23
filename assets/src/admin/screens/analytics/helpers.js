/**
 * Pure, side-effect-free helpers for the Analytics screen: date-range
 * tokens, ratio math, delta formatting, axis scaling, smooth SVG paths
 * and CSV serialization. Kept out of the components so the rendering
 * tree stays declarative and unit-testable.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';

/** Selectable ranges (id → day span; `today` is a single day). */
export const RANGES = [
	{ id: 'today', days: 1 },
	{ id: '7d', days: 7 },
	{ id: '30d', days: 30 },
	{ id: '90d', days: 90 },
];

/**
 * Human label for a range id (translated lazily so __() runs at call time).
 * @param id
 */
export function rangeLabel( id ) {
	switch ( id ) {
		case 'today':
			return __( 'Today', 'option-set-builder' );
		case '7d':
			return __( '7 Days', 'option-set-builder' );
		case '30d':
			return __( '30 Days', 'option-set-builder' );
		case '90d':
		default:
			return __( '90 Days', 'option-set-builder' );
	}
}

/**
 * Format a Date as a local `YYYY-MM-DD` token (server stores local days).
 *
 * @param {Date} d Date instance.
 * @return {string} ISO date (no time).
 */
function ymd( d ) {
	const p = ( n ) => String( n ).padStart( 2, '0' );
	return `${ d.getFullYear() }-${ p( d.getMonth() + 1 ) }-${ p(
		d.getDate()
	) }`;
}

/**
 * Build the `YYYY-MM-DD..YYYY-MM-DD` token the analytics endpoint accepts.
 *
 * @param {string} rangeId One of RANGES ids.
 * @return {string} Range token (single date for `today`).
 */
export function rangeToken( rangeId ) {
	const span = RANGES.find( ( r ) => r.id === rangeId ) || RANGES[ 1 ];
	const to = new Date();
	if ( span.days <= 1 ) {
		return ymd( to );
	}
	const from = new Date();
	from.setDate( from.getDate() - ( span.days - 1 ) );
	return `${ ymd( from ) }..${ ymd( to ) }`;
}

/**
 * Safe percentage of part over whole, clamped to [0, 100].
 *
 * @param {number} part  Numerator.
 * @param {number} whole Denominator.
 * @return {number} Rounded percentage.
 */
export function ratio( part, whole ) {
	if ( ! whole || whole <= 0 ) {
		return 0;
	}
	return Math.max( 0, Math.min( 100, Math.round( ( part / whole ) * 100 ) ) );
}

/**
 * Period-over-period delta: compares the second half of a daily series to
 * the first half. Returns null when not enough data to be honest about it.
 *
 * @param {Array}  rows Daily rows (ascending).
 * @param {string} key  Metric key.
 * @return {number|null} Signed percentage change, or null.
 */
export function trend( rows, key ) {
	if ( ! Array.isArray( rows ) || rows.length < 2 ) {
		return null;
	}
	const mid = Math.floor( rows.length / 2 );
	const sum = ( from, to ) =>
		rows
			.slice( from, to )
			.reduce( ( a, r ) => a + ( Number( r[ key ] ) || 0 ), 0 );
	const prev = sum( 0, mid );
	const curr = sum( mid, rows.length );
	if ( prev <= 0 ) {
		return curr > 0 ? 100 : 0;
	}
	return Math.round( ( ( curr - prev ) / prev ) * 100 );
}

/**
 * Format a signed delta for display (`+12%`, `-4%`, `0%`).
 *
 * @param {number|null} n Delta percentage.
 * @return {string} Display string ("—" when null).
 */
export function formatDelta( n ) {
	if ( n === null || n === undefined ) {
		return '—';
	}
	const sign = n > 0 ? '+' : '';
	return `${ sign }${ n }%`;
}

/**
 * Round a max value up to a friendly axis ceiling (25/50/100/250…).
 *
 * @param {number} max Raw maximum.
 * @return {number} Nice ceiling (min 4 so the axis is never degenerate).
 */
export function niceCeil( max ) {
	const m = Math.max( 4, Math.ceil( max ) );
	const pow = Math.pow( 10, Math.floor( Math.log10( m ) ) );
	const n = m / pow;
	let step;
	if ( n <= 1 ) {
		step = 1;
	} else if ( n <= 2 ) {
		step = 2;
	} else if ( n <= 2.5 ) {
		step = 2.5;
	} else if ( n <= 5 ) {
		step = 5;
	} else {
		step = 10;
	}
	return step * pow;
}

/**
 * Short axis label for a day string, adapted to the series length.
 *
 * @param {string} day   `YYYY-MM-DD`.
 * @param {number} count Total points in the series.
 * @return {string} Weekday for short ranges, `M/D` for long ones.
 */
export function dayLabel( day, count ) {
	const d = new Date( `${ day }T00:00:00` );
	if ( Number.isNaN( d.getTime() ) ) {
		return day;
	}
	if ( count <= 8 ) {
		return d.toLocaleDateString( undefined, { weekday: 'short' } );
	}
	return `${ d.getMonth() + 1 }/${ d.getDate() }`;
}

/**
 * Build a smooth (Catmull-Rom → cubic Bézier) SVG path through points.
 *
 * @param {Array<{x:number,y:number}>} pts Points.
 * @param {number}                     [t] Tension (0–1, lower = tighter).
 * @return {string} An SVG path `d` attribute (empty when < 2 points).
 */
export function smoothPath( pts, t = 0.2 ) {
	if ( ! pts || pts.length < 2 ) {
		return pts && pts.length === 1
			? `M ${ pts[ 0 ].x } ${ pts[ 0 ].y }`
			: '';
	}
	let d = `M ${ pts[ 0 ].x } ${ pts[ 0 ].y }`;
	for ( let i = 0; i < pts.length - 1; i++ ) {
		const p0 = pts[ i - 1 ] || pts[ i ];
		const p1 = pts[ i ];
		const p2 = pts[ i + 1 ];
		const p3 = pts[ i + 2 ] || p2;
		const c1x = p1.x + ( ( p2.x - p0.x ) / 6 ) * ( t / 0.2 );
		const c1y = p1.y + ( ( p2.y - p0.y ) / 6 ) * ( t / 0.2 );
		const c2x = p2.x - ( ( p3.x - p1.x ) / 6 ) * ( t / 0.2 );
		const c2y = p2.y - ( ( p3.y - p1.y ) / 6 ) * ( t / 0.2 );
		d += ` C ${ c1x } ${ c1y } ${ c2x } ${ c2y } ${ p2.x } ${ p2.y }`;
	}
	return d;
}

/**
 * Serialize analytics rows to a CSV blob string (RFC-4180 quoting).
 *
 * @param {Array} rows Table rows from the analytics endpoint.
 * @return {string} CSV text.
 */
export function tableToCsv( rows ) {
	const head = [
		'Option set',
		'Impressions',
		'Clicks',
		'Add to cart',
		'Orders',
		'Revenue',
		'CTR %',
	];
	const esc = ( v ) => {
		const s = String( v ?? '' );
		return /[",\n]/.test( s ) ? `"${ s.replace( /"/g, '""' ) }"` : s;
	};
	const lines = [ head.join( ',' ) ];
	rows.forEach( ( r ) => {
		lines.push(
			[
				r.title || `#${ r.set_id }`,
				r.impressions,
				r.clicks,
				r.add_to_cart,
				r.orders,
				r.revenue,
				r.ctr,
			]
				.map( esc )
				.join( ',' )
		);
	} );
	return lines.join( '\n' );
}

/**
 * Trigger a client-side file download.
 *
 * @param {string} name Filename.
 * @param {string} text File contents.
 * @param {string} mime MIME type.
 * @return {void}
 */
export function downloadFile( name, text, mime = 'text/csv' ) {
	const blob = new window.Blob( [ text ], {
		type: `${ mime };charset=utf-8`,
	} );
	const url = window.URL.createObjectURL( blob );
	const a = document.createElement( 'a' );
	a.href = url;
	a.download = name;
	a.click();
	window.URL.revokeObjectURL( url );
}
