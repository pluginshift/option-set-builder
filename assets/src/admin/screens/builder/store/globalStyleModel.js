/**
 * Global Style model — the token shape edited by the Global Style panel and
 * the pure helpers that compile it.
 *
 * The model is small: a field **size** (px) and **corner radius** (px), a
 * colour palette and six named colours. The size drives a coherent set of
 * derived metrics (control height, font size, field gap, swatch size) so a
 * single number scales the whole control consistently.
 *
 * Two compilers turn the model into CSS:
 *   - `compileCss()` → the scoped `.optset-options{…}` rule saved to the DB and
 *                       printed on the storefront (variables from store.scss).
 *   - `cssVars()`    → a `--optset-gs-*` style object applied to the builder
 *                       canvas so edits preview live without a save.
 *
 * `normalize()` upgrades both the previous preset model (size/shape enums) and
 * the original granular token set, so existing installs keep their look.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';

/** Bounds for the two px inputs. */
export const SIZE_MIN = 28;
export const SIZE_MAX = 72;
export const RADIUS_MIN = 0;
export const RADIUS_MAX = 40;

/** Default token set. */
export const DEFAULTS = {
	sizePx: 44,
	radiusPx: 10,
	palette: 'classic',
	colors: {
		text: '#1e1e1e',
		primary: '#2563eb',
		border: '#d4d4d8',
		fill: '#ffffff',
		onPrimary: '#ffffff',
		error: '#df1c41',
	},
};

/**
 * Colour palette presets. `ramp` is the gradient preview shown on the dot;
 * `colors` is applied to the model when the preset is chosen.
 */
export const PALETTES = [
	{
		key: 'classic',
		label: __( 'Classic', 'option-set-builder' ),
		ramp: [ '#1e1e1e', '#3a3a3a', '#9a9a9a', '#ffffff' ],
		colors: {
			text: '#1e1e1e',
			primary: '#1e1e1e',
			border: '#d4d4d8',
			fill: '#ffffff',
			onPrimary: '#ffffff',
			error: '#df1c41',
		},
	},
	{
		key: 'blue',
		label: __( 'Blue', 'option-set-builder' ),
		ramp: [ '#0b1f4d', '#2563eb', '#7d9bd6', '#ffffff' ],
		colors: {
			text: '#0b1f4d',
			primary: '#2563eb',
			border: '#c7d6f0',
			fill: '#ffffff',
			onPrimary: '#ffffff',
			error: '#df1c41',
		},
	},
	{
		key: 'purple',
		label: __( 'Purple', 'option-set-builder' ),
		ramp: [ '#1c004f', '#7126ff', '#a99bd6', '#ffffff' ],
		colors: {
			text: '#1c004f',
			primary: '#7126ff',
			border: '#d3c9f2',
			fill: '#ffffff',
			onPrimary: '#ffffff',
			error: '#df1c41',
		},
	},
	{
		key: 'pink',
		label: __( 'Pink', 'option-set-builder' ),
		ramp: [ '#4a0d2e', '#db2777', '#c79bb0', '#ffffff' ],
		colors: {
			text: '#4a0d2e',
			primary: '#db2777',
			border: '#f2c9dd',
			fill: '#ffffff',
			onPrimary: '#ffffff',
			error: '#df1c41',
		},
	},
	{
		key: 'orange',
		label: __( 'Orange', 'option-set-builder' ),
		ramp: [ '#2b1700', '#ea8a1e', '#b3a08a', '#ffffff' ],
		colors: {
			text: '#2b1700',
			primary: '#ea8a1e',
			border: '#f0dcc2',
			fill: '#ffffff',
			onPrimary: '#ffffff',
			error: '#df1c41',
		},
	},
	{
		key: 'green',
		label: __( 'Green', 'option-set-builder' ),
		ramp: [ '#0d2b1a', '#16a34a', '#8aa897', '#ffffff' ],
		colors: {
			text: '#0d2b1a',
			primary: '#16a34a',
			border: '#c2e7d1',
			fill: '#ffffff',
			onPrimary: '#ffffff',
			error: '#df1c41',
		},
	},
	{
		key: 'teal',
		label: __( 'Teal', 'option-set-builder' ),
		ramp: [ '#0a2b2b', '#0d9488', '#8aa8a5', '#ffffff' ],
		colors: {
			text: '#0a2b2b',
			primary: '#0d9488',
			border: '#c2e5e2',
			fill: '#ffffff',
			onPrimary: '#ffffff',
			error: '#df1c41',
		},
	},
	{
		key: 'lime',
		label: __( 'Lime', 'option-set-builder' ),
		ramp: [ '#1a2b00', '#84cc16', '#a3b08a', '#ffffff' ],
		colors: {
			text: '#1a2b00',
			primary: '#65a30d',
			border: '#dcedc2',
			fill: '#ffffff',
			onPrimary: '#ffffff',
			error: '#df1c41',
		},
	},
];

/**
 * Clamp a value to a range, falling back when it isn't a finite number.
 *
 * @param {*}      val      Candidate value.
 * @param {number} min      Lower bound.
 * @param {number} max      Upper bound.
 * @param {number} fallback Used when val isn't numeric.
 * @return {number} Clamped number.
 */
export function clampNum( val, min, max, fallback ) {
	const n = parseFloat( val );
	if ( ! Number.isFinite( n ) ) {
		return fallback;
	}
	return Math.min( max, Math.max( min, n ) );
}

/**
 * Convert a `#rrggbb` hex to an `rgba()` string at the given alpha. Falls back
 * to the original string when it isn't a 6-digit hex.
 *
 * @param {string} hex   Hex colour.
 * @param {number} alpha Alpha 0–1.
 * @return {string} rgba() string.
 */
export function hexAlpha( hex, alpha ) {
	const m = /^#([0-9a-f]{6})$/i.exec( ( hex || '' ).trim() );
	if ( ! m ) {
		return hex || 'transparent';
	}
	const int = parseInt( m[ 1 ], 16 );
	const r = ( int >> 16 ) & 255;
	const g = ( int >> 8 ) & 255;
	const b = int & 255;
	return `rgba(${ r },${ g },${ b },${ alpha })`;
}

/**
 * Coerce any stored value (current, preset, or legacy granular model) into the
 * current token shape, so old installs keep their look.
 *
 * @param {Object} raw Stored `optset_global_style` value.
 * @return {Object} A complete, current-shape token object.
 */
export function normalize( raw ) {
	const src = raw && typeof raw === 'object' ? raw : {};

	// Already the current px model.
	if (
		typeof src.sizePx !== 'undefined' ||
		typeof src.radiusPx !== 'undefined'
	) {
		return {
			...DEFAULTS,
			...src,
			sizePx: clampNum( src.sizePx, SIZE_MIN, SIZE_MAX, DEFAULTS.sizePx ),
			radiusPx: clampNum(
				src.radiusPx,
				RADIUS_MIN,
				RADIUS_MAX,
				DEFAULTS.radiusPx
			),
			colors: { ...DEFAULTS.colors, ...( src.colors || {} ) },
		};
	}

	// Previous preset model (size/shape enums) — map to px.
	if ( src.colors && ( src.size || src.shape ) ) {
		const sizeMap = { small: 38, medium: 44, large: 52 };
		return {
			...DEFAULTS,
			sizePx: sizeMap[ src.size ] || DEFAULTS.sizePx,
			radiusPx: src.shape === 'sharp' ? 0 : 10,
			palette: src.palette || '',
			colors: { ...DEFAULTS.colors, ...src.colors },
		};
	}

	// Legacy granular model → map the keys we can.
	const colors = { ...DEFAULTS.colors };
	if ( src.accentColor ) {
		colors.primary = src.accentColor;
	}
	if ( src.textColor ) {
		colors.text = src.textColor;
	}
	if ( src.labelColor ) {
		colors.text = src.labelColor;
	}
	if ( src.borderColor ) {
		colors.border = src.borderColor;
	}
	return {
		...DEFAULTS,
		sizePx: clampNum(
			src.controlHeight,
			SIZE_MIN,
			SIZE_MAX,
			DEFAULTS.sizePx
		),
		radiusPx: clampNum(
			src.radius,
			RADIUS_MIN,
			RADIUS_MAX,
			DEFAULTS.radiusPx
		),
		palette: '',
		colors,
	};
}

/**
 * Resolve the concrete metrics for a token set. The single size px drives a
 * coherent bundle; the radius px drives corners (and circle swatches past a
 * threshold).
 *
 * @param {Object} tokens Token set.
 * @return {Object} Resolved metric bundle + colours.
 */
function resolve( tokens ) {
	const sizePx = clampNum(
		tokens.sizePx,
		SIZE_MIN,
		SIZE_MAX,
		DEFAULTS.sizePx
	);
	const radiusPx = clampNum(
		tokens.radiusPx,
		RADIUS_MIN,
		RADIUS_MAX,
		DEFAULTS.radiusPx
	);
	return {
		controlH: Math.round( sizePx ),
		fontSize: Math.max( 12, Math.min( 20, Math.round( sizePx * 0.32 ) ) ),
		gap: Math.max( 10, Math.round( sizePx * 0.42 ) ),
		swatch: Math.round( sizePx * 0.82 ),
		radius: `${ radiusPx }px`,
		pill: radiusPx >= 20 ? '999px' : `${ radiusPx }px`,
		swatchRadius: radiusPx >= 22 ? '50%' : `${ radiusPx }px`,
		colors: { ...DEFAULTS.colors, ...( tokens.colors || {} ) },
	};
}

/**
 * Compile tokens into the scoped storefront CSS rule (mirrors the variable
 * contract in `assets/src/scss/store.scss`).
 *
 * @param {Object} tokens Token set.
 * @return {string} CSS text.
 */
export function compileCss( tokens ) {
	const r = resolve( tokens );
	const c = r.colors;
	return [
		'.optset-options{',
		`--optset-label:${ c.text };`,
		`--optset-text:${ c.text };`,
		`--optset-accent:${ c.primary };`,
		`--optset-accent-contrast:${ c.onPrimary };`,
		`--optset-accent-soft:${ hexAlpha( c.primary, 0.1 ) };`,
		`--optset-border:${ c.border };`,
		`--optset-border-strong:${ c.border };`,
		`--optset-surface:${ c.fill };`,
		`--optset-required:${ c.error };`,
		`--optset-radius:${ r.radius };`,
		`--optset-radius-pill:${ r.pill };`,
		`--optset-swatch-radius:${ r.swatchRadius };`,
		`--optset-font-size:${ r.fontSize }px;`,
		`--optset-space:${ r.gap }px;`,
		`--optset-control-h:${ r.controlH }px;`,
		`--optset-swatch:${ r.swatch }px;`,
		'}',
	].join( '' );
}

/**
 * Build the `--optset-gs-*` custom-property bag applied to the builder canvas for
 * live preview. The canvas SCSS reads each with a fallback to its admin token,
 * so these only take effect inside the stage.
 *
 * @param {Object} tokens Token set.
 * @return {Object} React inline-style object.
 */
export function cssVars( tokens ) {
	const r = resolve( tokens );
	const c = r.colors;
	return {
		'--optset-gs-text': c.text,
		'--optset-gs-primary': c.primary,
		'--optset-gs-on-primary': c.onPrimary,
		'--optset-gs-soft': hexAlpha( c.primary, 0.1 ),
		'--optset-gs-border': c.border,
		'--optset-gs-fill': c.fill,
		'--optset-gs-error': c.error,
		'--optset-gs-radius': r.radius,
		'--optset-gs-swatch-radius': r.swatchRadius,
		'--optset-gs-control-h': `${ r.controlH }px`,
		'--optset-gs-font-size': `${ r.fontSize }px`,
		'--optset-gs-gap': `${ r.gap }px`,
		'--optset-gs-swatch': `${ r.swatch }px`,
	};
}
