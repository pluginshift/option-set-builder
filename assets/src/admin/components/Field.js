/**
 * Generic labelled form row: label + optional help + control slot.
 * Wraps any control to keep inspector/settings markup consistent and
 * accessible (label `htmlFor` wiring is the caller's job via children id).
 *
 * @package
 */

import { cloneElement, isValidElement } from '@wordpress/element';
import useId from '../app/useId';

/**
 * Field row.
 *
 * @param {Object}      props          Component props.
 * @param {string}      props.label    Field label text.
 * @param {string}      [props.help]   Help text below the control.
 * @param {boolean}     [props.inline] Render label + control on one line.
 * @param {JSX.Element} props.children A single control element.
 * @return {JSX.Element} The labelled row.
 */
export default function Field( { label, help, inline = false, children } ) {
	const id = useId( 'optset-field' );
	const control =
		isValidElement( children ) && ! children.props.id
			? cloneElement( children, { id } )
			: children;

	return (
		<div
			className={ `optset-form-field${
				inline ? ' optset-form-field--inline' : ''
			}` }
		>
			{ label && (
				<label className="optset-form-field__label" htmlFor={ id }>
					{ label }
				</label>
			) }
			<div className="optset-form-field__control">{ control }</div>
			{ help && <p className="optset-form-field__help">{ help }</p> }
		</div>
	);
}
