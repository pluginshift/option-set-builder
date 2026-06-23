/**
 * Conditional-logic engine.
 *
 * Reads each field's `data-logic-rules` JSON
 * ({ action:'show'|'hide', match:'all'|'any',
 *    rules:[{ source, operator, value }] }) and toggles `.optset-hidden` on the
 * field wrapper. Operators per ARCHITECTURE §6:
 * is, is_not, empty, not_empty, contains, not_contains, gt, lt, gte, lte,
 * starts_with, between, checked.
 *
 * `action` decides what a satisfied condition does:
 *   - 'show' (default): field is hidden until the rules match.
 *   - 'hide': field is visible until the rules match, then hidden.
 *
 * Hidden fields are excluded from pricing and required validation by the
 * controller, which reads the visibility map produced here.
 *
 * Sentinel rule values let a Toggle/boolean source be matched without knowing
 * its choice label: `__checked__` / `__unchecked__` compare the field's
 * checked state directly.
 *
 * @package
 */

import { toNumber } from './money';

/**
 * Reduce a selection entry to a comparable scalar string for operators.
 *
 * @param {object|undefined} entry Selection entry for the source field.
 * @return {string} Comparable string ('' when nothing chosen).
 */
function sourceScalar( entry ) {
	if ( ! entry ) {
		return '';
	}
	const v = entry.value;
	if ( v === null || v === undefined ) {
		return '';
	}
	if ( Array.isArray( v ) ) {
		return v
			.map( ( x ) =>
				x && typeof x === 'object'
					? String( x.label !== undefined ? x.label : x.name || '' )
					: String( x )
			)
			.join( ',' );
	}
	if ( typeof v === 'object' ) {
		// datetime { date, time } etc.
		return Object.keys( v )
			.map( ( k ) => String( v[ k ] ) )
			.join( ' ' )
			.trim();
	}
	return String( v );
}

/**
 * Reduce a selection entry to the list of comparable scalar strings. A choice
 * group yields one string per selected choice (so membership operators can
 * match a single chosen option); a scalar field yields a single-element list.
 *
 * @param {object|undefined} entry Selection entry for the source field.
 * @return {string[]} Comparable strings (empty array when nothing chosen).
 */
function sourceValues( entry ) {
	if ( ! entry ) {
		return [];
	}
	const v = entry.value;
	if ( v === null || v === undefined || v === '' ) {
		return [];
	}
	if ( Array.isArray( v ) ) {
		return v.map( ( x ) =>
			x && typeof x === 'object'
				? String( x.label !== undefined ? x.label : x.name || '' )
				: String( x )
		);
	}
	const s = sourceScalar( entry );
	return s === '' ? [] : [ s ];
}

/**
 * Whether the source field currently has any selection/value.
 *
 * @param {object|undefined} entry Source selection entry.
 * @return {boolean} True when non-empty.
 */
function sourceChecked( entry ) {
	if ( ! entry ) {
		return false;
	}
	if ( Array.isArray( entry.choiceIndexes ) && entry.choiceIndexes.length ) {
		return true;
	}
	const s = sourceScalar( entry );
	return s !== '' && s !== '0';
}

/**
 * Evaluate one rule against the live selections map.
 *
 * @param {Object} rule       { source, operator, value }.
 * @param {Object} selections fieldId → selection entry.
 * @return {boolean} Rule outcome.
 */
function evalRule( rule, selections ) {
	const entry = selections[ rule.source ];
	const left = sourceScalar( entry );
	const values = sourceValues( entry );
	const right = rule.value === undefined ? '' : String( rule.value );
	const op = rule.operator;

	// Boolean sentinels (Toggle "Checked"/"Unchecked"): compare the checked
	// state directly, regardless of the chosen operator.
	if ( right === '__checked__' ) {
		return op === 'is_not'
			? ! sourceChecked( entry )
			: sourceChecked( entry );
	}
	if ( right === '__unchecked__' ) {
		return op === 'is_not'
			? sourceChecked( entry )
			: ! sourceChecked( entry );
	}

	switch ( op ) {
		case 'is':
			// Match when ANY selected value equals the target (works for both
			// single-value fields and multi-select choice groups).
			return values.indexOf( right ) !== -1;
		case 'is_not':
			return values.indexOf( right ) === -1;
		case 'empty':
			return values.length === 0;
		case 'not_empty':
			return values.length > 0;
		case 'contains':
			return values.some( ( v ) => v.indexOf( right ) !== -1 );
		case 'not_contains':
			return ! values.some( ( v ) => v.indexOf( right ) !== -1 );
		case 'gt':
			return toNumber( left ) > toNumber( right );
		case 'lt':
			return toNumber( left ) < toNumber( right );
		case 'gte':
			return toNumber( left ) >= toNumber( right );
		case 'lte':
			return toNumber( left ) <= toNumber( right );
		case 'starts_with':
			return left.indexOf( right ) === 0;
		case 'between': {
			const parts = right.split( ',' ).map( ( p ) => toNumber( p ) );
			const n = toNumber( left );
			if ( parts.length < 2 ) {
				return false;
			}
			const lo = Math.min( parts[ 0 ], parts[ 1 ] );
			const hi = Math.max( parts[ 0 ], parts[ 1 ] );
			return n >= lo && n <= hi;
		}
		case 'checked':
			return sourceChecked( entry );
		default:
			return true;
	}
}

/**
 * Parse a field's logic rules from its wrapper.
 *
 * @param {HTMLElement} fieldEl `.optset-field` wrapper.
 * @return {object|null} { match, rules } or null when no logic.
 */
export function readLogic( fieldEl ) {
	if ( fieldEl.getAttribute( 'data-logic' ) !== 'yes' ) {
		return null;
	}
	const raw = fieldEl.getAttribute( 'data-logic-rules' );
	if ( ! raw ) {
		return null;
	}
	try {
		const parsed = JSON.parse( raw );
		if ( parsed && Array.isArray( parsed.rules ) && parsed.rules.length ) {
			return {
				action: parsed.action === 'hide' ? 'hide' : 'show',
				match: parsed.match === 'any' ? 'any' : 'all',
				rules: parsed.rules,
			};
		}
	} catch ( e ) {
		return null;
	}
	return null;
}

/**
 * Decide a field's visibility from its logic + the live selections.
 *
 * @param {Object} logic      { action, match, rules } (from readLogic).
 * @param {Object} selections fieldId → selection entry.
 * @return {boolean} True = the field should be visible.
 */
export function isVisible( logic, selections ) {
	if ( ! logic ) {
		return true;
	}
	const results = logic.rules.map( ( r ) => evalRule( r, selections ) );
	const matched =
		logic.match === 'any'
			? results.some( Boolean )
			: results.every( Boolean );

	// 'hide' inverts: matched → hidden. 'show' (default): matched → visible.
	return logic.action === 'hide' ? ! matched : matched;
}

/**
 * Apply a visibility decision to a field wrapper.
 *
 * @param {HTMLElement} fieldEl Field wrapper.
 * @param {boolean}     visible Visible flag.
 * @return {void}
 */
export function applyVisibility( fieldEl, visible ) {
	if ( visible ) {
		fieldEl.classList.remove( 'optset-hidden' );
	} else {
		fieldEl.classList.add( 'optset-hidden' );
	}
}
