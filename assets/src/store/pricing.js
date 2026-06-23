/**
 * Client-side option pricing — mirrors OptionSetBuilder\Pricing\PriceCalculator (§13).
 *
 * This is a LIVE PREVIEW computation only. The raw selection (base values,
 * never currency-converted) is what gets serialised to the hidden inputs so
 * the server recomputes the authoritative price.
 *
 * Per choice, cost = sale !== '' ? sale : regular:
 *   none             → 0
 *   flat             → cost
 *   percent          → percentBase * cost / 100
 *   per_unit         → unitCount * cost
 *   per_char         → mb-len(value) * cost
 *   per_char_nospace → mb-len(value w/o spaces) * cost
 *   per_word         → wordCount(value) * cost
 *
 * Choice price data is read from data-* attributes the PHP renderers put on
 * each choice input/option: `data-price-mode`, plus `data-cost` (regular) and
 * `data-cost-sale` (sale). Absent → treated as 0 (see report assumptions).
 *
 * @package
 */

import { toNumber, formatMoney } from './money';
import { evaluateSimple, evaluateAdvanced } from './formula';

/**
 * Resolve the effective price mode.
 *
 * @param {string} mode Raw price mode.
 * @return {string} Effective mode.
 */
function gatedMode( mode ) {
	return mode || 'none';
}

/**
 * Effective cost for a choice input element. Sale price takes priority
 * whenever it is set — mirrors the PHP PriceCalculator + the badge display
 * so the live price preview agrees with the cart line.
 *
 * @param {HTMLElement} el Choice input / option element.
 * @return {number} Cost.
 */
function choiceCost( el ) {
	const regular = el.getAttribute( 'data-cost' );
	const sale = el.getAttribute( 'data-cost-sale' );
	if ( sale !== null && sale !== '' ) {
		return toNumber( sale );
	}
	return toNumber( regular );
}

/**
 * Word count parity with PHP str_word_count (whitespace-split, non-empty).
 *
 * @param {string} str Source.
 * @return {number} Word count.
 */
function wordCount( str ) {
	const trimmed = String( str || '' ).trim();
	if ( trimmed === '' ) {
		return 0;
	}
	return trimmed.split( /\s+/ ).length;
}

/**
 * Flatten a selection value into a string for char/word counting.
 *
 * @param {*} value Selection value.
 * @return {string} Flattened string.
 */
function scalar( value ) {
	if ( Array.isArray( value ) ) {
		return value
			.map( ( v ) =>
				v && typeof v === 'object'
					? String( v.label || '' )
					: String( v == null ? '' : v )
			)
			.join( ' ' );
	}
	if ( value && typeof value === 'object' ) {
		return '';
	}
	return value == null ? '' : String( value );
}

/**
 * Whether a single-value selection counts as "not provided" — used to gate
 * value-field surcharges so an untouched optional control adds nothing.
 *
 * @param {*} value Selection value.
 * @return {boolean} True when empty.
 */
function isEmptyValue( value ) {
	if ( value === null || value === undefined ) {
		return true;
	}
	if ( typeof value === 'string' ) {
		return value.trim() === '';
	}
	if ( Array.isArray( value ) ) {
		return value.length === 0;
	}
	if ( typeof value === 'object' ) {
		return Object.keys( value ).every(
			( k ) =>
				String( value[ k ] == null ? '' : value[ k ] ).trim() === ''
		);
	}
	return false;
}

/**
 * Determine the per_unit multiplier (choice count, else numeric value).
 *
 * @param {*}      value Selection value.
 * @param {number} slot  Slot index.
 * @return {number} Count.
 */
function unitCount( value, slot ) {
	if ( Array.isArray( value ) ) {
		const at = value[ slot ];
		if (
			at &&
			typeof at === 'object' &&
			at.count !== undefined &&
			at.count !== ''
		) {
			return toNumber( at.count );
		}
		return 1;
	}
	if ( value && typeof value === 'object' ) {
		if ( value.count !== undefined && value.count !== '' ) {
			return toNumber( value.count );
		}
		return 1;
	}
	return toNumber( value );
}

/**
 * Apply one choice's price mode.
 *
 * @param {string} mode        Effective (gated) mode.
 * @param {number} cost        Choice cost.
 * @param {*}      value       Selection value.
 * @param {number} percentBase Percent base.
 * @param {number} slot        Slot index for per_unit.
 * @return {number} Price contribution.
 */
function modePrice( mode, cost, value, percentBase, slot ) {
	switch ( mode ) {
		case 'none':
			return 0;
		case 'flat':
			return cost;
		case 'percent':
			return ( percentBase * cost ) / 100;
		case 'per_unit':
			return unitCount( value, slot ) * cost;
		case 'per_char':
			return scalar( value ).length * cost;
		case 'per_char_nospace':
			return scalar( value ).replace( /\s/g, '' ).length * cost;
		case 'per_word':
			return wordCount( scalar( value ) ) * cost;
		default:
			return cost;
	}
}

/**
 * Locate the choice input/option elements for a field, in index order.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @return {HTMLElement[]} Choice elements indexed by choice index.
 */
function choiceElements( fieldEl ) {
	const opts = fieldEl.querySelectorAll( '.optset-select__opt[data-index]' );
	if ( opts.length ) {
		const out = [];
		opts.forEach( ( o ) => {
			out[ parseInt( o.getAttribute( 'data-index' ), 10 ) ] = o;
		} );
		return out;
	}
	const inputs = fieldEl.querySelectorAll(
		'input[type="checkbox"], input[type="radio"]'
	);
	const arr = [];
	inputs.forEach( ( input ) => {
		const idx = parseInt( input.value, 10 );
		if ( ! isNaN( idx ) ) {
			arr[ idx ] = input;
		}
	} );
	return arr;
}

/**
 * The single value-driven control (text/number/range/etc.) for a field.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @return {HTMLElement|null} The control bearing data-price-mode.
 */
function valueControl( fieldEl ) {
	return fieldEl.querySelector( '[data-price-mode]' );
}

/**
 * Compute the price contribution for one (non-formula) field.
 *
 * @param {HTMLElement} fieldEl     Field wrapper.
 * @param {Object}      entry       Selection entry.
 * @param {number}      percentBase Percent base.
 * @return {number} Price.
 */
export function priceField( fieldEl, entry, percentBase ) {
	if ( ! entry ) {
		return 0;
	}
	const indexes = Array.isArray( entry.choiceIndexes )
		? entry.choiceIndexes
		: [];

	// Choice-driven fields: sum each selected choice's mode price.
	if ( indexes.length ) {
		const els = choiceElements( fieldEl );
		let total = 0;
		indexes.forEach( ( idx, slot ) => {
			const el = els[ idx ];
			if ( ! el ) {
				return;
			}
			const mode = gatedMode(
				el.getAttribute( 'data-price-mode' ) || 'none'
			);
			total += modePrice(
				mode,
				choiceCost( el ),
				entry.value,
				percentBase,
				slot
			);
		} );
		return total;
	}

	// Single value-driven control: price against its own data-price-mode.
	const ctrl = valueControl( fieldEl );
	if ( ! ctrl ) {
		return 0;
	}
	const mode = gatedMode( ctrl.getAttribute( 'data-price-mode' ) || 'none' );
	if ( mode === 'none' ) {
		return 0;
	}
	// No surcharge until the customer actually provides a value (e.g. picks a
	// date / types text). Empty optional value-fields must not pre-charge.
	if ( isEmptyValue( entry.value ) ) {
		return 0;
	}
	// A bare value control has no per-choice cost attribute by default;
	// renderers that price a single control attach data-cost to it.
	const cost = choiceCost( ctrl );
	return modePrice( mode, cost, entry.value, percentBase, 0 );
}

/**
 * Collect numeric variables for simple-formula evaluation, keyed by field
 * id (mirrors PriceCalculator::collectFormulaVars): number/range values and
 * resolved select choice costs.
 *
 * @param {Object} selections    State selections map.
 * @param {Object} fieldElements fieldId → wrapper element map.
 * @return {Object} name → number map.
 */
export function collectFormulaVars( selections, fieldElements ) {
	const vars = {};
	Object.keys( selections ).forEach( ( fieldId ) => {
		const entry = selections[ fieldId ];
		if ( ! entry || ! entry.type ) {
			return;
		}
		if ( entry.type === 'number' || entry.type === 'range' ) {
			vars[ fieldId ] = toNumber( entry.value );
			return;
		}
		if ( entry.type === 'select' ) {
			const indexes = entry.choiceIndexes || [];
			if ( ! indexes.length ) {
				return;
			}
			const el = fieldElements[ fieldId ];
			if ( ! el ) {
				return;
			}
			const opt = el.querySelector(
				'.optset-select__opt[data-index="' + indexes[ 0 ] + '"]'
			);
			if ( ! opt ) {
				return;
			}
			const mode = gatedMode(
				opt.getAttribute( 'data-price-mode' ) || 'flat'
			);
			vars[ fieldId ] = mode === 'none' ? 0 : choiceCost( opt );
		}
	} );
	return vars;
}

/**
 * Price a formula / advancedformula field from its DOM node.
 *
 * @param {HTMLElement} fieldEl     Field wrapper.
 * @param {string}      type        'formula' | 'advancedformula'.
 * @param {number}      percentBase Product percent base.
 * @param {Object}      simpleVars  Numeric vars for the simple engine.
 * @param {Object}      dynamics    Dynamic vars for the advanced engine.
 * @return {number} Computed price.
 */
export function priceFormula(
	fieldEl,
	type,
	percentBase,
	simpleVars,
	dynamics
) {
	const node = fieldEl.querySelector( '.optset-formula' );
	if ( ! node ) {
		return 0;
	}
	const expr = node.getAttribute( 'data-expression' ) || '';
	if ( expr.trim() === '' ) {
		return 0;
	}
	if ( type === 'advancedformula' ) {
		let bidMap = {};
		const raw = node.getAttribute( 'data-bidmap' );
		if ( raw ) {
			try {
				bidMap = JSON.parse( raw ) || {};
			} catch ( e ) {
				bidMap = {};
			}
		}
		return evaluateAdvanced( expr, Object.assign( {}, bidMap, dynamics ) );
	}
	const vars = Object.assign(
		{ product_price: percentBase },
		simpleVars || {}
	);
	return evaluateSimple( expr, vars );
}

/**
 * Render the price spans (#optset-options-price / #optset-options-total).
 * Display amounts honour currency + conversion; the values written to the
 * hidden inputs elsewhere remain raw/base.
 *
 * @param {HTMLElement} root          `.optset-options` wrapper.
 * @param {number}      optionsPrice  Sum of option prices (base ccy).
 * @param {number}      basePrice     Product base price (base ccy).
 * @param {number}      [linkedPrice] Sum of selected linked-product prices.
 * @return {void}
 */
export function renderPriceSpans( root, optionsPrice, basePrice, linkedPrice ) {
	const priceEl = root.querySelector( '#optset-options-price' );
	const totalEl = root.querySelector( '#optset-options-total' );
	if ( priceEl ) {
		priceEl.innerHTML = formatMoney( optionsPrice );
	}
	if ( totalEl ) {
		totalEl.innerHTML = formatMoney(
			( Number( basePrice ) || 0 ) +
				( Number( optionsPrice ) || 0 ) +
				( Number( linkedPrice ) || 0 )
		);
	}
}
