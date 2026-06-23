/**
 * Confirmation modal for destructive actions (delete set, etc.).
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import Modal from './Modal';

/**
 * ConfirmDialog.
 *
 * @param {Object}   props               Component props.
 * @param {string}   props.title         Dialog title.
 * @param {string}   props.message       Confirmation copy.
 * @param {Function} props.onConfirm     Confirm handler.
 * @param {Function} props.onCancel      Cancel/close handler.
 * @param {string}   [props.confirmText] Confirm button label.
 * @param {boolean}  [props.danger]      Style confirm as destructive.
 * @return {JSX.Element} The dialog.
 */
export default function ConfirmDialog( {
	title,
	message,
	onConfirm,
	onCancel,
	confirmText = __( 'Confirm', 'option-set-builder' ),
	danger = true,
} ) {
	return (
		<Modal
			title={ title }
			onClose={ onCancel }
			size="sm"
			footer={
				<>
					<button
						type="button"
						className="optset-btn optset-btn--ghost"
						onClick={ onCancel }
					>
						{ __(
							'Cancel',
							'option-set-builder'
						) }
					</button>
					<button
						type="button"
						className={ `optset-btn ${
							danger ? 'optset-btn--danger' : 'optset-btn--primary'
						}` }
						onClick={ onConfirm }
					>
						{ confirmText }
					</button>
				</>
			}
		>
			<p>{ message }</p>
		</Modal>
	);
}
