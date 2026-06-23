/**
 * DOM → selection-entry reader.
 *
 * For each field type slug (ARCHITECTURE §7) this reads the rendered
 * control(s) (DOM contract §8) into a normalised selection entry whose
 * `value` follows the §9 shapes:
 *   - scalar                text/textarea/email/url/tel/number/range/
 *                            select/toggle/colorpicker/font
 *   - [labels]              checkbox/radio/buttongroup/colorswatch/imageswatch
 *   - [{label,count}]       choice groups with a per-choice qty input
 *   - {date,time}           datetime
 *   - [{name,path}]         fileupload (decoded from the hidden JSON input)
 *   - "#hex"                colorpicker
 *
 * @package
 */

import { findCountry } from '../shared/phone';

/**
 * Field types whose value is a single scalar from one input.
 *
 * @type {string[]}
 */
const SCALAR_INPUT_TYPES = [
	'text',
	'textarea',
	'email',
	'url',
	'tel',
	'number',
	'range',
];

/**
 * Choice group types (multi/single radio/checkbox-style inputs).
 *
 * @type {string[]}
 */
const CHOICE_TYPES = [
	'checkbox',
	'radio',
	'buttongroup',
	'colorswatch',
	'imageswatch',
];

/**
 * Read the field-level metadata from the wrapper element.
 *
 * @param {HTMLElement} fieldEl `.optset-field` wrapper.
 * @return {Object} { id, type, setId, label }.
 */
export function fieldMeta( fieldEl ) {
	const id = fieldEl.getAttribute( 'data-field-id' ) || '';
	const type = fieldEl.getAttribute( 'data-type' ) || '';
	const setId = parseInt( fieldEl.getAttribute( 'data-set-id' ) || '0', 10 );
	let label = '';
	const labelEl = fieldEl.querySelector( '.optset-field__label-text' );
	if ( labelEl ) {
		label = labelEl.textContent.replace( /\*\s*$/, '' ).trim();
	}
	return { id, type, setId: setId || 0, label };
}

/**
 * Collect a per-choice quantity for a selected choice input, if present.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {string}      fieldId Field id.
 * @param {string}      index   Choice index.
 * @return {number} Quantity (0 when absent).
 */
function choiceQty( fieldEl, fieldId, index ) {
	const qty = fieldEl.querySelector(
		'[name="optset_qty_' + fieldId + '_' + index + '"]'
	);
	if ( ! qty ) {
		return 0;
	}
	const n = parseFloat( qty.value );
	return isFinite( n ) ? n : 0;
}

/**
 * Build the selection entry for a choice-group field.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectChoice( fieldEl, meta ) {
	const inputs = fieldEl.querySelectorAll(
		'input[type="checkbox"]:checked, input[type="radio"]:checked'
	);
	const labels = [];
	const indexes = [];
	let hasQty = false;
	const withCount = [];

	inputs.forEach( ( input ) => {
		const idx = input.value;
		const label =
			input.getAttribute( 'data-label' ) ||
			( input.nextElementSibling
				? input.nextElementSibling.textContent.trim()
				: idx );
		indexes.push( parseInt( idx, 10 ) );
		labels.push( label );
		const qty = choiceQty( fieldEl, meta.id, idx );
		if ( qty > 0 ) {
			hasQty = true;
		}
		withCount.push( { label, count: qty > 0 ? qty : 1 } );
	} );

	return {
		type: meta.type,
		setId: meta.setId,
		label: meta.label,
		value: hasQty ? withCount : labels,
		choiceIndexes: indexes,
		dynamics: {},
	};
}

/**
 * Build the selection entry for a toggle field.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectToggle( fieldEl, meta ) {
	const input = fieldEl.querySelector( '.optset-toggle__input' );
	const on = !! ( input && input.checked );

	// Off → no choice selected, so an empty value. This keeps the field out of
	// the single-value pricing fallback (which would otherwise charge the
	// flat price even while the switch is off).
	if ( ! on ) {
		return {
			type: meta.type,
			setId: meta.setId,
			label: meta.label,
			value: '',
			choiceIndexes: [],
			dynamics: {},
		};
	}

	// On → behave like a single selected choice. Carry the count (default 1)
	// so per-unit pricing and the quantity box work like the other choices.
	const label = ( input && input.getAttribute( 'data-label' ) ) || '';
	const qty = choiceQty( fieldEl, meta.id, '0' );
	return {
		type: meta.type,
		setId: meta.setId,
		label: meta.label,
		value: [ { label, count: qty > 0 ? qty : 1 } ],
		choiceIndexes: [ 0 ],
		dynamics: {},
	};
}

/**
 * Build the selection entry for select / fontpicker (hidden value input).
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectSelect( fieldEl, meta ) {
	const hidden = fieldEl.querySelector( '.optset-select__value' );
	const raw = hidden ? hidden.value : '';
	const indexes = [];
	let label = '';
	if ( raw !== '' && ! isNaN( parseInt( raw, 10 ) ) ) {
		const idx = parseInt( raw, 10 );
		indexes.push( idx );
		const opt = fieldEl.querySelector(
			'.optset-select__opt[data-index="' + idx + '"]'
		);
		if ( opt ) {
			label = opt.getAttribute( 'data-label' ) || '';
		}
	}
	return {
		type: meta.type,
		setId: meta.setId,
		label: meta.label,
		value: label,
		choiceIndexes: indexes,
		dynamics: {},
	};
}

/**
 * Build the selection entry for a single scalar input field.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectScalar( fieldEl, meta ) {
	const input = fieldEl.querySelector(
		'input[name="optset_input_' +
			meta.id +
			'"], textarea[name="optset_input_' +
			meta.id +
			'"]'
	);
	return {
		type: meta.type,
		setId: meta.setId,
		label: meta.label,
		value: input ? input.value : '',
		choiceIndexes: [],
		dynamics: {},
	};
}

/**
 * Build the selection entry for a phone field. Reads the number input and, when
 * the country selector shows the dial code (flag_dial style), prefixes the
 * selected country's dial code so the stored/order value is a complete number
 * ("+880 1712…"). Other flag styles store the typed number as-is.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectPhone( fieldEl, meta ) {
	const input = fieldEl.querySelector(
		'input[name="optset_input_' + meta.id + '"]'
	);
	let value = input ? input.value : '';
	const box = fieldEl.querySelector( '.optset-phone' );
	if ( box && value.trim() !== '' ) {
		const style = box.getAttribute( 'data-flag-style' );
		if ( style === 'flag_dial' ) {
			const isoEl = box.querySelector( '.optset-phone__iso' );
			const country = isoEl ? findCountry( isoEl.value ) : null;
			if ( country ) {
				value = '+' + country.dial + ' ' + value;
			}
		}
	}
	return {
		type: meta.type,
		setId: meta.setId,
		label: meta.label,
		value,
		choiceIndexes: [],
		dynamics: {},
	};
}

/**
 * Build the selection entry for the color picker (returns "#hex").
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectColor( fieldEl, meta ) {
	const input = fieldEl.querySelector( '.optset-colorpicker__input' );
	return {
		type: meta.type,
		setId: meta.setId,
		label: meta.label,
		value: input ? input.value : '',
		choiceIndexes: [],
		dynamics: {},
	};
}

/**
 * Build the selection entry for datetime ({ date, time }).
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectDatetime( fieldEl, meta ) {
	const dateEl = fieldEl.querySelector(
		'[name="optset_input_' + meta.id + '_date"]'
	);
	const timeEl = fieldEl.querySelector(
		'[name="optset_input_' + meta.id + '_time"]'
	);
	return {
		type: meta.type,
		setId: meta.setId,
		label: meta.label,
		value: {
			date: dateEl ? dateEl.value : '',
			time: timeEl ? timeEl.value : '',
		},
		choiceIndexes: [],
		dynamics: {},
	};
}

/**
 * Build the selection entry for fileupload ([{ name, path }]).
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {Object}      meta    Field meta.
 * @return {Object} Selection entry.
 */
function collectUpload( fieldEl, meta ) {
	const hidden = fieldEl.querySelector( '.optset-upload__data' );
	let files = [];
	if ( hidden && hidden.value ) {
		try {
			const parsed = JSON.parse( hidden.value );
			if ( Array.isArray( parsed ) ) {
				files = parsed;
			}
		} catch ( e ) {
			files = [];
		}
	}
	return {
		type: meta.type,
		setId: meta.setId,
		label: meta.label,
		value: files,
		choiceIndexes: [],
		dynamics: {},
	};
}

/**
 * Build the linked-products list for a linkedproducts field.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @return {Array<object>} [{ id, count, variation }].
 */
export function collectLinkedProducts( fieldEl ) {
	const selected = fieldEl.querySelectorAll( '.optset-linked__native:checked' );
	const list = [];
	selected.forEach( ( input ) => {
		const pid = parseInt(
			input.getAttribute( 'data-product-id' ) || input.value || '0',
			10
		);
		// A merged variable product carries its chosen variation in a sibling
		// <select>; otherwise the variation id is baked onto the input.
		const card = input.closest( '.optset-linked__card' );
		const varSel = card && card.querySelector( '.optset-linked__varsel' );
		let variation = parseInt(
			input.getAttribute( 'data-variation' ) || '0',
			10
		);
		if ( varSel && varSel.value ) {
			variation = parseInt( varSel.value, 10 ) || variation;
		}
		// Per-card quantity stepper, when the field enables quantity.
		const qtyEl = card && card.querySelector( '.optset-linked__qty' );
		const count = qtyEl
			? Math.max( 1, parseInt( qtyEl.value, 10 ) || 1 )
			: 1;

		// Effective unit price for the on-page total. A merged variable card
		// reads the price of its selected variation <option>; otherwise the
		// price is baked onto the native input. WooCommerce already resolves
		// sale prices, so this is the real per-unit cost.
		let price = 0;
		if ( varSel && varSel.selectedOptions && varSel.selectedOptions[ 0 ] ) {
			price = parseFloat(
				varSel.selectedOptions[ 0 ].getAttribute( 'data-price' ) || '0'
			);
		} else {
			price = parseFloat( input.getAttribute( 'data-lp-price' ) || '0' );
		}
		if ( ! isFinite( price ) ) {
			price = 0;
		}

		if ( pid > 0 ) {
			list.push( {
				id: pid,
				count,
				variation: variation > 0 ? variation : 0,
				price,
			} );
		}
	} );
	return list;
}

/**
 * Read one field wrapper into its selection entry.
 *
 * Layout-only / non-value types (heading, html, divider, spacer, section,
 * popup, shortcode, formula, advancedformula, linkedproducts) return null —
 * they carry no `optset_field_data` value (formula prices are computed in
 * pricing.js, linked products tracked separately).
 *
 * @param {HTMLElement} fieldEl `.optset-field` wrapper.
 * @return {object|null} Selection entry or null.
 */
export function collectField( fieldEl ) {
	const meta = fieldMeta( fieldEl );
	const type = meta.type;

	if ( CHOICE_TYPES.indexOf( type ) !== -1 ) {
		return collectChoice( fieldEl, meta );
	}
	if ( type === 'toggle' ) {
		return collectToggle( fieldEl, meta );
	}
	if ( type === 'select' || type === 'fontpicker' ) {
		return collectSelect( fieldEl, meta );
	}
	if ( type === 'tel' ) {
		return collectPhone( fieldEl, meta );
	}
	if ( SCALAR_INPUT_TYPES.indexOf( type ) !== -1 ) {
		return collectScalar( fieldEl, meta );
	}
	if ( type === 'colorpicker' ) {
		return collectColor( fieldEl, meta );
	}
	if ( type === 'datetime' ) {
		return collectDatetime( fieldEl, meta );
	}
	if ( type === 'date' || type === 'time' ) {
		return collectScalar( fieldEl, meta );
	}
	if ( type === 'fileupload' ) {
		return collectUpload( fieldEl, meta );
	}

	// formula / advancedformula / layout-only types: no DOM value.
	return null;
}
