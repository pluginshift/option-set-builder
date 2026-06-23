/**
 * Storefront time-field enhancement.
 *
 * Turns the readonly `.optset-time-input` rendered by TimeField.php into a
 * flatpickr time-only picker, honouring the builder settings: 12/24-hour
 * display, earliest/latest bounds and the minute step. Bounds are stored as
 * 24-hour "HH:MM" strings; "00:00" (or empty) means "no limit". Calls
 * `onChange` on every pick so pricing/validation re-run (the surcharge is only
 * applied once a time is actually chosen — see pricing.js).
 *
 * @package
 */

import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

/**
 * Normalise a stored bound: treat '' / '00:00' as unset.
 *
 * @param {string} raw Stored "HH:MM".
 * @return {string|undefined} Bound or undefined.
 */
function bound( raw ) {
	const v = ( raw || '' ).trim();
	if ( v === '' || v === '00:00' ) {
		return undefined;
	}
	return v;
}

/**
 * Wire one time field.
 *
 * @param {HTMLElement} fieldEl  Field wrapper.
 * @param {Function}    onChange Change callback.
 * @return {void}
 */
export function wireTime( fieldEl, onChange ) {
	const input = fieldEl.querySelector( '.optset-time-input' );
	if ( ! input || input.__optsetTime ) {
		return;
	}
	input.__optsetTime = true;

	const hour12 = input.getAttribute( 'data-hour12' ) !== 'no';
	const step = parseInt( input.getAttribute( 'data-step' ) || '0', 10 );

	try {
		flatpickr( input, {
			enableTime: true,
			noCalendar: true,
			time_24hr: ! hour12,
			dateFormat: hour12 ? 'h:i K' : 'H:i',
			minTime: bound( input.getAttribute( 'data-min-time' ) ),
			maxTime: bound( input.getAttribute( 'data-max-time' ) ),
			minuteIncrement: step > 0 ? step : 5,
			disableMobile: true,
			onChange: () => onChange(),
		} );
	} catch ( e ) {
		/* a broken picker must never wedge the product form. */
	}
}
