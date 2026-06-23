/**
 * Controlled text/number/textarea input wrapper. Prefers a plain element
 * over @wordpress/components so the builder stays light, but keeps the same
 * value/onChange contract.
 *
 * @package
 */

/**
 * TextControl.
 *
 * @param {Object}   props               Component props.
 * @param {string}   props.value         Current value.
 * @param {Function} props.onChange      (nextValue) => void.
 * @param {string}   [props.type]        Input type or "textarea".
 * @param {string}   [props.placeholder] Placeholder.
 * @param {number}   [props.rows]        Textarea rows.
 * @param {string}   [props.id]          Element id (injected by <Field/>).
 * @param {Object}   [props.rest]        Any extra DOM props.
 * @return {JSX.Element} The control.
 */
export default function TextControl( {
	value,
	onChange,
	type = 'text',
	placeholder = '',
	rows = 4,
	id,
	...rest
} ) {
	if ( type === 'textarea' ) {
		return (
			<textarea
				id={ id }
				className="optset-input optset-input--textarea"
				value={ value ?? '' }
				rows={ rows }
				placeholder={ placeholder }
				onChange={ ( e ) => onChange( e.target.value ) }
				{ ...rest }
			/>
		);
	}
	return (
		<input
			id={ id }
			type={ type }
			className="optset-input"
			value={ value ?? '' }
			placeholder={ placeholder }
			onChange={ ( e ) => onChange( e.target.value ) }
			{ ...rest }
		/>
	);
}
