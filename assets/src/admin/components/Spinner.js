/**
 * Minimal inline loading spinner with an accessible label.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';

/**
 * Spinner.
 *
 * @param {Object} props         Component props.
 * @param {string} [props.label] Visually-hidden status text.
 * @return {JSX.Element} The spinner.
 */
export default function Spinner( {
	label = __( 'Loading…', 'option-set-builder' ),
} ) {
	return (
		<span className="optset-spinner" role="status" aria-live="polite">
			<span className="optset-spinner__ring" aria-hidden="true" />
			<span className="screen-reader-text">{ label }</span>
		</span>
	);
}
