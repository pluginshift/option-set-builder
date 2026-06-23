/**
 * Initials avatar — a coloured rounded tile derived deterministically from
 * a label so the same option set always gets the same colour.
 *
 * @package
 */

/** Must mirror $optset-os-avatars in _variables.scss (length matters). */
const PALETTE_SIZE = 8;

/**
 * Derive up to two uppercase initials from a label.
 *
 * @param {string} label Source text.
 * @return {string} 1–2 character initials (defaults to "?").
 */
function initials( label ) {
	const words = String( label || '' )
		.trim()
		.split( /\s+/ )
		.filter( Boolean );
	if ( ! words.length ) {
		return '?';
	}
	if ( words.length === 1 ) {
		return words[ 0 ].slice( 0, 2 ).toUpperCase();
	}
	return ( words[ 0 ][ 0 ] + words[ words.length - 1 ][ 0 ] ).toUpperCase();
}

/**
 * Stable, non-negative palette index for a seed.
 *
 * @param {string|number} seed Stable identifier (set id or label).
 * @return {number} Index in [0, PALETTE_SIZE).
 */
function paletteIndex( seed ) {
	const str = String( seed );
	let hash = 0;
	for ( let i = 0; i < str.length; i++ ) {
		hash = ( hash * 31 + str.charCodeAt( i ) ) | 0;
	}
	return Math.abs( hash ) % PALETTE_SIZE;
}

/**
 * Avatar.
 *
 * @param {Object}        props             Component props.
 * @param {string}        props.label       Text to derive initials from.
 * @param {string|number} [props.seed]      Colour seed (defaults to label).
 * @param {string}        [props.className] Extra class.
 * @return {JSX.Element} The avatar tile.
 */
export default function Avatar( { label, seed, className = '' } ) {
	const idx = paletteIndex( seed ?? label );
	return (
		<span
			className={ `optset-avatar optset-avatar--${ idx } ${ className }`.trim() }
			aria-hidden="true"
		>
			{ initials( label ) }
		</span>
	);
}
