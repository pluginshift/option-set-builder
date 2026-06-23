/**
 * Getting-started checklist. Each step's completion is derived from real
 * account state (see useDashboard) so the progress count is truthful.
 * Completed steps are inert; the rest are keyboard-activatable rows that
 * deep-link to the screen where the work happens.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { navigate } from '../../app/router';

/** Static copy keyed by checklist id (kept out of the data hook). */
const COPY = {
	create: {
		title: __(
			'Create an option set',
			'option-set-builder'
		),
		desc: __(
			'Add fields like dropdowns, colour swatches or text inputs',
			'option-set-builder'
		),
	},
	fields: {
		title: __(
			'Add fields to a set',
			'option-set-builder'
		),
		desc: __(
			'Build the form shoppers see on the product page',
			'option-set-builder'
		),
	},
	publish: {
		title: __(
			'Assign & publish',
			'option-set-builder'
		),
		desc: __(
			'Link a set to products, categories or tags',
			'option-set-builder'
		),
	},
	track: {
		title: __(
			'Track performance',
			'option-set-builder'
		),
		desc: __(
			'Monitor impressions and conversions in Analytics',
			'option-set-builder'
		),
	},
};

/**
 * GettingStarted.
 *
 * @param {Object} props           Props.
 * @param {Array}  props.checklist [{ id, done, to }].
 * @param {number} props.progress  Completed step count.
 * @return {JSX.Element} The panel.
 */
export default function GettingStarted( { checklist, progress } ) {
	const total = checklist.length;
	// First not-yet-done step is the one we nudge the user toward.
	const nextId = ( checklist.find( ( s ) => ! s.done ) || {} ).id;

	return (
		<section className="optset-db-card optset-db-panel">
			<header className="optset-db-panel__head">
				<h2 className="optset-db-panel__title">
					<span
						className="dashicons dashicons-book-alt optset-db-panel__ico"
						aria-hidden="true"
					/>
					{ __(
						'Getting Started',
						'option-set-builder'
					) }
				</h2>
				<span className="optset-db-panel__meta">
					{ sprintf(
						/* translators: 1: completed steps, 2: total steps */
						__(
							'%1$d of %2$d completed',
							'option-set-builder'
						),
						progress,
						total
					) }
				</span>
			</header>

			<ol className="optset-db-steps">
				{ checklist.map( ( step, i ) => {
					const copy = COPY[ step.id ];
					const isNext = step.id === nextId;
					const cls = [
						'optset-db-step',
						step.done && 'is-done',
						isNext && 'is-next',
					]
						.filter( Boolean )
						.join( ' ' );

					const go = () => navigate( step.to );

					return (
						<li key={ step.id } className={ cls }>
							<span
								className="optset-db-step__marker"
								aria-hidden="true"
							>
								{ step.done ? (
									<span className="dashicons dashicons-yes" />
								) : (
									i + 1
								) }
							</span>

							<div className="optset-db-step__text">
								<span className="optset-db-step__title">
									{ copy.title }
								</span>
								<span className="optset-db-step__desc">
									{ copy.desc }
								</span>
							</div>

							{ step.done ? (
								<span className="optset-db-step__state">
									{ __(
										'Done',
										'option-set-builder'
									) }
								</span>
							) : (
								<button
									type="button"
									className="optset-db-step__go"
									onClick={ go }
									aria-label={ sprintf(
										/* translators: %s: step title */
										__(
											'Start: %s',
											'option-set-builder'
										),
										copy.title
									) }
								>
									<span
										className="dashicons dashicons-controls-play"
										aria-hidden="true"
									/>
								</button>
							) }
						</li>
					);
				} ) }
			</ol>
		</section>
	);
}
