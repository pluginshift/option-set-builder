/**
 * Tiny stable-id hook (avoids depending on @wordpress/compose, which is not
 * in the admin script's declared handle deps). Returns a unique id that is
 * stable across renders of the same component instance.
 *
 * @package
 */

import { useRef } from '@wordpress/element';

let seq = 0;

/**
 * Generate a stable unique id with an optional prefix.
 *
 * @param {string} prefix Id prefix.
 * @return {string} A stable id.
 */
export default function useId( prefix = 'optset' ) {
	const ref = useRef( null );
	if ( ref.current === null ) {
		seq += 1;
		ref.current = `${ prefix }-${ seq }`;
	}
	return ref.current;
}
