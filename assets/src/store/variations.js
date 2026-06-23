/**
 * Variable-product price syncing.
 *
 * Listens for WooCommerce's jQuery `found_variation` / `reset_data` events
 * on the variations form and updates the controller's base price /
 * percent-base from the `#optset-variation-prices` and
 * `#optset-variation-prices-pct` holder maps (keyed by variation id), then
 * triggers a recompute.
 *
 * @package
 */

/**
 * Parse a holder span's JSON `data-value`.
 *
 * @param {HTMLElement} root `.optset-options` wrapper.
 * @param {string}      id   Holder element id.
 * @return {Object} Parsed map (empty on failure).
 */
function holderMap( root, id ) {
	const el = root.querySelector( '#' + id );
	if ( ! el ) {
		return {};
	}
	const raw = el.getAttribute( 'data-value' );
	if ( ! raw ) {
		return {};
	}
	try {
		const parsed = JSON.parse( raw );
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch ( e ) {
		return {};
	}
}

/**
 * Read the static (non-variation) base price holders.
 *
 * @param {HTMLElement} root `.optset-options` wrapper.
 * @return {{ base:number, pct:number }} Static base values.
 */
export function readBase( root ) {
	const baseEl = root.querySelector( '#optset-base-price' );
	const pctEl = root.querySelector( '#optset-base-price-pct' );
	const num = ( el ) =>
		el ? parseFloat( el.getAttribute( 'data-value' ) || '0' ) || 0 : 0;
	return { base: num( baseEl ), pct: num( pctEl ) };
}

/**
 * Wire WooCommerce variation events to a base-price setter.
 *
 * @param {HTMLElement} root  `.optset-options` wrapper.
 * @param {HTMLElement} form  The product `form.cart`.
 * @param {Function}    apply Called with ({ base, pct }) to set + recompute.
 * @return {Function} Cleanup function.
 */
export function initVariations( root, form, apply ) {
	const jq = window.jQuery;
	const staticBase = readBase( root );

	// Non-variable products: nothing to wire, base is already static.
	if ( ! form || ! jq ) {
		return () => {};
	}

	const $form = jq( form );

	const onFound = ( _e, variation ) => {
		if ( ! variation || ! variation.variation_id ) {
			return;
		}
		const vid = String( variation.variation_id );
		const prices = holderMap( root, 'optset-variation-prices' );
		const pcts = holderMap( root, 'optset-variation-prices-pct' );
		const base =
			prices[ vid ] !== undefined
				? parseFloat( prices[ vid ] ) || 0
				: staticBase.base;
		const pct =
			pcts[ vid ] !== undefined ? parseFloat( pcts[ vid ] ) || 0 : base;
		apply( { base, pct } );
	};

	const onReset = () => {
		apply( { base: staticBase.base, pct: staticBase.pct } );
	};

	$form.on( 'found_variation', onFound );
	$form.on( 'reset_data', onReset );

	return () => {
		$form.off( 'found_variation', onFound );
		$form.off( 'reset_data', onReset );
	};
}
