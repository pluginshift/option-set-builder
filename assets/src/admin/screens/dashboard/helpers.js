/**
 * Pure, side-effect-free helpers for the Dashboard screen. Shared maths
 * (range tokens, trend, ratio, delta formatting) is re-exported from the
 * Analytics helpers so the two screens stay numerically consistent and we
 * never duplicate the period-over-period logic.
 *
 * @package
 */

import { __, sprintf, _n } from '@wordpress/i18n';

export { rangeToken, trend, ratio, formatDelta } from '../analytics/helpers';

/**
 * Locale integer with thousands grouping.
 *
 * @param {number} n Value.
 * @return {string} Grouped integer (e.g. `1,247`).
 */
export const int = ( n ) => Number( n || 0 ).toLocaleString();

/**
 * Absolute period-over-period change of a metric across a daily series:
 * second half minus first half. Returns 0 when the series is too short to
 * compare so callers never render a misleading figure.
 *
 * @param {Array}  rows Daily rows (ascending).
 * @param {string} key  Metric key.
 * @return {number} Signed absolute delta.
 */
export function absDelta( rows, key ) {
	if ( ! Array.isArray( rows ) || rows.length < 2 ) {
		return 0;
	}
	const mid = Math.floor( rows.length / 2 );
	const sum = ( from, to ) =>
		rows
			.slice( from, to )
			.reduce( ( a, r ) => a + ( Number( r[ key ] ) || 0 ), 0 );
	return sum( mid, rows.length ) - sum( 0, mid );
}

/**
 * Compact, human relative time from a GMT timestamp (the option-set
 * `updated` field is `post_modified_gmt`). Always phrased in the past.
 *
 * @param {string} gmt MySQL UTC datetime (`YYYY-MM-DD HH:MM:SS`).
 * @return {string} e.g. `2 hours ago`, `just now`, `3 days ago`.
 */
export function relativeTime( gmt ) {
	if ( ! gmt ) {
		return '';
	}
	// Normalise the MySQL GMT string to an ISO instant the parser trusts.
	const iso = String( gmt ).replace( ' ', 'T' ) + 'Z';
	const then = new Date( iso ).getTime();
	if ( Number.isNaN( then ) ) {
		return '';
	}
	const secs = Math.max( 0, Math.floor( ( Date.now() - then ) / 1000 ) );

	if ( secs < 45 ) {
		return __( 'just now', 'option-set-builder' );
	}

	const units = [
		[ 31536000, 'year' ],
		[ 2592000, 'month' ],
		[ 86400, 'day' ],
		[ 3600, 'hour' ],
		[ 60, 'minute' ],
	];

	for ( const [ span, unit ] of units ) {
		if ( secs >= span ) {
			const v = Math.floor( secs / span );
			return relLabel( unit, v );
		}
	}
	return relLabel( 'minute', 1 );
}

/**
 * Pluralised "{n} {unit} ago" label (kept translator-friendly).
 *
 * @param {string} unit One of year|month|day|hour|minute.
 * @param {number} v    Count.
 * @return {string} Localised relative label.
 */
function relLabel( unit, v ) {
	switch ( unit ) {
		case 'year':
			return sprintf(
				/* translators: %d: number of years */
				_n(
					'%d year ago',
					'%d years ago',
					v,
					'option-set-builder'
				),
				v
			);
		case 'month':
			return sprintf(
				/* translators: %d: number of months */
				_n(
					'%d month ago',
					'%d months ago',
					v,
					'option-set-builder'
				),
				v
			);
		case 'day':
			return sprintf(
				/* translators: %d: number of days */
				_n(
					'%d day ago',
					'%d days ago',
					v,
					'option-set-builder'
				),
				v
			);
		case 'hour':
			return sprintf(
				/* translators: %d: number of hours */
				_n(
					'%d hour ago',
					'%d hours ago',
					v,
					'option-set-builder'
				),
				v
			);
		default:
			return sprintf(
				/* translators: %d: number of minutes */
				_n(
					'%d minute ago',
					'%d minutes ago',
					v,
					'option-set-builder'
				),
				v
			);
	}
}
