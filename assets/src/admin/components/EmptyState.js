/**
 * Empty / zero-data placeholder with an optional call-to-action.
 *
 * @package
 */

/**
 * EmptyState.
 *
 * @param {Object}      props          Component props.
 * @param {string}      [props.icon]   Dashicon slug.
 * @param {string}      props.title    Headline.
 * @param {string}      [props.text]   Supporting copy.
 * @param {JSX.Element} [props.action] Optional CTA element.
 * @return {JSX.Element} The empty state.
 */
export default function EmptyState( {
	icon = 'screenoptions',
	title,
	text,
	action,
} ) {
	return (
		<div className="optset-empty">
			<span
				className={ `dashicons dashicons-${ icon } optset-empty__icon` }
				aria-hidden="true"
			/>
			<h3 className="optset-empty__title">{ title }</h3>
			{ text && <p className="optset-empty__text">{ text }</p> }
			{ action && <div className="optset-empty__action">{ action }</div> }
		</div>
	);
}
