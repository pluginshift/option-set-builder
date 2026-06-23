/**
 * Controlled single-date input backed by flatpickr. Emits the picked date as a
 * formatted string (matching the field's configured format) so the builder can
 * store plain strings in `config` and the storefront can re-parse them with the
 * same library. Kept intentionally thin: no business logic, just value⇄picker
 * sync and a stable onChange contract mirroring the other admin controls.
 *
 * @package
 */

import { useEffect, useRef } from '@wordpress/element';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

/**
 * DatePicker.
 *
 * @param {Object}   props               Component props.
 * @param {string}   props.value         Current formatted date string.
 * @param {Function} props.onChange      (next:string) => void.
 * @param {string}   [props.dateFormat]  flatpickr/PHP date token (default d/m/Y).
 * @param {string}   [props.placeholder] Input placeholder.
 * @param {string}   [props.id]          Element id (injected by <Field/>).
 * @return {JSX.Element} The control.
 */
export default function DatePicker( {
	value,
	onChange,
	dateFormat = 'd/m/Y',
	placeholder = '',
	id,
} ) {
	const inputRef = useRef( null );
	const fpRef = useRef( null );
	const onChangeRef = useRef( onChange );
	onChangeRef.current = onChange;

	// (Re)create the picker whenever the format changes.
	useEffect( () => {
		if ( ! inputRef.current ) {
			return undefined;
		}
		fpRef.current = flatpickr( inputRef.current, {
			dateFormat,
			defaultDate: value || undefined,
			allowInput: false,
			onChange: ( _dates, str ) => onChangeRef.current( str ),
		} );
		return () => {
			if ( fpRef.current ) {
				fpRef.current.destroy();
				fpRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ dateFormat ] );

	// Mirror external value changes back into the picker.
	useEffect( () => {
		if (
			fpRef.current &&
			inputRef.current &&
			value !== inputRef.current.value
		) {
			fpRef.current.setDate( value || '', false );
		}
	}, [ value ] );

	return (
		<input
			id={ id }
			ref={ inputRef }
			type="text"
			className="optset-input optset-datepicker-input"
			placeholder={ placeholder }
			defaultValue={ value }
			readOnly
		/>
	);
}
