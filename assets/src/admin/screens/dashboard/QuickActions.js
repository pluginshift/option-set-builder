/**
 * Quick actions — a compact, keyboard-navigable launcher list that deep
 * links to the most-used admin screens.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { navigate } from '../../app/router';

/**
 * QuickActions.
 *
 * @return {JSX.Element} The panel.
 */
export default function QuickActions() {

	const actions = [
		{
			icon: 'art',
			to: '/style',
			title: __(
				'Global Styles',
				'option-set-builder'
			),
			desc: __(
				'Customise appearance',
				'option-set-builder'
			),
		},
		{
			icon: 'admin-generic',
			to: '/settings',
			title: __( 'Settings', 'option-set-builder' ),
			desc: __(
				'Configure the plugin',
				'option-set-builder'
			),
		},
		{
			icon: 'chart-bar',
			to: '/analytics',
			title: __( 'Analytics', 'option-set-builder' ),
			desc: __(
				'View performance reports',
				'option-set-builder'
			),
		},
	];

	return (
		<section className="optset-db-card optset-db-panel">
			<header className="optset-db-panel__head">
				<h2 className="optset-db-panel__title">
					<span
						className="dashicons dashicons-superhero-alt optset-db-panel__ico"
						aria-hidden="true"
					/>
					{ __(
						'Quick Actions',
						'option-set-builder'
					) }
				</h2>
			</header>

			<nav className="optset-db-actions">
				{ actions.map( ( a ) => (
					<button
						key={ a.to }
						type="button"
						className="optset-db-action"
						onClick={ () => navigate( a.to ) }
					>
						<span
							className="optset-db-action__icon"
							aria-hidden="true"
						>
							<span
								className={ `dashicons dashicons-${ a.icon }` }
							/>
						</span>
						<span className="optset-db-action__text">
							<span className="optset-db-action__title">
								{ a.title }
							</span>
							<span className="optset-db-action__desc">
								{ a.desc }
							</span>
						</span>
						<span
							className="dashicons dashicons-arrow-right-alt2 optset-db-action__chev"
							aria-hidden="true"
						/>
					</button>
				) ) }
			</nav>
		</section>
	);
}
