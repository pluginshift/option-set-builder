/**
 * WordPress media-library image picker (uses window.wp.media). Gracefully
 * degrades to a disabled state if wp.media is unavailable.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';

/**
 * Open the WP media frame and resolve the chosen attachment.
 *
 * @param {Function} onPick (attachment:{id,url}) => void.
 * @return {void}
 */
function openFrame( onPick ) {
	const media = window.wp && window.wp.media;
	if ( ! media ) {
		return;
	}
	const frame = media( {
		title: __( 'Select image', 'option-set-builder' ),
		button: {
			text: __( 'Use image', 'option-set-builder' ),
		},
		multiple: false,
		library: { type: 'image' },
	} );
	frame.on( 'select', () => {
		const att = frame.state().get( 'selection' ).first().toJSON();
		onPick( { id: att.id, url: att.url } );
	} );
	frame.open();
}

/**
 * MediaPicker.
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.value    Current image URL.
 * @param {Function} props.onChange ({id,url}|null) => void.
 * @return {JSX.Element} The picker.
 */
export default function MediaPicker( { value, onChange } ) {
	const available = !! ( window.wp && window.wp.media );
	return (
		<div className="optset-media-picker">
			{ value ? (
				<div className="optset-media-picker__preview">
					<img src={ value } alt="" />
					<button
						type="button"
						className="optset-icon-btn optset-media-picker__remove"
						onClick={ () => onChange( null ) }
						aria-label={ __(
							'Remove image',
							'option-set-builder'
						) }
					>
						<span
							className="dashicons dashicons-no-alt"
							aria-hidden="true"
						/>
					</button>
				</div>
			) : (
				<button
					type="button"
					className="optset-btn optset-btn--ghost"
					disabled={ ! available }
					onClick={ () => openFrame( onChange ) }
				>
					{ available
						? __(
								'Select image',
								'option-set-builder'
						  )
						: __(
								'Media library unavailable',
								'option-set-builder'
						  ) }
				</button>
			) }
		</div>
	);
}
