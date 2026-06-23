/**
 * Styled file picker — a button that proxies a visually-hidden native
 * <input type="file"> and surfaces the chosen filename. Exposes the
 * underlying input via `inputRef` so the parent can read / reset it.
 *
 * @package
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * FilePicker.
 *
 * @param {Object} props          Props.
 * @param {Object} props.inputRef Ref forwarded to the file input.
 * @param {string} props.accept   Accept attribute.
 * @param {string} [props.id]     Input id (for label wiring).
 * @return {JSX.Element} The picker.
 */
export default function FilePicker( { inputRef, accept, id } ) {
	const [ name, setName ] = useState( '' );

	return (
		<div className="optset-set-file">
			<button
				type="button"
				className="optset-set-file__btn"
				onClick={ () => inputRef.current?.click() }
			>
				<span
					className="dashicons dashicons-upload"
					aria-hidden="true"
				/>
				<span className="optset-set-file__name">
					{ name ||
						__(
							'Choose file…',
							'option-set-builder'
						) }
				</span>
			</button>
			<input
				id={ id }
				ref={ inputRef }
				type="file"
				accept={ accept }
				className="optset-set-file__input"
				onChange={ ( e ) =>
					setName(
						e.target.files && e.target.files[ 0 ]
							? e.target.files[ 0 ].name
							: ''
					)
				}
			/>
		</div>
	);
}
