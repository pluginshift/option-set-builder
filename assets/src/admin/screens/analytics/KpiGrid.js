/**
 * The four-up KPI row. Each meter encodes the funnel-stage conversion the
 * card represents (real ratios, not decoration) so the bar stays honest.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { useConfig } from '../../store/ConfigContext';
import { ratio } from './helpers';
import KpiCard from './KpiCard';

/**
 * Locale integer with thousands grouping.
 *
 * @param {number} n Value.
 * @return {string} Grouped integer.
 */
const int = ( n ) => Number( n || 0 ).toLocaleString();

/**
 * KpiGrid.
 *
 * @param {Object} props        Component props.
 * @param {Object} props.totals Summed metrics for the range.
 * @param {Object} props.deltas Signed period deltas per metric.
 * @return {JSX.Element} The KPI grid.
 */
export default function KpiGrid( { totals, deltas } ) {
	const { formatPrice } = useConfig();
	const t = totals;

	const cards = [
		{
			tone: 'blue',
			icon: 'buddicons-activity',
			label: __(
				'Total Clicks',
				'option-set-builder'
			),
			value: int( t.clicks ),
			delta: deltas.clicks,
			meter: ratio( t.clicks, t.impressions ),
			meterLabel: __(
				'Click-through rate',
				'option-set-builder'
			),
		},
		{
			tone: 'purple',
			icon: 'cart',
			label: __(
				'Cart Additions',
				'option-set-builder'
			),
			value: int( t.add_to_cart ),
			delta: deltas.add_to_cart,
			meter: ratio( t.add_to_cart, t.clicks ),
			meterLabel: __(
				'Add-to-cart rate',
				'option-set-builder'
			),
		},
		{
			tone: 'pink',
			icon: 'products',
			label: __(
				'Completed Sales',
				'option-set-builder'
			),
			value: int( t.orders ),
			delta: deltas.orders,
			meter: ratio( t.orders, t.add_to_cart ),
			meterLabel: __(
				'Checkout rate',
				'option-set-builder'
			),
		},
		{
			tone: 'green',
			icon: 'money-alt',
			label: __( 'Revenue', 'option-set-builder' ),
			value: formatPrice( t.revenue ),
			delta: deltas.revenue,
			meter: ratio( t.orders, t.impressions ),
			meterLabel: __(
				'Overall conversion rate',
				'option-set-builder'
			),
		},
	];

	return (
		<div className="optset-an-kpis">
			{ cards.map( ( c ) => (
				<KpiCard key={ c.tone } { ...c } />
			) ) }
		</div>
	);
}
