/**
 * The right-hand content card: an accent icon tile + section title and
 * sublabel, a divider, the tinted info banner, then the section body.
 * Purely presentational — the active section supplies `children`.
 *
 * @package
 */

import InfoBanner from './InfoBanner';

/**
 * SectionPanel.
 *
 * @param {Object}      props          Props.
 * @param {Object}      props.section  Section descriptor from config.
 * @param {JSX.Element} props.children Section body.
 * @return {JSX.Element} The panel.
 */
export default function SectionPanel( { section, children } ) {
	return (
		<section
			className="optset-set-panel"
			aria-labelledby={ `optset-set-h-${ section.id }` }
		>
			<header className="optset-set-panel__head">
				<span
					className={ `optset-set-tile optset-set-tile--lg optset-set-tile--${ section.tone }` }
					aria-hidden="true"
				>
					<span
						className={ `dashicons dashicons-${ section.dashicon }` }
					/>
				</span>
				<div>
					<h2
						id={ `optset-set-h-${ section.id }` }
						className="optset-set-panel__title"
					>
						{ section.title }
					</h2>
					<p className="optset-set-panel__sub">{ section.nav }</p>
				</div>
			</header>

			<div className="optset-set-panel__divider" />

			<InfoBanner tone={ section.tone } text={ section.banner } />

			<div className="optset-set-panel__body">{ children }</div>
		</section>
	);
}
