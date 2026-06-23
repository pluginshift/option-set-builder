/**
 * Storefront phone-field enhancement.
 *
 * Turns the `.optset-phone` wrapper rendered by TelField.php into an intl-style
 * control: a flag (+ dial code) button that opens a searchable country list.
 * Picking a country updates the button and the hidden `.optset-phone__iso` input
 * (read back by collect.js, which prefixes the dial code to the submitted
 * number when the dial code is shown). The country list is built here from the
 * shared dataset so the markup PHP emits stays tiny.
 *
 * @package
 */

import { COUNTRIES, flagEmoji } from '../shared/phone';

/**
 * Build the dropdown panel (search + scrollable country list) once.
 *
 * @param {boolean} showDial Whether the dial code is part of this control.
 * @return {HTMLElement} The dropdown element.
 */
function buildDropdown( showDial ) {
	const drop = document.createElement( 'div' );
	drop.className = 'optset-phone__drop';
	drop.hidden = true;

	const search = document.createElement( 'input' );
	search.type = 'text';
	search.className = 'optset-phone__search';
	search.setAttribute( 'placeholder', 'Search' );
	drop.appendChild( search );

	const list = document.createElement( 'div' );
	list.className = 'optset-phone__list';
	drop.appendChild( list );

	COUNTRIES.forEach( ( c ) => {
		const opt = document.createElement( 'button' );
		opt.type = 'button';
		opt.className = 'optset-phone__opt';
		opt.setAttribute( 'data-iso', c.iso2 );
		opt.setAttribute( 'data-dial', c.dial );
		opt.setAttribute( 'data-name', c.name.toLowerCase() );
		opt.innerHTML =
			'<span class="optset-phone__flag">' +
			flagEmoji( c.iso2 ) +
			'</span>' +
			'<span class="optset-phone__name"></span>' +
			( showDial
				? '<span class="optset-phone__dial">+' + c.dial + '</span>'
				: '' );
		// Name is set via textContent to avoid injecting markup.
		opt.querySelector( '.optset-phone__name' ).textContent = c.name;
		list.appendChild( opt );
	} );

	return drop;
}

/**
 * Wire one phone field's country selector.
 *
 * @param {HTMLElement} fieldEl  Field wrapper.
 * @param {Function}    onChange Change callback.
 * @return {void}
 */
export function wirePhone( fieldEl, onChange ) {
	const box = fieldEl.querySelector( '.optset-phone' );
	if ( ! box || box.__optsetPhone ) {
		return;
	}
	box.__optsetPhone = true;

	const button = box.querySelector( '.optset-phone__country' );
	const iso = box.querySelector( '.optset-phone__iso' );
	const flag = box.querySelector( '.optset-phone__flag' );
	const dial = box.querySelector( '.optset-phone__dial' );
	if ( ! button || ! iso ) {
		return;
	}

	const showDial = box.getAttribute( 'data-flag-style' ) === 'flag_dial';
	const drop = buildDropdown( showDial );
	box.appendChild( drop );
	const search = drop.querySelector( '.optset-phone__search' );
	const opts = Array.prototype.slice.call(
		drop.querySelectorAll( '.optset-phone__opt' )
	);

	const close = () => {
		drop.hidden = true;
		box.classList.remove( 'optset-phone--open' );
		button.setAttribute( 'aria-expanded', 'false' );
	};
	const open = () => {
		drop.hidden = false;
		box.classList.add( 'optset-phone--open' );
		button.setAttribute( 'aria-expanded', 'true' );
		search.value = '';
		filter( '' );
		search.focus();
	};

	const filter = ( q ) => {
		const needle = q.trim().toLowerCase();
		const digits = needle.replace( /\D/g, '' );
		opts.forEach( ( opt ) => {
			const name = opt.getAttribute( 'data-name' ) || '';
			const code = opt.getAttribute( 'data-iso' ) || '';
			const d = opt.getAttribute( 'data-dial' ) || '';
			const match =
				! needle ||
				name.indexOf( needle ) !== -1 ||
				code.indexOf( needle ) !== -1 ||
				( digits && d.indexOf( digits ) !== -1 );
			opt.hidden = ! match;
		} );
	};

	button.addEventListener( 'click', ( e ) => {
		e.preventDefault();
		if ( drop.hidden ) {
			open();
		} else {
			close();
		}
	} );

	search.addEventListener( 'input', () => filter( search.value ) );

	opts.forEach( ( opt ) => {
		opt.addEventListener( 'click', () => {
			const code = opt.getAttribute( 'data-iso' ) || '';
			iso.value = code;
			if ( flag ) {
				flag.textContent = flagEmoji( code );
			}
			if ( dial ) {
				dial.textContent =
					'+' + ( opt.getAttribute( 'data-dial' ) || '' );
			}
			opts.forEach( ( o ) => o.classList.remove( 'is-active' ) );
			opt.classList.add( 'is-active' );
			close();
			onChange();
		} );
	} );

	document.addEventListener( 'click', ( e ) => {
		if ( ! box.contains( e.target ) ) {
			close();
		}
	} );
}
