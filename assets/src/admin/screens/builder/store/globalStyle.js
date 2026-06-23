/**
 * Global Style store (zustand). Holds the storefront theme tokens that the
 * Global Style panel edits and the builder canvas previews live.
 *
 * The style is a single global record (option `optset_global_style`), loaded once
 * per builder session and saved back via the `style` REST route. Token edits
 * update local state immediately so the canvas re-renders without a round-trip;
 * Save persists the tokens plus their compiled CSS.
 *
 * @package
 */

import { create } from 'zustand';
import * as api from '../../../api/endpoints';
import { DEFAULTS, PALETTES, normalize, compileCss } from './globalStyleModel';

export const useGlobalStyle = create( ( set, get ) => ( {
	open: false,
	loaded: false,
	loading: false,
	saving: false,
	error: '',
	tokens: DEFAULTS,

	openPanel: () => {
		set( { open: true } );
		get().load();
	},
	closePanel: () => set( { open: false } ),

	/**
	 * Load the saved global style once. Subsequent calls are no-ops while a
	 * load is in flight or already complete.
	 *
	 * @return {void}
	 */
	load: () => {
		const s = get();
		if ( s.loaded || s.loading ) {
			return;
		}
		set( { loading: true, error: '' } );
		api.getStyle()
			.then( ( res ) => {
				set( {
					tokens: normalize( res && res.global ),
					loaded: true,
					loading: false,
				} );
			} )
			.catch( () => {
				// Fall back to defaults; the canvas still renders.
				set( { loaded: true, loading: false } );
			} );
	},

	/** @param {number|string} sizePx Field control size in px. */
	setSizePx: ( sizePx ) =>
		set( ( s ) => ( { tokens: { ...s.tokens, sizePx } } ) ),

	/** @param {number|string} radiusPx Corner radius in px. */
	setRadiusPx: ( radiusPx ) =>
		set( ( s ) => ( { tokens: { ...s.tokens, radiusPx } } ) ),

	/**
	 * Apply a colour palette preset (sets every colour + remembers the key).
	 *
	 * @param {string} key Palette key.
	 * @return {void}
	 */
	applyPalette: ( key ) => {
		const preset = PALETTES.find( ( p ) => p.key === key );
		if ( ! preset ) {
			return;
		}
		set( ( s ) => ( {
			tokens: {
				...s.tokens,
				palette: key,
				colors: { ...preset.colors },
			},
		} ) );
	},

	/**
	 * Patch one custom colour. Clears the active palette key, since the colours
	 * no longer match a preset.
	 *
	 * @param {string} key Colour key.
	 * @param {string} val Hex value.
	 * @return {void}
	 */
	setColor: ( key, val ) =>
		set( ( s ) => ( {
			tokens: {
				...s.tokens,
				palette: '',
				colors: { ...s.tokens.colors, [ key ]: val },
			},
		} ) ),

	/**
	 * Persist the current tokens + compiled CSS to the global style record.
	 *
	 * @param {Function} [notify] Toast callback (message, kind).
	 * @return {Promise<void>} Resolves after save.
	 */
	save: async ( notify ) => {
		const { tokens } = get();
		set( { saving: true } );
		try {
			await api.saveStyle( tokens, compileCss( tokens ), false );
			if ( notify ) {
				notify( 'success' );
			}
		} catch ( e ) {
			if ( notify ) {
				notify( 'error', e );
			}
		} finally {
			set( { saving: false } );
		}
	},
} ) );
