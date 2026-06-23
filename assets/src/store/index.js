/**
 * Storefront runtime bootstrap.
 *
 * Discovers every `.optset-options` wrapper and instantiates one Controller per
 * product form. Re-scans when WooCommerce replaces the cart/product markup
 * (`updated_wc_div`) or after generic AJAX page swaps, so AJAX-rendered
 * product templates are handled too.
 *
 * Also publishes `window.optsetEvaluateFormula(expr, vars, mode)` for theme /
 * integration use, mirroring the two PHP formula engines.
 *
 * @package
 */

import '../scss/store.scss';
import '../scss/blocks.scss';

import Controller from './controller';
import { evaluateFormula } from './formula';

const controllers = [];

/**
 * Scan the document and boot any not-yet-bound option wrappers.
 *
 * @return {void}
 */
function scan() {
	try {
		const roots = document.querySelectorAll( '.optset-options' );
		roots.forEach( ( root ) => {
			if ( root.__optsetBound ) {
				return;
			}
			const c = new Controller( root );
			c.init();
			controllers.push( c );
		} );
	} catch ( e ) {
		/* bootstrap must never throw into the page. */
	}
}

/**
 * Expose the public formula evaluator surface (ARCHITECTURE §1).
 *
 * @return {void}
 */
function exposeGlobals() {
	try {
		window.optsetEvaluateFormula = ( expr, vars, mode ) =>
			evaluateFormula( expr, vars || {}, mode || 'simple' );
	} catch ( e ) {
		/* read-only window — ignore. */
	}
}

/**
 * Wire all bootstrap triggers (DOM ready + WC AJAX refresh events).
 *
 * @return {void}
 */
function boot() {
	exposeGlobals();
	scan();

	const jq = window.jQuery;
	if ( jq ) {
		// WooCommerce replaces cart / mini-cart / variation markup.
		jq( document.body ).on(
			'updated_wc_div updated_cart_totals wc_fragments_refreshed wc_fragments_loaded',
			scan
		);
		// Quick-view / ajax product templates land later.
		jq( document ).ajaxComplete( () => scan() );
	}

	// Generic SPA / lazy-template fallback.
	if ( typeof window.MutationObserver === 'function' ) {
		let pending = false;
		const mo = new window.MutationObserver( () => {
			if ( pending ) {
				return;
			}
			pending = true;
			window.setTimeout( () => {
				pending = false;
				scan();
			}, 250 );
		} );
		mo.observe( document.body, { childList: true, subtree: true } );
	}
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', boot );
} else {
	boot();
}
