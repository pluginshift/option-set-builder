/**
 * Renders the live toast stack from ToastContext. Mounted once by the
 * layout so any screen can `notify()`.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { useToast } from '../store/ToastContext';

/**
 * ToastStack.
 *
 * @return {JSX.Element|null} The stack, or null when empty.
 */
export default function ToastStack() {
	const { toasts, dismiss } = useToast();
	if ( ! toasts.length ) {
		return null;
	}
	return (
		<div className="optset-toast-stack" aria-live="polite" aria-atomic="false">
			{ toasts.map( ( t ) => (
				<div
					key={ t.id }
					className={ `optset-toast optset-toast--${ t.type }` }
					role={ t.type === 'error' ? 'alert' : 'status' }
				>
					<span className="optset-toast__msg">{ t.message }</span>
					<button
						type="button"
						className="optset-toast__close"
						onClick={ () => dismiss( t.id ) }
						aria-label={ __(
							'Dismiss',
							'option-set-builder'
						) }
					>
						<span
							className="dashicons dashicons-no-alt"
							aria-hidden="true"
						/>
					</button>
				</div>
			) ) }
		</div>
	);
}
