/**
 * PageFrame — uniform screen chrome used by every top-level screen.
 *
 * Replaces the bespoke headers each screen used to invent. Renders:
 *   • a screen title + subtitle row
 *   • an optional actions slot (right-aligned)
 *   • an optional toolbar slot (search / bulk action / filters row, like the
 *     reference SaaS dashboard)
 *   • the screen body inside a soft container
 *
 * Every measurement comes from the global theme tokens, so all screens stay
 * pixel-aligned and follow the active emerald palette.
 *
 * @package
 */

/**
 * PageFrame.
 *
 * @param {Object}      props            Component props.
 * @param {string}      props.title      Screen title.
 * @param {string}      [props.subtitle] Supporting copy under the title.
 * @param {JSX.Element} [props.actions]  Right-aligned actions (buttons, links).
 * @param {JSX.Element} [props.toolbar]  Optional row below the title (filters /
 *                                       search / bulk actions).
 * @param {string}      [props.tone]     Optional accent for the title row.
 * @param {boolean}     [props.bleed]    When true, body has no padding.
 * @param {JSX.Element} props.children   Screen body.
 * @return {JSX.Element} Frame.
 */
export default function PageFrame( {
	title,
	subtitle,
	actions,
	toolbar,
	bleed = false,
	children,
} ) {
	return (
		<div className="optset-page">
			<header className="optset-page__head">
				<div className="optset-page__titles">
					{ title && (
						<h1 className="optset-page__title">{ title }</h1>
					) }
					{ subtitle && (
						<p className="optset-page__sub">{ subtitle }</p>
					) }
				</div>
				{ actions && (
					<div className="optset-page__actions">{ actions }</div>
				) }
			</header>

			{ toolbar && <div className="optset-page__toolbar">{ toolbar }</div> }

			<div
				className={ `optset-page__body${
					bleed ? ' optset-page__body--bleed' : ''
				}` }
			>
				{ children }
			</div>
		</div>
	);
}
