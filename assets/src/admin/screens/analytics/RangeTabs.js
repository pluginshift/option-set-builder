/**
 * Date-range segmented control (Today / 7 / 30 / 90 days).
 *
 * Implemented as a single-select radio group: roving focus, Arrow/Home/End
 * keyboard support and an aria-checked state per option.
 *
 * @package
 */

import { useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { RANGES, rangeLabel } from './helpers';

/**
 * RangeTabs.
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.value    Active range id.
 * @param {Function} props.onChange (id) => void.
 * @param {boolean}  [props.busy]   Disable while a fetch is in flight.
 * @return {JSX.Element} The control.
 */
export default function RangeTabs( { value, onChange, busy = false } ) {
	const refs = useRef( [] );

	/**
	 * Roving keyboard handler.
	 *
	 * @param {KeyboardEvent} e Key event.
	 * @param {number}        i Current index.
	 * @return {void}
	 */
	const onKeyDown = ( e, i ) => {
		const last = RANGES.length - 1;
		let next = null;
		if ( e.key === 'ArrowRight' || e.key === 'ArrowDown' ) {
			next = i >= last ? 0 : i + 1;
		} else if ( e.key === 'ArrowLeft' || e.key === 'ArrowUp' ) {
			next = i <= 0 ? last : i - 1;
		} else if ( e.key === 'Home' ) {
			next = 0;
		} else if ( e.key === 'End' ) {
			next = last;
		}
		if ( next === null ) {
			return;
		}
		e.preventDefault();
		onChange( RANGES[ next ].id );
		const el = refs.current[ next ];
		if ( el ) {
			el.focus();
		}
	};

	return (
		<div
			className="optset-an-range"
			role="radiogroup"
			aria-label={ __(
				'Analytics date range',
				'option-set-builder'
			) }
		>
			{ RANGES.map( ( r, i ) => {
				const active = r.id === value;
				return (
					<button
						key={ r.id }
						type="button"
						ref={ ( el ) => ( refs.current[ i ] = el ) }
						role="radio"
						aria-checked={ active }
						tabIndex={ active ? 0 : -1 }
						disabled={ busy }
						className={ `optset-an-range__btn${
							active ? ' is-active' : ''
						}` }
						onClick={ () => onChange( r.id ) }
						onKeyDown={ ( e ) => onKeyDown( e, i ) }
					>
						{ rangeLabel( r.id ) }
					</button>
				);
			} ) }
		</div>
	);
}
