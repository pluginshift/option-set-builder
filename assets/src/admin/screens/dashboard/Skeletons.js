/**
 * Loading skeletons. Rendered while the dashboard data is in flight so the
 * layout never collapses or jumps — static panels (Quick Actions, Pro)
 * stay live alongside these placeholders.
 *
 * @package
 */

/**
 * Index range helper (`[0, 1, … n-1]`) for repeating placeholder nodes.
 *
 * @param {number} n How many items.
 * @return {number[]} Index array.
 */
const times = ( n ) => Array.from( { length: n }, ( _, i ) => i );

/**
 * Stat strip placeholder (matches the four-tile grid).
 *
 * @return {JSX.Element} Skeleton strip.
 */
export function StripSkeleton() {
	return (
		<section className="optset-db-strip" aria-hidden="true">
			{ times( 4 ).map( ( i ) => (
				<div key={ i } className="optset-db-stat">
					<span className="optset-db-skel optset-db-skel--icon" />
					<div className="optset-db-stat__body">
						<span className="optset-db-skel optset-db-skel--lg" />
						<span className="optset-db-skel optset-db-skel--sm" />
					</div>
				</div>
			) ) }
		</section>
	);
}

/**
 * Generic panel placeholder with a configurable number of rows.
 *
 * @param {Object} props      Props.
 * @param {number} props.rows Row count.
 * @return {JSX.Element} Skeleton panel.
 */
export function PanelSkeleton( { rows = 4 } ) {
	return (
		<section className="optset-db-card optset-db-panel" aria-hidden="true">
			<header className="optset-db-panel__head">
				<span className="optset-db-skel optset-db-skel--title" />
			</header>
			<div className="optset-db-skel-rows">
				{ times( rows ).map( ( i ) => (
					<span key={ i } className="optset-db-skel optset-db-skel--row" />
				) ) }
			</div>
		</section>
	);
}
