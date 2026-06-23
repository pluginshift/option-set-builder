/**
 * Submit-time validation.
 *
 * Runs on `form.cart` submit and on clicks of the WooCommerce add-to-cart
 * button (including theme ajax-add buttons). Enforces, for VISIBLE fields
 * only:
 *   - required: non-empty selection/value
 *   - min/max selection count (choice groups, fileupload count)
 *   - number/range min & max
 *   - char limits (data-minlength / data-maxlength on the control)
 * Shows `.optset-field__error` messages + a single dismissible toast and blocks
 * the submit when invalid. Never throws — a runtime error must not wedge the
 * native add-to-cart flow.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { toNumber } from './money';

const TD = 'option-set-builder';

/**
 * Set or clear a field's inline error.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {string}      msg     Message ('' clears).
 * @return {void}
 */
function setError( fieldEl, msg ) {
	const el = fieldEl.querySelector( '.optset-field__error' );
	if ( ! el ) {
		return;
	}
	el.textContent = msg || '';
	if ( msg ) {
		el.classList.add( 'optset-field__error--visible' );
		fieldEl.classList.add( 'optset-field--invalid' );
	} else {
		el.classList.remove( 'optset-field__error--visible' );
		fieldEl.classList.remove( 'optset-field--invalid' );
	}
}

/**
 * Show a transient toast inside the options wrapper.
 *
 * @param {HTMLElement} root `.optset-options` wrapper.
 * @param {string}      msg  Toast text.
 * @return {void}
 */
function toast( root, msg ) {
	let el = root.querySelector( '.optset-toast' );
	if ( ! el ) {
		el = document.createElement( 'div' );
		el.className = 'optset-toast';
		el.setAttribute( 'role', 'alert' );
		root.appendChild( el );
	}
	el.textContent = msg;
	el.classList.add( 'optset-toast--visible' );
	window.clearTimeout( el._t );
	el._t = window.setTimeout( () => {
		el.classList.remove( 'optset-toast--visible' );
	}, 4000 );
}

/**
 * Whether a selection entry counts as "filled".
 *
 * @param {object|null} entry Selection entry.
 * @return {boolean} True when non-empty.
 */
function isFilled( entry ) {
	if ( ! entry ) {
		return false;
	}
	const v = entry.value;
	if ( v === null || v === undefined ) {
		return false;
	}
	if ( Array.isArray( v ) ) {
		return v.length > 0;
	}
	if ( typeof v === 'object' ) {
		return Object.keys( v ).some( ( k ) => String( v[ k ] ).trim() !== '' );
	}
	return String( v ).trim() !== '';
}

/**
 * Validate one visible field. Returns an error message or ''.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {object|null} entry   Selection entry (may be null).
 * @return {string} Error message or empty string.
 */
function validateField( fieldEl, entry ) {
	const type = fieldEl.getAttribute( 'data-type' ) || '';
	const required = fieldEl.getAttribute( 'data-required' ) === 'yes';

	if ( required && ! isFilled( entry ) ) {
		return __( 'This field is required.', TD );
	}

	// Choice-group min/max selection bounds.
	const group = fieldEl.querySelector(
		'[data-min-select], [data-max-select]'
	);
	if ( group && entry && Array.isArray( entry.choiceIndexes ) ) {
		const count = entry.choiceIndexes.length;
		const min = parseInt(
			group.getAttribute( 'data-min-select' ) || '',
			10
		);
		const max = parseInt(
			group.getAttribute( 'data-max-select' ) || '',
			10
		);
		if ( ! isNaN( min ) && min > 0 && count > 0 && count < min ) {
			return __( 'Select at least', TD ) + ' ' + min + '.';
		}
		if ( ! isNaN( max ) && max > 0 && count > max ) {
			return __( 'Select at most', TD ) + ' ' + max + '.';
		}
	}

	// Number / range bounds.
	if ( ( type === 'number' || type === 'range' ) && entry ) {
		const ctrl = fieldEl.querySelector(
			'input[name="optset_input_' +
				fieldEl.getAttribute( 'data-field-id' ) +
				'"]'
		);
		if ( ctrl && String( entry.value ).trim() !== '' ) {
			const n = toNumber( entry.value );
			const min = ctrl.getAttribute( 'min' );
			const max = ctrl.getAttribute( 'max' );
			if ( min !== null && min !== '' && n < toNumber( min ) ) {
				return __( 'Value is below the minimum.', TD );
			}
			if ( max !== null && max !== '' && n > toNumber( max ) ) {
				return __( 'Value is above the maximum.', TD );
			}
		}
	}

	// Char limits for text-ish controls.
	if ( entry && typeof entry.value === 'string' ) {
		const ctrl = fieldEl.querySelector(
			'[name="optset_input_' + fieldEl.getAttribute( 'data-field-id' ) + '"]'
		);
		if ( ctrl ) {
			const minLen = parseInt(
				ctrl.getAttribute( 'data-minlength' ) ||
					ctrl.getAttribute( 'minlength' ) ||
					'',
				10
			);
			const maxLen = parseInt(
				ctrl.getAttribute( 'data-maxlength' ) ||
					ctrl.getAttribute( 'maxlength' ) ||
					'',
				10
			);
			const len = entry.value.length;
			if ( ! isNaN( minLen ) && minLen > 0 && len > 0 && len < minLen ) {
				return __( 'Entry is too short.', TD );
			}
			if ( ! isNaN( maxLen ) && maxLen > 0 && len > maxLen ) {
				return __( 'Entry is too long.', TD );
			}
		}
	}

	// File count bounds.
	if ( type === 'fileupload' ) {
		const fileInput = fieldEl.querySelector( '.optset-upload__input' );
		const count =
			entry && Array.isArray( entry.value ) ? entry.value.length : 0;
		if ( fileInput ) {
			const min = parseInt(
				fileInput.getAttribute( 'data-min' ) || '',
				10
			);
			const max = parseInt(
				fileInput.getAttribute( 'data-max' ) || '',
				10
			);
			if ( ! isNaN( min ) && min > 0 && count < min ) {
				return __( 'Please upload the required files.', TD );
			}
			if ( ! isNaN( max ) && max > 0 && count > max ) {
				return __( 'Too many files uploaded.', TD );
			}
		}
	}

	return '';
}

/**
 * Validate every visible field for a form.
 *
 * @param {HTMLElement} root          `.optset-options` wrapper.
 * @param {Object}      selections    fieldId → selection entry.
 * @param {Object}      fieldElements fieldId → wrapper element.
 * @param {Object}      visibility    fieldId → boolean (true = visible).
 * @return {{ ok:boolean, required:string[], minmax:string[] }} Result.
 */
export function validateAll( root, selections, fieldElements, visibility ) {
	const required = [];
	const minmax = [];
	let firstInvalid = null;

	Object.keys( fieldElements ).forEach( ( fieldId ) => {
		const fieldEl = fieldElements[ fieldId ];
		if ( visibility[ fieldId ] === false ) {
			setError( fieldEl, '' );
			return;
		}
		const msg = ( function () {
			try {
				return validateField( fieldEl, selections[ fieldId ] || null );
			} catch ( e ) {
				return '';
			}
		} )();
		if ( msg ) {
			setError( fieldEl, msg );
			if ( msg === __( 'This field is required.', TD ) ) {
				required.push( fieldId );
			} else {
				minmax.push( fieldId );
			}
			if ( ! firstInvalid ) {
				firstInvalid = fieldEl;
			}
		} else {
			setError( fieldEl, '' );
		}
	} );

	const ok = required.length === 0 && minmax.length === 0;
	if ( ! ok ) {
		toast(
			root,
			__( 'Please complete the required product options.', TD )
		);
		if ( firstInvalid && firstInvalid.scrollIntoView ) {
			try {
				firstInvalid.scrollIntoView( {
					behavior: 'smooth',
					block: 'center',
				} );
			} catch ( e ) {
				/* ignore */
			}
		}
	}
	return { ok, required, minmax };
}
