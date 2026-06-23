/**
 * Pill badge — neutral by default, with semantic colour variants.
 *
 * @package
 */

/**
 * Badge.
 *
 * @param {Object}      props             Component props.
 * @param {string}      [props.variant]   neutral|info|success|muted.
 * @param {string}      [props.className] Extra class.
 * @param {JSX.Element} props.children    Label content.
 * @return {JSX.Element} The badge.
 */
export default function Badge( {
	variant = 'neutral',
	className = '',
	children,
} ) {
	return (
		<span
			className={ `optset-badge optset-badge--${ variant } ${ className }`.trim() }
		>
			{ children }
		</span>
	);
}
