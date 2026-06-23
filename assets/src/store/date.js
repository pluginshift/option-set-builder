/**
 * Storefront date-field enhancement.
 *
 * Turns the readonly `.optset-date-input` rendered by DateField.php into a
 * flatpickr calendar, honouring every restriction the builder can set:
 * display format, earliest/latest bounds (none | today | a custom date),
 * blocked today, blocked specific dates, blocked weekdays and blocked
 * days-of-the-month. Calls `onChange` on every pick so the pricing/validation
 * layer re-runs (a flat-priced date still adds its cost like any value field).
 *
 * @package
 */

import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

/**
 * Parse a JSON data-* attribute into an array, tolerating empty/malformed.
 *
 * @param {HTMLElement} el   Element.
 * @param {string}      name Attribute name.
 * @return {Array} Parsed array (empty on failure).
 */
function jsonAttr( el, name ) {
	const raw = el.getAttribute( name );
	if ( ! raw ) {
		return [];
	}
	try {
		const parsed = JSON.parse( raw );
		return Array.isArray( parsed ) ? parsed : [];
	} catch ( e ) {
		return [];
	}
}

/**
 * Whether two dates fall on the same calendar day.
 *
 * @param {Date} a First date.
 * @param {Date} b Second date.
 * @return {boolean} Same day.
 */
function sameDay( a, b ) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/**
 * Resolve a min/max bound to a flatpickr-acceptable value.
 *
 * @param {string} mode   none | today | custom.
 * @param {string} value  Stored formatted date (custom mode).
 * @param {string} format flatpickr/PHP token.
 * @return {string|Date|undefined} Bound, or undefined when unbounded.
 */
function resolveBound( mode, value, format ) {
	if ( mode === 'today' ) {
		return 'today';
	}
	if ( mode === 'custom' && value ) {
		const parsed = flatpickr.parseDate( value, format );
		return parsed || undefined;
	}
	return undefined;
}

/**
 * Wire one date field.
 *
 * @param {HTMLElement} fieldEl  Field wrapper.
 * @param {Function}    onChange Change callback.
 * @return {void}
 */
export function wireDate( fieldEl, onChange ) {
	const input = fieldEl.querySelector( '.optset-date-input' );
	if ( ! input || input.__optsetDate ) {
		return;
	}
	input.__optsetDate = true;

	const format = input.getAttribute( 'data-format' ) || 'd/m/Y';

	// Blocked specific dates → Date objects for a robust same-day compare.
	const blockedDates = jsonAttr( input, 'data-disable-dates' )
		.map( ( s ) => flatpickr.parseDate( String( s ), format ) )
		.filter( Boolean );
	const blockedWeekdays = jsonAttr( input, 'data-disable-weekdays' ).map(
		Number
	);
	const blockedMonthDays = jsonAttr( input, 'data-disable-monthdays' ).map(
		Number
	);
	const blockToday = input.getAttribute( 'data-disable-today' ) === 'yes';

	const disable = [
		( date ) => {
			if ( blockToday && sameDay( date, new Date() ) ) {
				return true;
			}
			if ( blockedWeekdays.indexOf( date.getDay() ) !== -1 ) {
				return true;
			}
			if ( blockedMonthDays.indexOf( date.getDate() ) !== -1 ) {
				return true;
			}
			return blockedDates.some( ( d ) => sameDay( d, date ) );
		},
	];

	try {
		flatpickr( input, {
			dateFormat: format,
			allowInput: false,
			disableMobile: true,
			minDate: resolveBound(
				input.getAttribute( 'data-min-mode' ) || 'none',
				input.getAttribute( 'data-min-date' ) || '',
				format
			),
			maxDate: resolveBound(
				input.getAttribute( 'data-max-mode' ) || 'none',
				input.getAttribute( 'data-max-date' ) || '',
				format
			),
			disable,
			onChange: () => onChange(),
		} );
	} catch ( e ) {
		/* a broken picker must never wedge the product form. */
	}
}
