/**
 * Analytics screen — wrapped in the unified PageFrame. The legacy
 * AnalyticsHeader was a bespoke branded header per screen; with the new
 * TopBar handling primary navigation, this screen now only renders its
 * title row (PageFrame) and the range-tabs control as the toolbar.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import {
	PageFrame,
	SkeletonStatGrid,
	SkeletonChart,
	SkeletonCard,
	FadeIn,
} from '../components';
import useAnalytics from './analytics/useAnalytics';
import RangeTabs from './analytics/RangeTabs';
import KpiGrid from './analytics/KpiGrid';
import TrendChart, { TREND_SERIES } from './analytics/TrendChart';
import ConversionFunnel from './analytics/ConversionFunnel';
import OptionTable from './analytics/OptionTable';

/**
 * Analytics.
 *
 * @return {JSX.Element} The screen.
 */
export default function Analytics() {
	const {
		status,
		error,
		range,
		setRange,
		daily,
		table,
		totals,
		deltas,
		funnel,
	} = useAnalytics();

	const loading = status === 'loading';

	return (
		<PageFrame
			title={ __(
				'Analytics Overview',
				'option-set-builder'
			) }
			subtitle={ __(
				'Track your option performance.',
				'option-set-builder'
			) }
			toolbar={
				<RangeTabs
					value={ range }
					onChange={ setRange }
					busy={ loading }
				/>
			}
		>
			{ status === 'error' ? (
				<div className="optset-an-card optset-an-state">
					<p className="optset-error">{ error }</p>
				</div>
			) : loading ? (
				<>
					<SkeletonStatGrid count={ 4 } />
					<div className="optset-an-split">
						<SkeletonChart />
						<SkeletonChart />
					</div>
				</>
			) : (
				<FadeIn>
					<KpiGrid totals={ totals } deltas={ deltas } />

					<div className="optset-an-split">
						<section className="optset-an-card optset-an-panel optset-an-panel--chart">
							<header className="optset-an-panel__head">
								<div>
									<h2 className="optset-an-panel__title">
										{ __(
											'Performance Trend',
											'option-set-builder'
										) }
									</h2>
									<p className="optset-an-panel__sub">
										{ __(
											'Daily activity breakdown',
											'option-set-builder'
										) }
									</p>
								</div>
								<ul className="optset-an-legend">
									{ TREND_SERIES.map( ( s ) => (
										<li key={ s.key }>
											<span
												className={ `optset-an-dot optset-an-dot--${ s.tone }` }
												aria-hidden="true"
											/>
											{ s.label }
										</li>
									) ) }
								</ul>
							</header>
							<TrendChart daily={ daily } />
						</section>

						<section className="optset-an-card optset-an-panel optset-an-panel--funnel">
							<header className="optset-an-panel__head">
								<div>
									<h2 className="optset-an-panel__title">
										{ __(
											'Conversion Funnel',
											'option-set-builder'
										) }
									</h2>
									<p className="optset-an-panel__sub">
										{ __(
											'User journey breakdown',
											'option-set-builder'
										) }
									</p>
								</div>
							</header>
							<ConversionFunnel funnel={ funnel } />
						</section>
					</div>
				</FadeIn>
			) }

			{ loading ? (
				<SkeletonCard lines={ 6 } />
			) : (
				<FadeIn>
					<OptionTable
						status={ status }
						error={ error }
						rows={ table }
					/>
				</FadeIn>
			) }
		</PageFrame>
	);
}
