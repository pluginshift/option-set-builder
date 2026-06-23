/**
 * General-tab config for the Time field — pricing, the selectable time window
 * (min/max), the picker step, and 12/24-hour display. Times are stored as
 * 24-hour `HH:MM` strings (the format flatpickr min/max accept and the store
 * widget re-reads); the 12-hour controls convert to/from that on the fly.
 *
 * The control surface is our own (hour/minute inputs + a meridiem segmented
 * toggle) rather than a clone of any third-party picker UI. Pricing lives on
 * choices[0] like the other single-value fields.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { Field, TextControl } from '../../../components';
import ValuePricing from './ValuePricing';

/** Display-format modes. */
const FORMAT_MODES = [
	{
		value: true,
		label: __( '12 Hours', 'option-set-builder' ),
	},
	{
		value: false,
		label: __( '24 Hours', 'option-set-builder' ),
	},
];

/**
 * Clamp + zero-pad an integer string to two digits within [min,max].
 *
 * @param {string} raw Raw input.
 * @param {number} min Lower bound.
 * @param {number} max Upper bound.
 * @return {string} Two-digit string.
 */
function pad( raw, min, max ) {
	let n = parseInt( raw, 10 );
	if ( isNaN( n ) ) {
		n = min;
	}
	n = Math.max( min, Math.min( max, n ) );
	return String( n ).padStart( 2, '0' );
}

/**
 * Split a stored 24h "HH:MM" string into { h, m, ap, h12 }.
 *
 * @param {string} value 24-hour time.
 * @return {{h:number,m:string,ap:string,h12:string}} Parts.
 */
function parse24( value ) {
	const m = /^(\d{1,2}):(\d{2})$/.exec( value || '' );
	const h = m ? Math.max( 0, Math.min( 23, parseInt( m[ 1 ], 10 ) ) ) : 0;
	const mm = m ? m[ 2 ] : '00';
	const ap = h >= 12 ? 'PM' : 'AM';
	const h12 = h % 12 === 0 ? 12 : h % 12;
	return { h, m: mm, ap, h12: String( h12 ).padStart( 2, '0' ) };
}

/**
 * Build a 24h "HH:MM" string from 12-hour parts.
 *
 * @param {number} h12 Hour 1–12.
 * @param {string} mm  Minutes.
 * @param {string} ap  AM | PM.
 * @return {string} 24-hour time.
 */
function to24( h12, mm, ap ) {
	let h = h12 % 12;
	if ( ap === 'PM' ) {
		h += 12;
	}
	return `${ String( h ).padStart( 2, '0' ) }:${ mm }`;
}

/**
 * Segmented (radio-like) button group.
 *
 * @param {Object}   props          Component props.
 * @param {*}        props.value    Selected value.
 * @param {Array}    props.options  [{ value, label }].
 * @param {Function} props.onChange (value) => void.
 * @return {JSX.Element} The control.
 */
function Segmented( { value, options, onChange } ) {
	return (
		<div className="optset-seg" role="radiogroup">
			{ options.map( ( opt ) => (
				<button
					key={ String( opt.value ) }
					type="button"
					role="radio"
					aria-checked={ value === opt.value }
					className={ `optset-seg__btn${
						value === opt.value ? ' is-active' : ''
					}` }
					onClick={ () => onChange( opt.value ) }
				>
					{ opt.label }
				</button>
			) ) }
		</div>
	);
}

/**
 * A single hour:minute (+ meridiem when 12h) time editor.
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.value    Stored 24-hour "HH:MM" (or '').
 * @param {boolean}  props.hour12   Whether to show the AM/PM toggle.
 * @param {Function} props.onChange (next:string) => void.
 * @return {JSX.Element} The control.
 */
function TimeInput( { value, hour12, onChange } ) {
	const parts = parse24( value || '00:00' );

	const setHour = ( raw ) => {
		if ( hour12 ) {
			onChange(
				to24( parseInt( pad( raw, 1, 12 ), 10 ), parts.m, parts.ap )
			);
		} else {
			onChange( `${ pad( raw, 0, 23 ) }:${ parts.m }` );
		}
	};
	const setMin = ( raw ) =>
		onChange(
			hour12
				? to24( parseInt( parts.h12, 10 ), pad( raw, 0, 59 ), parts.ap )
				: `${ pad( String( parts.h ), 0, 23 ) }:${ pad( raw, 0, 59 ) }`
		);
	const setAp = ( ap ) =>
		onChange( to24( parseInt( parts.h12, 10 ), parts.m, ap ) );

	return (
		<div className="optset-timeinput">
			<input
				type="number"
				className="optset-input optset-timeinput__num"
				min={ hour12 ? 1 : 0 }
				max={ hour12 ? 12 : 23 }
				value={ hour12 ? parts.h12 : pad( String( parts.h ), 0, 23 ) }
				onChange={ ( e ) => setHour( e.target.value ) }
			/>
			<span className="optset-timeinput__sep">:</span>
			<input
				type="number"
				className="optset-input optset-timeinput__num"
				min={ 0 }
				max={ 59 }
				value={ parts.m }
				onChange={ ( e ) => setMin( e.target.value ) }
			/>
			{ hour12 && (
				<Segmented
					value={ parts.ap }
					options={ [
						{ value: 'AM', label: 'AM' },
						{ value: 'PM', label: 'PM' },
					] }
					onChange={ setAp }
				/>
			) }
		</div>
	);
}

/**
 * TimeConfig.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.node          Selected node.
 * @param {Function} props.patch         (partialNode) => void.
 * @param {boolean}  [props.showPricing] Render the pricing panel (default true;
 *                                       the combined Date & Time field renders
 *                                       pricing once at the top instead).
 * @return {JSX.Element} The config block.
 */
export default function TimeConfig( { node, patch, showPricing = true } ) {
	const cfg = node.config || {};
	const hour12 = cfg.hour12 !== false;
	const setKey = ( key, value ) =>
		patch( { config: { ...cfg, [ key ]: value } } );

	return (
		<>
			{ showPricing && <ValuePricing node={ node } patch={ patch } /> }

			<div className="optset-settings__group">
				<p className="optset-field-group__title">
					{ __(
						'Display',
						'option-set-builder'
					) }
				</p>
				<div className="optset-settings__grid2">
					<Field
						label={ __(
							'Time format',
							'option-set-builder'
						) }
					>
						<Segmented
							value={ hour12 }
							options={ FORMAT_MODES }
							onChange={ ( v ) => setKey( 'hour12', v ) }
						/>
					</Field>
					<Field
						label={ __(
							'Step (minutes)',
							'option-set-builder'
						) }
					>
						<TextControl
							type="number"
							value={ cfg.step ?? '' }
							onChange={ ( v ) => setKey( 'step', v ) }
						/>
					</Field>
				</div>
			</div>

			<div className="optset-settings__group">
				<p className="optset-field-group__title">
					{ __(
						'Selectable range',
						'option-set-builder'
					) }
				</p>
				<div className="optset-settings__grid2">
					<Field
						label={ __(
							'Earliest time',
							'option-set-builder'
						) }
						help={ __(
							'Leave at 00:00 for no limit.',
							'option-set-builder'
						) }
					>
						<TimeInput
							value={ cfg.minTime || '' }
							hour12={ hour12 }
							onChange={ ( v ) => setKey( 'minTime', v ) }
						/>
					</Field>
					<Field
						label={ __(
							'Latest time',
							'option-set-builder'
						) }
						help={ __(
							'Leave at 00:00 for no limit.',
							'option-set-builder'
						) }
					>
						<TimeInput
							value={ cfg.maxTime || '' }
							hour12={ hour12 }
							onChange={ ( v ) => setKey( 'maxTime', v ) }
						/>
					</Field>
				</div>
			</div>
		</>
	);
}
