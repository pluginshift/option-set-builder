/**
 * Option Set Builder Admin — Premium Skeleton loaders.
 *
 * Lightweight (no npm dependency), theme-aware via CSS variables, with a
 * smooth shimmer animation. Pre-composed variants mirror the layouts they
 * stand in for so the loading state never reflows the page when real
 * content lands.
 *
 * Theming: all colours come from the Global Theme tokens, so the loaders
 * automatically adapt when the active palette (or future dark mode) changes.
 *
 * Usage:
 *   <SkeletonTable rows={ 6 } cols={ 5 } />
 *   <SkeletonCard lines={ 3 } media />
 *   <SkeletonText lines={ 4 } />
 *
 * @package
 */

import { __ } from '@wordpress/i18n';

/**
 * [0..n-1] helper for repeating placeholder nodes.
 * @param n
 */
const range = ( n ) => Array.from( { length: n }, ( _, i ) => i );

/**
 * Base skeleton block. Internally just a div with the shimmer class; the
 * shape (width / height / radius) is driven by inline styles or extra
 * className modifiers, so consumers stay in full control of geometry.
 *
 * @param {Object}        props             Props.
 * @param {string|number} [props.w]         Width (any CSS length, default 100%).
 * @param {string|number} [props.h]         Height (default 12px).
 * @param {string}        [props.r]         Border-radius (default `--optset-r-sm`).
 * @param {string}        [props.className] Extra class names.
 * @param {Object}        [props.style]     Inline style overrides.
 * @return {JSX.Element} Block element.
 */
export function Skeleton( {
	w = '100%',
	h = 12,
	r,
	className = '',
	style = {},
} ) {
	const css = {
		inlineSize: typeof w === 'number' ? `${ w }px` : w,
		blockSize: typeof h === 'number' ? `${ h }px` : h,
		...( r ? { borderRadius: r } : null ),
		...style,
	};
	return (
		<span
			className={ `optset-skel ${ className }`.trim() }
			style={ css }
			aria-hidden="true"
		/>
	);
}

/* ───────────────────────────────────────────────────────────────────────
 * Composed variants
 * ─────────────────────────────────────────────────────────────────────── */

/**
 * Repeating text lines with a decreasing-width tail so the cluster reads
 * like a real paragraph.
 *
 * @param {Object} props         Props.
 * @param {number} [props.lines] Line count (default 3).
 * @return {JSX.Element} Text cluster.
 */
export function SkeletonText( { lines = 3 } ) {
	return (
		<div className="optset-skel-text" aria-hidden="true">
			{ range( lines ).map( ( i ) => (
				<Skeleton
					key={ i }
					w={ i === lines - 1 ? '60%' : '100%' }
					h={ 10 }
				/>
			) ) }
		</div>
	);
}

/**
 * Generic card placeholder — title, optional media block, body lines and
 * a trailing action row.
 *
 * @param {Object}  props          Props.
 * @param {number}  [props.lines]  Body lines (default 3).
 * @param {boolean} [props.media]  Render a wide media block above the body.
 * @param {boolean} [props.action] Render an action row at the bottom.
 * @return {JSX.Element} Card.
 */
export function SkeletonCard( { lines = 3, media = false, action = false } ) {
	return (
		<section className="optset-skel-card" aria-hidden="true">
			<header className="optset-skel-card__head">
				<Skeleton w={ 160 } h={ 16 } />
				<Skeleton w={ 28 } h={ 28 } r="50%" />
			</header>
			{ media && <Skeleton h={ 140 } r="var(--optset-r-md)" /> }
			<SkeletonText lines={ lines } />
			{ action && (
				<div className="optset-skel-card__foot">
					<Skeleton w={ 96 } h={ 32 } r="var(--optset-r-md)" />
				</div>
			) }
		</section>
	);
}

/**
 * KPI / stat tile placeholder (icon tile + big number + small label).
 *
 * @return {JSX.Element} Stat tile.
 */
export function SkeletonStat() {
	return (
		<div className="optset-skel-stat" aria-hidden="true">
			<Skeleton w={ 44 } h={ 44 } r="var(--optset-r-md)" />
			<div className="optset-skel-stat__body">
				<Skeleton w="55%" h={ 22 } />
				<Skeleton w="40%" h={ 10 } />
			</div>
		</div>
	);
}

/**
 * Grid of stat tiles — matches the dashboard / analytics KPI strips.
 *
 * @param {Object} props         Props.
 * @param {number} [props.count] Tile count (default 4).
 * @return {JSX.Element} Grid.
 */
export function SkeletonStatGrid( { count = 4 } ) {
	return (
		<div className="optset-skel-stat-grid" aria-hidden="true">
			{ range( count ).map( ( i ) => (
				<SkeletonStat key={ i } />
			) ) }
		</div>
	);
}

/**
 * Data-table placeholder — head row + N body rows × M columns. The first
 * column is narrower (acts as a thumbnail / index), the last column is
 * narrower too (acts as an action cluster), so the layout reads like a
 * real table.
 *
 * @param {Object} props        Props.
 * @param {number} [props.rows] Body rows (default 6).
 * @param {number} [props.cols] Columns (default 5).
 * @return {JSX.Element} Table.
 */
export function SkeletonTable( { rows = 6, cols = 5 } ) {
	return (
		<div
			className="optset-skel-table"
			role="status"
			aria-label={ __(
				'Loading…',
				'option-set-builder'
			) }
		>
			<div className="optset-skel-table__head">
				{ range( cols ).map( ( i ) => (
					<Skeleton
						key={ i }
						w={ i === 0 ? 28 : i === cols - 1 ? 96 : '60%' }
						h={ 12 }
					/>
				) ) }
			</div>
			<div className="optset-skel-table__body">
				{ range( rows ).map( ( r ) => (
					<div key={ r } className="optset-skel-table__row">
						{ range( cols ).map( ( c ) => (
							<Skeleton
								key={ c }
								w={ c === 0 ? 28 : c === cols - 1 ? 96 : '70%' }
								h={ c === 0 ? 28 : 12 }
								r={ c === 0 ? '50%' : undefined }
							/>
						) ) }
					</div>
				) ) }
			</div>
		</div>
	);
}

/**
 * Chart placeholder — title row + four bars rising into the canvas so the
 * empty state still reads as "chart loading," not a blank rectangle.
 *
 * @return {JSX.Element} Chart.
 */
export function SkeletonChart() {
	const bars = [ 35, 65, 50, 80, 45, 70, 90, 60 ];
	return (
		<div className="optset-skel-chart" aria-hidden="true">
			<header className="optset-skel-chart__head">
				<Skeleton w={ 180 } h={ 14 } />
				<Skeleton w={ 120 } h={ 10 } />
			</header>
			<div className="optset-skel-chart__plot">
				{ bars.map( ( h, i ) => (
					<span
						key={ i }
						className="optset-skel optset-skel-chart__bar"
						style={ { blockSize: `${ h }%` } }
					/>
				) ) }
			</div>
		</div>
	);
}

/**
 * Form placeholder — repeated label + control rows.
 *
 * @param {Object} props          Props.
 * @param {number} [props.fields] Field count (default 4).
 * @return {JSX.Element} Form.
 */
export function SkeletonForm( { fields = 4 } ) {
	return (
		<div className="optset-skel-form" aria-hidden="true">
			{ range( fields ).map( ( i ) => (
				<div key={ i } className="optset-skel-form__row">
					<Skeleton w="30%" h={ 10 } />
					<Skeleton h={ 36 } r="var(--optset-r-md)" />
				</div>
			) ) }
		</div>
	);
}

/**
 * Horizontal tab bar placeholder.
 *
 * @param {Object} props         Props.
 * @param {number} [props.count] Tab count (default 4).
 * @return {JSX.Element} Tab strip.
 */
export function SkeletonTabs( { count = 4 } ) {
	return (
		<div className="optset-skel-tabs" aria-hidden="true">
			{ range( count ).map( ( i ) => (
				<Skeleton
					key={ i }
					w={ 90 + ( i % 3 ) * 14 }
					h={ 32 }
					r="var(--optset-r-md)"
				/>
			) ) }
		</div>
	);
}

/**
 * Modal / popup placeholder — title, body lines, footer with two buttons.
 *
 * @return {JSX.Element} Modal.
 */
export function SkeletonModal() {
	return (
		<div className="optset-skel-modal" aria-hidden="true">
			<Skeleton w="50%" h={ 20 } />
			<SkeletonText lines={ 4 } />
			<div className="optset-skel-modal__foot">
				<Skeleton w={ 90 } h={ 36 } r="var(--optset-r-md)" />
				<Skeleton w={ 110 } h={ 36 } r="var(--optset-r-md)" />
			</div>
		</div>
	);
}

/**
 * Vertical nav / sidebar menu placeholder.
 *
 * @param {Object} props         Props.
 * @param {number} [props.items] Item count (default 6).
 * @return {JSX.Element} Nav.
 */
export function SkeletonNav( { items = 6 } ) {
	return (
		<nav className="optset-skel-nav" aria-hidden="true">
			{ range( items ).map( ( i ) => (
				<div key={ i } className="optset-skel-nav__item">
					<Skeleton w={ 22 } h={ 22 } r="var(--optset-r-sm)" />
					<Skeleton w={ 80 + ( i % 3 ) * 24 } h={ 12 } />
				</div>
			) ) }
		</nav>
	);
}

/**
 * Builder placeholder — preloaded version of the real Option Builder stage.
 *
 * Mirrors `Canvas.js` 1:1: sticky chrome bar + a two-column product layout
 * (gallery on the left, summary card on the right) inside the same
 * `optset-builder__stage-wrap` so the skeleton never causes a layout jump
 * when the real content lands.
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │  back · title bar · build/preview · save             │  ← sticky topbar
 *   ├──────────────────────────────────────────────────────┤
 *   │  ┌──────────┐   ┌─────────────────────────────────┐  │
 *   │  │          │   │ Product title                   │  │
 *   │  │  main    │   │ $price                          │  │
 *   │  │  image   │   │                                 │  │
 *   │  │          │   │ ┌─ field card ─────────────┐    │  │
 *   │  └──────────┘   │ │  label · input           │    │  │
 *   │  □ □ □          │ └──────────────────────────┘    │  │
 *   │  thumbs         │ ┌─ field card ─────────────┐    │  │
 *   │                 │ │  label · textarea        │    │  │
 *   │                 │ └──────────────────────────┘    │  │
 *   │                 │ … (4 cards total)               │  │
 *   │                 │ ┌─ add to cart ───────────┐     │  │
 *   │                 │ └─────────────────────────┘     │  │
 *   │                 └─────────────────────────────────┘  │
 *   └──────────────────────────────────────────────────────┘
 *
 * @return {JSX.Element} Builder skeleton.
 */
export function SkeletonBuilder() {
	return (
		<div
			className="optset-skel-builder"
			role="status"
			aria-label={ __(
				'Loading option builder…',
				'option-set-builder'
			) }
		>
			{ /* ── Sticky chrome (back, title, segmented, actions, save) */ }
			<header className="optset-skel-builder__topbar">
				<Skeleton w={ 32 } h={ 32 } r="var(--optset-r-md)" />
				<Skeleton h={ 32 } r="var(--optset-r-md)" />
				<div className="optset-skel-builder__topbar-right">
					<Skeleton w={ 160 } h={ 32 } r="var(--optset-r-full)" />
					<Skeleton w={ 90 } h={ 32 } r="var(--optset-r-md)" />
					<Skeleton w={ 110 } h={ 32 } r="var(--optset-r-md)" />
					<Skeleton w={ 78 } h={ 32 } r="var(--optset-r-md)" />
				</div>
			</header>

			{ /* ── Stage : two-column product layout */ }
			<div className="optset-skel-builder__stage-wrap">
				<div className="optset-skel-builder__stage">
					{ /* Left: gallery */ }
					<aside className="optset-skel-builder__gallery">
						<Skeleton
							h="100%"
							r="var(--optset-r-lg)"
							className="optset-skel-builder__hero"
						/>
						<div className="optset-skel-builder__thumbs">
							{ range( 3 ).map( ( i ) => (
								<Skeleton
									key={ i }
									h="100%"
									r="var(--optset-r-md)"
									className="optset-skel-builder__thumb"
								/>
							) ) }
						</div>
					</aside>

					{ /* Right: summary card */ }
					<section className="optset-skel-builder__summary">
						<Skeleton w="65%" h={ 22 } />
						<Skeleton w="28%" h={ 18 } />

						<div className="optset-skel-builder__options">
							{ range( 4 ).map( ( i ) => (
								<div
									key={ i }
									className="optset-skel-builder__field"
								>
									<Skeleton w="35%" h={ 11 } />
									<Skeleton
										h={ i === 2 ? 88 : 40 }
										r="var(--optset-r-md)"
									/>
								</div>
							) ) }
						</div>

						<Skeleton
							h={ 48 }
							r="var(--optset-r-md)"
							className="optset-skel-builder__atc"
						/>
					</section>
				</div>
			</div>
		</div>
	);
}

/**
 * Fade-in container — wrap real content with this so it cross-fades into
 * view once the skeleton is swapped out.
 *
 * @param {Object}      props           Props.
 * @param {JSX.Element} props.children  Content.
 * @param {string}      [props.as]      Wrapper element (default 'div').
 * @param               props.className
 * @return {JSX.Element} Wrapper.
 */
export function FadeIn( {
	children,
	as: Tag = 'div',
	className = '',
	...rest
} ) {
	return (
		<Tag className={ `optset-fadein ${ className }`.trim() } { ...rest }>
			{ children }
		</Tag>
	);
}
