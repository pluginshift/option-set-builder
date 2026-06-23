/**
 * Custom Fonts section — an "Add new font" form card plus the list of
 * uploaded fonts (or an empty state). Fonts persist immediately, so this
 * section is independent of the Save settings action.
 *
 * @package
 */

import { useState, useRef, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Field, TextControl, Skeleton } from '../../../components';
import { useToast } from '../../../store/ToastContext';
import { injectFontFaces } from '../../../hooks/useCustomFonts';
import SettingCard from '../SettingCard';
import FilePicker from '../FilePicker';
import useFonts from '../useFonts';

const ACCEPT = '.ttf,.otf,.woff,.woff2';

/**
 * FontsSection.
 *
 * @return {JSX.Element} The section.
 */
export default function FontsSection() {
	const { notify } = useToast();
	const { fonts, loading, busy, upload, update, remove } = useFonts();
	const [ title, setTitle ] = useState( '' );
	const [ family, setFamily ] = useState( '' );
	const fileRef = useRef( null );

	// Register @font-face for every uploaded font so the name + sample lines
	// below actually render in their own face.
	useEffect( () => {
		injectFontFaces( fonts );
	}, [ fonts ] );

	// Inline edit state (one row at a time).
	const [ editingId, setEditingId ] = useState( '' );
	const [ editTitle, setEditTitle ] = useState( '' );
	const [ editFamily, setEditFamily ] = useState( '' );

	const startEdit = ( f ) => {
		setEditingId( f.id );
		setEditTitle( f.title || '' );
		setEditFamily( f.family || '' );
	};
	const cancelEdit = () => setEditingId( '' );
	const saveEdit = async ( id ) => {
		if ( ! editTitle.trim() ) {
			notify(
				__(
					'Font title is required.',
					'option-set-builder'
				),
				'error'
			);
			return;
		}
		const ok = await update( id, {
			title: editTitle.trim(),
			family: editFamily.trim(),
		} );
		if ( ok ) {
			setEditingId( '' );
		}
	};

	/**
	 * Validate then upload, resetting the form on success.
	 *
	 * @return {Promise<void>} Resolves after the round-trip.
	 */
	const onUpload = async () => {
		const file =
			fileRef.current && fileRef.current.files[ 0 ]
				? fileRef.current.files[ 0 ]
				: null;
		if ( ! title.trim() ) {
			notify(
				__(
					'Font title is required.',
					'option-set-builder'
				),
				'error'
			);
			return;
		}
		if ( ! file ) {
			notify(
				__(
					'Choose a font file first.',
					'option-set-builder'
				),
				'error'
			);
			return;
		}
		const ok = await upload( file, title.trim(), family.trim() );
		if ( ok ) {
			setTitle( '' );
			setFamily( '' );
			if ( fileRef.current ) {
				fileRef.current.value = '';
			}
		}
	};

	return (
		<div className="optset-set-stack">
			<SettingCard
				icon="plus-alt2"
				tone="pink"
				title={ __(
					'Add New Font',
					'option-set-builder'
				) }
				subtitle={ __(
					'Upload a font file and give it a name',
					'option-set-builder'
				) }
			>
				<div className="optset-set-fontform">
					<Field
						label={ __(
							'Font Title *',
							'option-set-builder'
						) }
					>
						<TextControl
							value={ title }
							placeholder={ __(
								'My Custom Font',
								'option-set-builder'
							) }
							onChange={ setTitle }
						/>
					</Field>
					<Field
						label={ __(
							'CSS Family (optional)',
							'option-set-builder'
						) }
					>
						<TextControl
							value={ family }
							placeholder={ __(
								"'My Custom Font', sans-serif",
								'option-set-builder'
							) }
							onChange={ setFamily }
						/>
					</Field>
					<Field
						label={ __(
							'Font File *',
							'option-set-builder'
						) }
					>
						<FilePicker inputRef={ fileRef } accept={ ACCEPT } />
					</Field>
					<button
						type="button"
						className="optset-set-save optset-set-save--sm"
						disabled={ busy }
						onClick={ onUpload }
					>
						{ busy
							? __(
									'Uploading…',
									'option-set-builder'
							  )
							: __(
									'Upload',
									'option-set-builder'
							  ) }
					</button>
				</div>
			</SettingCard>

			<div className="optset-set-fonts">
				<h3 className="optset-set-fonts__title">
					{ __(
						'Uploaded Fonts',
						'option-set-builder'
					) }
				</h3>

				{ loading && (
					<div className="optset-set-fonts__empty">
						<Skeleton w="60%" h={ 14 } />
						<Skeleton w="80%" h={ 12 } />
						<Skeleton w="40%" h={ 12 } />
					</div>
				) }
				{ ! loading && fonts.length === 0 && (
					<div className="optset-set-fonts__empty">
						<span
							className="dashicons dashicons-editor-textcolor optset-set-fonts__emptyicon"
							aria-hidden="true"
						/>
						<p className="optset-set-fonts__emptytitle">
							{ __(
								'No custom fonts uploaded yet',
								'option-set-builder'
							) }
						</p>
						<p className="optset-set-fonts__emptysub">
							{ __(
								'Add your first font above',
								'option-set-builder'
							) }
						</p>
					</div>
				) }
				{ ! loading && fonts.length > 0 && (
					<ul className="optset-set-fontlist">
						{ fonts.map( ( f ) =>
							editingId === f.id ? (
								<li
									key={ f.id }
									className="optset-set-fontrow optset-set-fontrow--editing"
								>
									<div className="optset-set-fontedit">
										<Field
											label={ __(
												'Font Title',
												'option-set-builder'
											) }
										>
											<TextControl
												value={ editTitle }
												onChange={ setEditTitle }
											/>
										</Field>
										<Field
											label={ __(
												'CSS Family',
												'option-set-builder'
											) }
										>
											<TextControl
												value={ editFamily }
												onChange={ setEditFamily }
											/>
										</Field>
									</div>
									<div className="optset-set-fontedit__actions">
										<button
											type="button"
											className="optset-set-save optset-set-save--sm"
											disabled={ busy }
											onClick={ () => saveEdit( f.id ) }
										>
											{ __(
												'Save',
												'option-set-builder'
											) }
										</button>
										<button
											type="button"
											className="optset-btn optset-btn--ghost"
											onClick={ cancelEdit }
										>
											{ __(
												'Cancel',
												'option-set-builder'
											) }
										</button>
									</div>
								</li>
							) : (
								<li key={ f.id } className="optset-set-fontrow">
									<span
										className="optset-set-fontrow__name"
										style={ {
											fontFamily: f.family || 'inherit',
										} }
									>
										{ f.title }
									</span>
									<span className="optset-set-fontrow__meta">
										{ f.family || '—' }
									</span>
									<span className="optset-set-fontrow__type">
										{ ( f.file_type || '' ).toUpperCase() }
									</span>
									<button
										type="button"
										className="optset-set-iconbtn"
										onClick={ () => startEdit( f ) }
										aria-label={ __(
											'Edit font',
											'option-set-builder'
										) }
									>
										<span
											className="dashicons dashicons-edit"
											aria-hidden="true"
										/>
									</button>
									<button
										type="button"
										className="optset-set-iconbtn optset-set-iconbtn--danger"
										onClick={ () => remove( f.id ) }
										aria-label={ __(
											'Delete font',
											'option-set-builder'
										) }
									>
										<span
											className="dashicons dashicons-trash"
											aria-hidden="true"
										/>
									</button>
									<span
										className="optset-set-fontrow__sample"
										style={ {
											fontFamily: f.family || 'inherit',
										} }
									>
										{ __(
											'The quick brown fox jumps over the lazy dog',
											'option-set-builder'
										) }
									</span>
								</li>
							)
						) }
					</ul>
				) }
			</div>
		</div>
	);
}
