/**
 * One option-performance row. Cells carry `data-label` so the table can
 * reflow into stacked cards on small screens (same pattern as Option Sets).
 *
 * The "CTR" column reuses the reference's trend-pill styling but stays
 * honestly labelled — per-set time series are not exposed by the API.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { useConfig } from '../../store/ConfigContext';
import { Avatar } from '../../components';
import { ratio } from './helpers';
import Ring from './Ring';

/**
 * OptionRow.
 *
 * @param {Object} props     Component props.
 * @param {Object} props.row Analytics table row.
 * @param {Object} props.max { clicks, revenue } column maxima for meters.
 * @return {JSX.Element} The table row.
 */
export default function OptionRow( { row, max } ) {
	const { formatPrice } = useConfig();
	const title =
		row.title ||
		sprintf(
			/* translators: %d: option set id */
			__( 'Option set #%d', 'option-set-builder' ),
			row.set_id
		);

	const cartRate = ratio( row.add_to_cart, row.clicks );
	const conversion = ratio( row.orders, row.add_to_cart );
	const ctr = Math.round( Number( row.ctr ) || 0 );
	const clicksW = ratio( row.clicks, max.clicks );
	const revW = ratio( row.revenue, max.revenue );
	const ctrUp = ctr > 0;

	const code = `OPT-${ String( row.set_id ).padStart( 3, '0' ) }`;

	return (
		<tr className="optset-an-row">
			<td
				className="optset-an-cell optset-an-cell--option"
				data-label={ __(
					'Option details',
					'option-set-builder'
				) }
			>
				<span className="optset-an-option">
					<Avatar label={ title } seed={ row.set_id } />
					<span className="optset-an-option__meta">
						<span className="optset-an-option__name">{ title }</span>
						<span className="optset-an-option__code">{ code }</span>
					</span>
				</span>
			</td>

			<td
				className="optset-an-cell optset-an-cell--num"
				data-label={ __(
					'Clicks',
					'option-set-builder'
				) }
			>
				<span className="optset-an-metric">
					<strong>
						{ Number( row.clicks || 0 ).toLocaleString() }
					</strong>
					<span className="optset-an-bar">
						<span
							className="optset-an-bar__fill optset-an-bar__fill--blue"
							style={ { width: `${ clicksW }%` } }
						/>
					</span>
				</span>
			</td>

			<td
				className="optset-an-cell optset-an-cell--ring"
				data-label={ __(
					'Cart rate',
					'option-set-builder'
				) }
			>
				<Ring value={ cartRate } tone="purple" />
			</td>

			<td
				className="optset-an-cell optset-an-cell--ring"
				data-label={ __(
					'Conversion',
					'option-set-builder'
				) }
			>
				<Ring value={ conversion } tone="green" />
			</td>

			<td
				className="optset-an-cell optset-an-cell--num"
				data-label={ __(
					'Revenue',
					'option-set-builder'
				) }
			>
				<span className="optset-an-metric">
					<strong className="optset-an-revenue">
						{ formatPrice( row.revenue ) }
					</strong>
					<span className="optset-an-bar">
						<span
							className="optset-an-bar__fill optset-an-bar__fill--green"
							style={ { width: `${ revW }%` } }
						/>
					</span>
				</span>
			</td>

			<td
				className="optset-an-cell optset-an-cell--end"
				data-label={ __(
					'CTR',
					'option-set-builder'
				) }
			>
				<span
					className={ `optset-an-pill optset-an-pill--${
						ctrUp ? 'up' : 'flat'
					}` }
				>
					<span
						className={ `dashicons dashicons-arrow-${
							ctrUp ? 'up' : 'right'
						}-alt` }
						aria-hidden="true"
					/>
					{ ctr }%
				</span>
			</td>
		</tr>
	);
}
