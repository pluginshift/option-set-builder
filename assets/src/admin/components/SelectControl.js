/**
 * Controlled native <select> wrapper with a normalised options prop.
 *
 * @package
 */

/**
 * Normalise an option entry to { value, label, disabled }.
 *
 * @param {*} opt String or object option.
 * @return {{value:string,label:string,disabled:boolean}} Normalised.
 */
function norm( opt ) {
	if ( typeof opt === 'string' ) {
		return { value: opt, label: opt, disabled: false };
	}
	return {
		value: opt.value,
		label: opt.label ?? String( opt.value ),
		disabled: !! opt.disabled,
	};
}

/**
 * SelectControl.
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.value    Selected value.
 * @param {Function} props.onChange (value) => void.
 * @param {Array}    props.options  Options (string|{value,label,disabled}).
 * @param {string}   [props.id]     Element id.
 * @return {JSX.Element} The select.
 */
export default function SelectControl( { value, onChange, options = [], id } ) {
	return (
		<select
			id={ id }
			className="optset-input optset-select-control"
			value={ value ?? '' }
			onChange={ ( e ) => onChange( e.target.value ) }
		>
			{ options.map( norm ).map( ( o ) => (
				<option
					key={ o.value }
					value={ o.value }
					disabled={ o.disabled }
				>
					{ o.label }
				</option>
			) ) }
		</select>
	);
}
