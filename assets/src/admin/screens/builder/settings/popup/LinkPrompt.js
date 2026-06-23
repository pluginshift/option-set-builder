/**
 * Inline link editor bar. Replaces window.prompt with an accessible field so
 * the URL, "open in new tab" choice and removal all live inside the editor
 * surface and work on touch / narrow screens.
 *
 * @package
 */

import { useState, useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Check, Trash2, X } from 'lucide-react';
import useId from '../../../../app/useId';

/**
 * LinkPrompt.
 *
 * @param {Object}   props               Component props.
 * @param {string}   props.initialHref   Pre-filled URL (when editing).
 * @param {boolean}  props.initialNewTab Whether the existing link opens a new tab.
 * @param {boolean}  props.hasLink       Whether a link is already active (show Remove).
 * @param {Function} props.onApply       ({ href, newTab }) => void.
 * @param {Function} props.onRemove      () => void.
 * @param {Function} props.onCancel      () => void.
 * @return {JSX.Element} The bar.
 */
export default function LinkPrompt( {
	initialHref = '',
	initialNewTab = true,
	hasLink = false,
	onApply,
	onRemove,
	onCancel,
} ) {
	const [ href, setHref ] = useState( initialHref );
	const [ newTab, setNewTab ] = useState( initialNewTab );
	const inputRef = useRef( null );
	const newTabId = useId( 'optset-rte-newtab' );

	useEffect( () => {
		if ( inputRef.current ) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [] );

	const apply = () => {
		const url = href.trim();
		if ( ! url ) {
			return;
		}
		onApply( { href: url, newTab } );
	};

	return (
		<div className="optset-rte__linkbar">
			<input
				ref={ inputRef }
				type="url"
				className="optset-rte__linkinput"
				placeholder={ __(
					'https://example.com',
					'option-set-builder'
				) }
				value={ href }
				onChange={ ( e ) => setHref( e.target.value ) }
				onKeyDown={ ( e ) => {
					if ( e.key === 'Enter' ) {
						e.preventDefault();
						apply();
					}
					if ( e.key === 'Escape' ) {
						e.preventDefault();
						onCancel();
					}
				} }
			/>
			<label className="optset-rte__linkcheck" htmlFor={ newTabId }>
				<input
					id={ newTabId }
					type="checkbox"
					checked={ newTab }
					onChange={ ( e ) => setNewTab( e.target.checked ) }
				/>
				{ __( 'New tab', 'option-set-builder' ) }
			</label>
			<button
				type="button"
				className="optset-rte__btn"
				title={ __(
					'Apply link',
					'option-set-builder'
				) }
				onClick={ apply }
			>
				<Check size={ 16 } />
			</button>
			{ hasLink && (
				<button
					type="button"
					className="optset-rte__btn is-danger"
					title={ __(
						'Remove link',
						'option-set-builder'
					) }
					onClick={ onRemove }
				>
					<Trash2 size={ 16 } />
				</button>
			) }
			<button
				type="button"
				className="optset-rte__btn"
				title={ __(
					'Cancel',
					'option-set-builder'
				) }
				onClick={ onCancel }
			>
				<X size={ 16 } />
			</button>
		</div>
	);
}
