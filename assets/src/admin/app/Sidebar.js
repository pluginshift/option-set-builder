/**
 * Primary admin navigation rail.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';

/** Nav items: { route, hash, label, icon }. */
const NAV = [
	{
		route: 'dashboard',
		hash: '#/',
		label: __( 'Dashboard', 'option-set-builder' ),
		icon: 'dashboard',
	},
	{
		route: 'sets',
		hash: '#/sets',
		label: __( 'Option Sets', 'option-set-builder' ),
		icon: 'screenoptions',
	},
	{
		route: 'settings',
		hash: '#/settings',
		label: __( 'Settings', 'option-set-builder' ),
		icon: 'admin-generic',
	},
	{
		route: 'analytics',
		hash: '#/analytics',
		label: __( 'Analytics', 'option-set-builder' ),
		icon: 'chart-bar',
	},
];

/**
 * Sidebar.
 *
 * @param {Object} props        Component props.
 * @param {string} props.active Active route name.
 * @return {JSX.Element} The sidebar.
 */
export default function Sidebar( { active } ) {
	// Builder/assignment screens highlight the Option Sets entry.
	const current =
		active === 'builder' || active === 'assignment' ? 'sets' : active;

	return (
		<nav
			className="optset-sidebar"
			aria-label={ __(
				'Option Set Builder navigation',
				'option-set-builder'
			) }
		>
			<div className="optset-sidebar__brand">
				<span
					className="dashicons dashicons-cart optset-sidebar__logo"
					aria-hidden="true"
				/>
				<span className="optset-sidebar__name">
					{ __(
						'Dynamic Options',
						'option-set-builder'
					) }
				</span>
			</div>
			<ul className="optset-sidebar__nav">
				{ NAV.map( ( item ) => (
					<li key={ item.route }>
						<a
							href={ item.hash }
							className={ `optset-sidebar__link${
								current === item.route ? ' is-active' : ''
							}` }
							aria-current={
								current === item.route ? 'page' : undefined
							}
						>
							<span
								className={ `dashicons dashicons-${ item.icon }` }
								aria-hidden="true"
							/>
							<span>{ item.label }</span>
						</a>
					</li>
				) ) }
			</ul>
		</nav>
	);
}
