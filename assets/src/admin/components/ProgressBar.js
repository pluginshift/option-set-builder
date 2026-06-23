/**
 * Compact labelled progress bar (track + fill + trailing value).
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';

/**
 * ProgressBar.
 *
 * @param {Object}      props             Component props.
 * @param {number|null} props.value       Current value (null → empty/“n/a”).
 * @param {number}      [props.max]       Scale max for the fill width.
 * @param {string}      [props.label]     Accessible label.
 * @param {string}      [props.className] Extra class.
 * @return {JSX.Element} The progress bar.
 */
export default function ProgressBar( {
	value,
	max = 100,
	label,
	className = '',
} ) {
	const has = value !== null && value !== undefined;
	const pct = has
		? Math.max( 0, Math.min( 100, ( value / Math.max( 1, max ) ) * 100 ) )
		: 0;
	const a11y =
		label ||
		( has
			? sprintf(
					/* translators: %d: value */
					__(
						'%d products',
						'option-set-builder'
					),
					value
			  )
			: __( 'No data', 'option-set-builder' ) );

	return (
		<span className={ `optset-progress ${ className }`.trim() }>
			<span
				className="optset-progress__track"
				role="progressbar"
				aria-valuenow={ has ? value : undefined }
				aria-valuemin={ 0 }
				aria-valuemax={ max }
				aria-label={ a11y }
			>
				<span
					className="optset-progress__fill"
					style={ { width: `${ pct }%` } }
				/>
			</span>
			<span className="optset-progress__value">{ has ? value : '—' }</span>
		</span>
	);
}
