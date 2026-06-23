/**
 * Tinted info banner shown at the top of every section body. The tone is
 * inherited from the section accent so the cue colour matches the header
 * icon tile.
 *
 * @package
 */

/**
 * InfoBanner.
 *
 * @param {Object} props      Props.
 * @param {string} props.tone Accent tone (blue|amber|violet|teal|pink).
 * @param {string} props.text Banner copy.
 * @return {JSX.Element} The banner.
 */
export default function InfoBanner( { tone, text } ) {
	return (
		<p className={ `optset-set-banner optset-set-banner--${ tone }` } role="note">
			<span
				className="dashicons dashicons-info-outline"
				aria-hidden="true"
			/>
			<span>{ text }</span>
		</p>
	);
}
