/**
 * Dashboard header — personalised welcome, supporting copy and the
 * primary "New Option Set" call to action.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { useConfig } from '../../store/ConfigContext';
import { navigate } from '../../app/router';

/**
 * DashboardHeader.
 *
 * @return {JSX.Element} The header.
 */
export default function DashboardHeader() {
	const { user } = useConfig();
	const name = user && user.name ? user.name : '';

	return (
		<header className="optset-db-head">
			<div className="optset-db-head__intro">
				<h1 className="optset-db-head__h1">
					{ name
						? sprintf(
								/* translators: %s: display name */
								__(
									'Welcome back, %s',
									'option-set-builder'
								),
								name
						  )
						: __(
								'Welcome back',
								'option-set-builder'
						  ) }
				</h1>
				<p className="optset-db-head__sub">
					{ __(
						'Create dynamic pricing options for your WooCommerce products',
						'option-set-builder'
					) }
				</p>
			</div>

			<button
				type="button"
				className="optset-db-cta"
				onClick={ () => navigate( '/set/new' ) }
			>
				<span
					className="dashicons dashicons-plus-alt2"
					aria-hidden="true"
				/>
				{ __(
					'New Option Set',
					'option-set-builder'
				) }
			</button>
		</header>
	);
}
