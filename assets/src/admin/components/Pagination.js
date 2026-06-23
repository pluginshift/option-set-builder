/**
 * Numbered pager with first / prev / next / last controls and a windowed
 * range of page buttons. Purely presentational — the parent owns the page.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';

/**
 * Build a windowed list of page numbers with `'…'` gap markers.
 *
 * @param {number} page  Current (1-based) page.
 * @param {number} total Total page count.
 * @return {Array<number|string>} Pages and ellipsis markers.
 */
function pageWindow( page, total ) {
	if ( total <= 7 ) {
		return Array.from( { length: total }, ( _, i ) => i + 1 );
	}
	const out = [ 1 ];
	const start = Math.max( 2, page - 1 );
	const end = Math.min( total - 1, page + 1 );
	if ( start > 2 ) {
		out.push( '…' );
	}
	for ( let p = start; p <= end; p++ ) {
		out.push( p );
	}
	if ( end < total - 1 ) {
		out.push( '…' );
	}
	out.push( total );
	return out;
}

/**
 * Pagination.
 *
 * @param {Object}   props          Component props.
 * @param {number}   props.page     Current page (1-based).
 * @param {number}   props.total    Total pages.
 * @param {Function} props.onChange (nextPage:number) => void.
 * @return {JSX.Element|null} The pager (null when a single page).
 */
export default function Pagination( { page, total, onChange } ) {
	if ( total <= 1 ) {
		return null;
	}
	const go = ( p ) => () => onChange( Math.min( total, Math.max( 1, p ) ) );

	/**
	 * Edge/step control button.
	 *
	 * @param {Object}  cfg          Button config.
	 * @param {string}  cfg.icon     Dashicon slug.
	 * @param {string}  cfg.label    Accessible label.
	 * @param {number}  cfg.to       Target page.
	 * @param {boolean} cfg.disabled Disabled flag.
	 * @return {JSX.Element} The control.
	 */
	const edge = ( { icon, label, to, disabled } ) => (
		<button
			type="button"
			className="optset-pagination__btn optset-pagination__btn--edge"
			onClick={ go( to ) }
			disabled={ disabled }
			aria-label={ label }
		>
			<span
				className={ `dashicons dashicons-${ icon }` }
				aria-hidden="true"
			/>
		</button>
	);

	return (
		<nav
			className="optset-pagination"
			aria-label={ __(
				'Pagination',
				'option-set-builder'
			) }
		>
			{ edge( {
				icon: 'controls-skipback',
				label: __(
					'First page',
					'option-set-builder'
				),
				to: 1,
				disabled: page <= 1,
			} ) }
			{ edge( {
				icon: 'arrow-left-alt2',
				label: __(
					'Previous page',
					'option-set-builder'
				),
				to: page - 1,
				disabled: page <= 1,
			} ) }

			{ pageWindow( page, total ).map( ( p, i ) =>
				p === '…' ? (
					<span
						key={ `gap-${ i }` }
						className="optset-pagination__gap"
						aria-hidden="true"
					>
						…
					</span>
				) : (
					<button
						key={ p }
						type="button"
						className={ `optset-pagination__btn${
							p === page ? ' is-current' : ''
						}` }
						onClick={ go( p ) }
						aria-current={ p === page ? 'page' : undefined }
						aria-label={ sprintf(
							/* translators: %d: page number */
							__(
								'Page %d',
								'option-set-builder'
							),
							p
						) }
					>
						{ p }
					</button>
				)
			) }

			{ edge( {
				icon: 'arrow-right-alt2',
				label: __(
					'Next page',
					'option-set-builder'
				),
				to: page + 1,
				disabled: page >= total,
			} ) }
			{ edge( {
				icon: 'controls-skipforward',
				label: __(
					'Last page',
					'option-set-builder'
				),
				to: total,
				disabled: page >= total,
			} ) }
		</nav>
	);
}
