/**
 * Storefront analytics pings.
 *
 * Fires POST `restUrl + 'analytics/hit'` with { setId, metric }:
 *   - 'impressions' once per set when it scrolls into view (IntersectionObserver).
 *                   Deduped via localStorage with an 18h window so a customer
 *                   reloading the same product page rapidly doesn't inflate it.
 *   - 'clicks'      on the first interaction within a set (any click / change
 *                   / input). Deduped via sessionStorage so each browser
 *                   session counts once — closing the tab/browser starts a
 *                   new session and the next click is recorded again.
 *
 * Cookie fallback is used when storage is blocked (private mode, etc.).
 *
 * @package
 */

const IMPRESSION_WINDOW = 18 * 60 * 60 * 1000;

/**
 * Read the localised store config defensively.
 *
 * @return {Object} optsetStore global or {}.
 */
function store() {
	return ( typeof window !== 'undefined' && window.optsetStore ) || {};
}

/**
 * Throttle key for a set + metric.
 *
 * @param {number} setId  Set id.
 * @param {string} metric Metric.
 * @return {string} Storage key.
 */
function key( setId, metric ) {
	return 'optset_a_' + metric + '_' + setId;
}

/**
 * Read a stored value from a web Storage (localStorage / sessionStorage).
 *
 * @param {Storage} storage Storage object.
 * @param {string}  k       Key.
 * @return {string} The value, or '' when absent / blocked.
 */
function readStore( storage, k ) {
	try {
		return storage.getItem( k ) || '';
	} catch ( e ) {
		return '';
	}
}

/**
 * Write a value to a web Storage (no-op when blocked).
 *
 * @param {Storage} storage Storage object.
 * @param {string}  k       Key.
 * @param {string}  v       Value.
 * @return {boolean} True when stored successfully.
 */
function writeStore( storage, k, v ) {
	try {
		storage.setItem( k, v );
		return true;
	} catch ( e ) {
		return false;
	}
}

/**
 * Whether a session cookie marker exists for this key (used as a fallback
 * when storage is blocked, mirroring the sessionStorage semantics — the
 * cookie has no expires attribute so it lives only for the browser session).
 *
 * @param {string} k Key.
 * @return {boolean} True when the marker is present.
 */
function hasCookieMarker( k ) {
	return new RegExp( '(?:^|; )' + k + '=' ).test( document.cookie );
}

/**
 * Set a session-scoped cookie marker (no Expires → session cookie).
 *
 * @param {string} k Key.
 * @return {void}
 */
function setCookieMarker( k ) {
	document.cookie = k + '=1; path=/; SameSite=Lax';
}

/**
 * Impression throttle — localStorage timestamp + 18h window. Falls back to a
 * dated cookie when storage is blocked.
 *
 * @param {number} setId Set id.
 * @return {boolean} True when within the window (skip ping).
 */
function impressionThrottled( setId ) {
	const k = key( setId, 'impressions' );
	const v = readStore( window.localStorage, k );
	if ( v ) {
		const last = parseInt( v, 10 ) || 0;
		if ( last > 0 && Date.now() - last < IMPRESSION_WINDOW ) {
			return true;
		}
	}
	const m = document.cookie.match(
		new RegExp( '(?:^|; )' + k + '=([^;]+)' )
	);
	if ( m ) {
		const last = parseInt( decodeURIComponent( m[ 1 ] ), 10 ) || 0;
		return last > 0 && Date.now() - last < IMPRESSION_WINDOW;
	}
	return false;
}

/**
 * Record that an impression ping was sent (localStorage; cookie fallback).
 *
 * @param {number} setId Set id.
 * @return {void}
 */
function impressionMark( setId ) {
	const k = key( setId, 'impressions' );
	const ts = Date.now();
	if ( writeStore( window.localStorage, k, String( ts ) ) ) {
		return;
	}
	const expires = new Date( ts + IMPRESSION_WINDOW ).toUTCString();
	document.cookie =
		k +
		'=' +
		encodeURIComponent( ts ) +
		'; expires=' +
		expires +
		'; path=/; SameSite=Lax';
}

/**
 * Click throttle — once per browser session via sessionStorage. Cookie
 * fallback is a session cookie (no Expires) so it also clears on browser
 * close, matching the sessionStorage semantics.
 *
 * @param {number} setId Set id.
 * @return {boolean} True when already counted this session.
 */
function clickThrottled( setId ) {
	const k = key( setId, 'clicks' );
	if ( readStore( window.sessionStorage, k ) ) {
		return true;
	}
	return hasCookieMarker( k );
}

/**
 * Record that a click was already counted this session.
 *
 * @param {number} setId Set id.
 * @return {void}
 */
function clickMark( setId ) {
	const k = key( setId, 'clicks' );
	if ( writeStore( window.sessionStorage, k, '1' ) ) {
		return;
	}
	setCookieMarker( k );
}

/**
 * Send a metric ping (best-effort; failures are silent).
 *
 * @param {number} setId  Set id.
 * @param {string} metric Metric ('impressions' | 'clicks').
 * @return {void}
 */
function ping( setId, metric ) {
	const cfg = store();
	const url = ( cfg.restUrl || '' ) + 'analytics/hit';
	if ( ! cfg.restUrl || ! setId ) {
		return;
	}
	// X-WP-Nonce satisfies WP core's REST cookie check (action `wp_rest`).
	// `optset_nonce` satisfies our route's own verify_nonce body-fallback
	// (action `optset_rest`) — required because public_nonce() opens the gate
	// but the callback still re-checks the body nonce before recording.
	const body = JSON.stringify( {
		setId,
		metric,
		optset_nonce: cfg.uploadNonce || '',
	} );
	const headers = {
		'Content-Type': 'application/json',
		'X-WP-Nonce': cfg.nonce || '',
	};

	try {
		if ( navigator.sendBeacon && metric === 'impressions' ) {
			const blob = new Blob( [ body ], {
				type: 'application/json',
			} );
			navigator.sendBeacon( url, blob );
		} else {
			window
				.fetch( url, {
					method: 'POST',
					headers,
					body,
					credentials: 'same-origin',
					keepalive: true,
				} )
				.catch( () => {} );
		}
	} catch ( e ) {
		/* never break the page on analytics. */
	}
	if ( metric === 'clicks' ) {
		clickMark( setId );
	} else {
		impressionMark( setId );
	}
}

/**
 * Attach impression + click tracking for every set under a root.
 *
 * @param {HTMLElement} root `.optset-options` wrapper.
 * @return {Function} Cleanup function.
 */
export function initAnalytics( root ) {
	const sets = root.querySelectorAll( '.optset-set[data-set-id]' );
	const cleanups = [];

	sets.forEach( ( setEl ) => {
		const setId = parseInt(
			setEl.getAttribute( 'data-set-id' ) || '0',
			10
		);
		if ( ! setId ) {
			return;
		}

		// Impressions via IntersectionObserver (fallback: immediate).
		const fireImpression = () => {
			if ( ! impressionThrottled( setId ) ) {
				ping( setId, 'impressions' );
			}
		};
		if ( typeof window.IntersectionObserver === 'function' ) {
			const io = new window.IntersectionObserver(
				( entries ) => {
					entries.forEach( ( e ) => {
						if ( e.isIntersecting ) {
							fireImpression();
							io.disconnect();
						}
					} );
				},
				{ threshold: 0.25 }
			);
			io.observe( setEl );
			cleanups.push( () => io.disconnect() );
		} else {
			fireImpression();
		}

		// First interaction → click. Listen for `click` too so non-form
		// interactions (popup triggers, image / colour swatches, button
		// groups) count alongside `change` / `input` on real form controls.
		const events = [ 'click', 'change', 'input' ];
		const onInteract = () => {
			if ( ! clickThrottled( setId ) ) {
				ping( setId, 'clicks' );
			}
			events.forEach( ( ev ) =>
				setEl.removeEventListener( ev, onInteract )
			);
		};
		events.forEach( ( ev ) => setEl.addEventListener( ev, onInteract ) );
		cleanups.push( () => {
			events.forEach( ( ev ) =>
				setEl.removeEventListener( ev, onInteract )
			);
		} );
	} );

	return () => cleanups.forEach( ( fn ) => fn() );
}
