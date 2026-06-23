/**
 * Summary counters shown beside the screen title. Values are derived from
 * the loaded page (the list API does not expose global aggregates), so the
 * component stays honest about what it can show.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';

/**
 * OptionSetStats.
 *
 * @param {Object} props       Component props.
 * @param {Object} props.stats { total, active, inactive, fields }.
 * @return {JSX.Element} The stat cluster.
 */
export default function OptionSetStats( { stats } ) {
	const items = [
		{
			key: 'total',
			tone: 'blue',
			label: __( 'Total', 'option-set-builder' ),
			value: stats.total,
		},
		{
			key: 'active',
			tone: 'green',
			label: __( 'Active', 'option-set-builder' ),
			value: stats.active,
		},
		{
			key: 'inactive',
			tone: 'muted',
			label: __( 'Inactive', 'option-set-builder' ),
			value: stats.inactive,
		},
		{
			key: 'fields',
			tone: 'icon',
			label: __( 'Fields', 'option-set-builder' ),
			value: stats.fields,
		},
	];

	return (
		<dl
			className="optset-os-stats"
			aria-label={ __(
				'Option set summary',
				'option-set-builder'
			) }
		>
			{ items.map( ( s ) => (
				<div
					key={ s.key }
					className={ `optset-os-stat optset-os-stat--${ s.tone }` }
				>
					{ s.tone === 'icon' ? (
						<span
							className="dashicons dashicons-screenoptions optset-os-stat__icon"
							aria-hidden="true"
						/>
					) : (
						<span className="optset-os-stat__dot" aria-hidden="true" />
					) }
					<dt className="optset-os-stat__label">{ s.label }:</dt>
					<dd className="optset-os-stat__value">{ s.value }</dd>
				</div>
			) ) }
		</dl>
	);
}
