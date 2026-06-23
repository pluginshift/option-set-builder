/**
 * Open the WordPress media library and resolve the chosen image. Shared by the
 * popup rich-text editor's "insert image" command. Degrades to a no-op when
 * `wp.media` is unavailable (e.g. media scripts not enqueued).
 *
 * @package
 */

import { __ } from '@wordpress/i18n';

/**
 * Whether the WP media frame is available on the page.
 *
 * @return {boolean} True when wp.media exists.
 */
export function mediaAvailable() {
	return !! ( window.wp && window.wp.media );
}

/**
 * Open the media frame and call back with the selected attachment.
 *
 * @param {Function} onPick ({ url, alt, width, height }) => void.
 * @return {void}
 */
export function openImageFrame( onPick ) {
	const media = window.wp && window.wp.media;
	if ( ! media ) {
		return;
	}
	const frame = media( {
		title: __(
			'Select or upload image',
			'option-set-builder'
		),
		button: {
			text: __(
				'Use this image',
				'option-set-builder'
			),
		},
		multiple: false,
		library: { type: 'image' },
	} );
	frame.on( 'select', () => {
		const att = frame.state().get( 'selection' ).first().toJSON();
		onPick( {
			url: att.url,
			alt: att.alt || att.title || '',
			width: att.width || undefined,
			height: att.height || undefined,
		} );
	} );
	frame.open();
}
