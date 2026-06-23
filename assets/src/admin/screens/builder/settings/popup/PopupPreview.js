/**
 * Live popup preview shown from the Popup Builder. Renders the authored content
 * with the same modal chrome, corner close button and open animation as the
 * storefront (`includes/Fields/Type/PopupField.php` + blocks.scss) so the
 * builder preview matches the frontend 1:1. Reuses `.optset-rte__content` for
 * identical rich-text typography.
 *
 * @package
 */

import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * PopupPreview.
 *
 * @param {Object}   props         Component props.
 * @param {string}   props.content Authored HTML.
 * @param {Function} props.onClose () => void.
 * @return {JSX.Element} The preview overlay.
 */
export default function PopupPreview( { content, onClose } ) {
	useEffect( () => {
		const onKey = ( e ) => {
			if ( e.key === 'Escape' ) {
				onClose();
			}
		};
		document.addEventListener( 'keydown', onKey );
		return () => document.removeEventListener( 'keydown', onKey );
	}, [ onClose ] );

	const html =
		content && content.trim()
			? content
			: `<p><em>${ __(
					'Nothing to preview yet — add some content.',
					'option-set-builder'
			  ) }</em></p>`;

	return (
		<div
			className="optset-pp-preview"
			role="dialog"
			aria-modal="true"
			aria-label={ __(
				'Popup preview',
				'option-set-builder'
			) }
		>
			<div
				className="optset-pp-preview__backdrop"
				onClick={ onClose }
				role="presentation"
			/>
			<div className="optset-pp-preview__box">
				<button
					type="button"
					className="optset-pp-preview__close"
					onClick={ onClose }
					aria-label={ __(
						'Close',
						'option-set-builder'
					) }
				>
					&times;
				</button>
				<div
					className="optset-rte__content optset-pp-preview__content"
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={ { __html: html } }
				/>
			</div>
		</div>
	);
}
