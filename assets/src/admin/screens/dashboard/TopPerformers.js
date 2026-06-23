/**
 * Top performers — the three best revenue-earning option sets (all-time).
 * Rows deep-link into the builder for the set; the header links to the
 * full Analytics screen.
 *
 * @package
 */

import { __, sprintf, _n } from '@wordpress/i18n';
import { useConfig } from '../../store/ConfigContext';
import { navigate } from '../../app/router';

/**
 * TopPerformers.
 *
 * @param {Object} props            Props.
 * @param {Array}  props.performers [{ id, title, orders, revenue, ctr }].
 * @return {JSX.Element} The panel.
 */
export default function TopPerformers( { performers } ) {
	const { formatPrice } = useConfig();

	return (
		<section className="optset-db-card optset-db-panel">
			<header className="optset-db-panel__head">
				<h2 className="optset-db-panel__title">
					<span
						className="dashicons dashicons-chart-line optset-db-panel__ico"
						aria-hidden="true"
					/>
					{ __(
						'Top Performers',
						'option-set-builder'
					) }
				</h2>
				{ performers.length > 0 && (
					<button
						type="button"
						className="optset-db-link"
						onClick={ () => navigate( '/analytics' ) }
					>
						{ __(
							'Analytics',
							'option-set-builder'
						) }
					</button>
				) }
			</header>

			{ performers.length === 0 ? (
				<p className="optset-db-empty">
					{ __(
						'No revenue recorded yet. Publish a set and conversions will appear here.',
						'option-set-builder'
					) }
				</p>
			) : (
				<ol className="optset-db-rank">
					{ performers.map( ( p, i ) => {
						const up = p.ctr >= 0;
						return (
							<li key={ p.id } className="optset-db-rank__item">
								<button
									type="button"
									className="optset-db-rank__btn"
									onClick={ () =>
										navigate( `/set/${ p.id }` )
									}
								>
									<span
										className={ `optset-db-rank__no optset-db-rank__no--${
											i + 1
										}` }
									>
										{ i + 1 }
									</span>
									<span className="optset-db-rank__meta">
										<span className="optset-db-rank__name">
											{ p.title ||
												sprintf(
													/* translators: %d: set id */
													__(
														'Option set #%d',
														'option-set-builder'
													),
													p.id
												) }
										</span>
										<span className="optset-db-rank__sub">
											{ sprintf(
												/* translators: %d: conversions */
												_n(
													'%d conversion',
													'%d conversions',
													p.orders,
													'option-set-builder'
												),
												p.orders
											) }
										</span>
									</span>
									<span className="optset-db-rank__fig">
										<span className="optset-db-rank__rev">
											{ formatPrice( p.revenue ) }
										</span>
										<span
											className={ `optset-db-rank__ctr optset-db-rank__ctr--${
												up ? 'up' : 'down'
											}` }
										>
											{ `${ up ? '+' : '' }${ p.ctr }%` }
										</span>
									</span>
								</button>
							</li>
						);
					} ) }
				</ol>
			) }
		</section>
	);
}
