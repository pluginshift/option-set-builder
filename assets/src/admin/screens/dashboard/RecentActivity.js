/**
 * Recent activity feed — synthesised from the latest option sets ordered
 * by modified time. Each entry is honest about what the API exposes
 * (published vs. still a draft) and shows a relative timestamp.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { navigate } from '../../app/router';
import { relativeTime } from './helpers';

/**
 * RecentActivity.
 *
 * @param {Object} props          Props.
 * @param {Array}  props.activity [{ id, title, updated, kind, fields }].
 * @return {JSX.Element} The panel.
 */
export default function RecentActivity( { activity } ) {
	return (
		<section className="optset-db-card optset-db-panel">
			<header className="optset-db-panel__head">
				<h2 className="optset-db-panel__title">
					<span
						className="dashicons dashicons-calendar-alt optset-db-panel__ico"
						aria-hidden="true"
					/>
					{ __(
						'Recent Activity',
						'option-set-builder'
					) }
				</h2>
				{ activity.length > 0 && (
					<button
						type="button"
						className="optset-db-link"
						onClick={ () => navigate( '/sets' ) }
					>
						{ __(
							'View all',
							'option-set-builder'
						) }
					</button>
				) }
			</header>

			{ activity.length === 0 ? (
				<p className="optset-db-empty">
					{ __(
						'No activity yet — create your first option set to get started.',
						'option-set-builder'
					) }
				</p>
			) : (
				<ul className="optset-db-feed">
					{ activity.map( ( a ) => {
						const published = a.kind === 'published';
						const tone = published ? 'blue' : 'amber';
						const label = published
							? __(
									'Option set published',
									'option-set-builder'
							  )
							: __(
									'Draft saved',
									'option-set-builder'
							  );
						return (
							<li key={ a.id } className="optset-db-feed__item">
								<span
									className={ `optset-db-feed__dot optset-db-feed__dot--${ tone }` }
									aria-hidden="true"
								/>
								<button
									type="button"
									className="optset-db-feed__main"
									onClick={ () =>
										navigate( `/set/${ a.id }` )
									}
								>
									<span className="optset-db-feed__label">
										{ label }
									</span>
									<span className="optset-db-feed__sub">
										{ a.title ||
											sprintf(
												/* translators: %d: set id */
												__(
													'Option set #%d',
													'option-set-builder'
												),
												a.id
											) }
									</span>
								</button>
								<time className="optset-db-feed__time">
									{ relativeTime( a.updated ) }
								</time>
							</li>
						);
					} ) }
				</ul>
			) }
		</section>
	);
}
