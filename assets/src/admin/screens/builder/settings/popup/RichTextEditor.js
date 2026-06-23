/**
 * Popup rich-text editor. A TipTap (ProseMirror) editor configured with the
 * formatting, image, link and dynamic-table extensions the Popup Builder
 * exposes. It is a controlled component: `value` is the stored HTML and every
 * edit calls `onChange` with sanitised HTML — the same string PopupField.php
 * renders inside `.optset-popup__content`, so the builder and storefront stay in
 * perfect sync.
 *
 * Undo/Redo are bound to Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z by the StarterKit
 * history extension; the toolbar buttons call the same commands.
 *
 * @package
 */

import { useState, useEffect, useMemo, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Toolbar from './Toolbar';
import TableControls from './TableControls';
import LinkPrompt from './LinkPrompt';

/** TipTap returns this for an empty document; we store '' instead. */
const EMPTY_HTML = '<p></p>';

/**
 * RichTextEditor.
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.value    Stored HTML content.
 * @param {Function} props.onChange (html) => void.
 * @return {JSX.Element} The editor.
 */
export default function RichTextEditor( { value, onChange } ) {
	const [ sourceMode, setSourceMode ] = useState( false );
	const [ source, setSource ] = useState( value || '' );
	const [ linkOpen, setLinkOpen ] = useState( false );

	// `@tiptap/react`'s useEditor re-applies options (editor.setOptions) on any
	// render where `content`, `extensions` or `editorProps` differ by reference
	// — which would reset the document/selection on every keystroke (you could
	// only type one character before losing focus). So we keep all three stable
	// across renders and funnel the latest onChange through a ref instead.
	const onChangeRef = useRef( onChange );
	onChangeRef.current = onChange;

	// Initial content only; the editor owns the document after mount. The
	// component remounts (fresh value) whenever the Popup Builder modal reopens.
	const initialContent = useRef( value || '' ).current;

	const extensions = useMemo(
		() => [
			StarterKit.configure( {
				heading: { levels: [ 1, 2, 3 ] },
				link: {
					openOnClick: false,
					autolink: true,
					HTMLAttributes: {
						rel: 'noopener noreferrer',
						target: '_blank',
					},
				},
			} ),
			Highlight.configure( { multicolor: false } ),
			Image.configure( {
				inline: false,
				allowBase64: false,
				HTMLAttributes: { class: 'optset-popup__img' },
			} ),
			TextAlign.configure( { types: [ 'heading', 'paragraph' ] } ),
			// Resizing emits inline width styles that wp_kses_post() strips on
			// the storefront — keep it off so the builder and frontend tables
			// render identically. Rows/columns stay fully editable.
			Table.configure( { resizable: false } ),
			TableRow,
			TableHeader,
			TableCell,
		],
		[]
	);

	const editorProps = useMemo(
		() => ( {
			attributes: {
				class: 'optset-rte__content',
				'aria-label': __(
					'Popup content',
					'option-set-builder'
				),
			},
		} ),
		[]
	);

	const editor = useEditor( {
		// Pure client-side admin app — render synchronously and keep the
		// toolbar's active states in sync with every selection change.
		immediatelyRender: true,
		shouldRerenderOnTransaction: true,
		extensions,
		content: initialContent,
		editorProps,
		onUpdate: ( { editor: ed } ) => {
			const html = ed.getHTML();
			onChangeRef.current( html === EMPTY_HTML ? '' : html );
		},
	} );

	// Apply edits made in the raw-HTML view back into the document when the
	// author switches out of source mode.
	const toggleSource = () => {
		if ( ! editor ) {
			return;
		}
		if ( ! sourceMode ) {
			setSource(
				editor.getHTML() === EMPTY_HTML ? '' : editor.getHTML()
			);
			setSourceMode( true );
		} else {
			editor.commands.setContent( source || '' );
			onChange( source || '' );
			setSourceMode( false );
		}
	};

	// Close the link bar whenever source mode opens.
	useEffect( () => {
		if ( sourceMode ) {
			setLinkOpen( false );
		}
	}, [ sourceMode ] );

	const applyLink = ( { href, newTab } ) => {
		editor
			.chain()
			.focus()
			.extendMarkRange( 'link' )
			.setLink( {
				href,
				target: newTab ? '_blank' : null,
				rel: newTab ? 'noopener noreferrer' : null,
			} )
			.run();
		setLinkOpen( false );
	};

	const removeLink = () => {
		editor.chain().focus().extendMarkRange( 'link' ).unsetLink().run();
		setLinkOpen( false );
	};

	const linkAttrs = editor ? editor.getAttributes( 'link' ) : {};

	return (
		<div className="optset-rte">
			<Toolbar
				editor={ editor }
				sourceMode={ sourceMode }
				onToggleSource={ toggleSource }
				onLink={ () => setLinkOpen( ( v ) => ! v ) }
			/>

			{ linkOpen && ! sourceMode && (
				<LinkPrompt
					initialHref={ linkAttrs.href || '' }
					initialNewTab={ linkAttrs.target !== '_self' }
					hasLink={ editor.isActive( 'link' ) }
					onApply={ applyLink }
					onRemove={ removeLink }
					onCancel={ () => setLinkOpen( false ) }
				/>
			) }

			{ ! sourceMode && <TableControls editor={ editor } /> }

			{ sourceMode ? (
				<textarea
					className="optset-rte__source"
					value={ source }
					spellCheck={ false }
					onChange={ ( e ) => setSource( e.target.value ) }
					placeholder={ __(
						'<p>Your HTML…</p>',
						'option-set-builder'
					) }
				/>
			) : (
				<EditorContent editor={ editor } className="optset-rte__surface" />
			) }
		</div>
	);
}
