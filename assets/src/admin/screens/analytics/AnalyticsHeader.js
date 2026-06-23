/**
 * Screen header — branded icon tile, title/subtitle and the range control.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import RangeTabs from './RangeTabs';

/**
 * AnalyticsHeader.
 *
 * @param {Object}   props         Component props.
 * @param {string}   props.range   Active range id.
 * @param {Function} props.onRange (id) => void.
 * @param {boolean}  [props.busy]  Whether a fetch is in flight.
 * @return {JSX.Element} The header.
 */
export default function AnalyticsHeader( { range, onRange, busy } ) {
	return (
		<header className="optset-an-head">
			<div className="optset-an-head__title">
				<span className="optset-an-head__icon" aria-hidden="true">
					<span className="dashicons dashicons-chart-bar" />
				</span>
				<div>
					<h1 className="optset-an-head__h1">
						{ __(
							'Analytics Overview',
							'option-set-builder'
						) }
					</h1>
					<p className="optset-an-head__sub">
						{ __(
							'Track your option performance',
							'option-set-builder'
						) }
					</p>
				</div>
			</div>
			<RangeTabs value={ range } onChange={ onRange } busy={ busy } />
		</header>
	);
}
