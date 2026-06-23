/**
 * Settings data hook — owns the §10 settings map: initial fetch, a
 * `set(key, value)` patcher, a pure dirty flag and the save round-trip.
 * Fonts are managed independently (see useFonts) because they persist
 * immediately rather than on "Save settings".
 *
 * @package
 */

import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import * as api from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useToast } from '../../store/ToastContext';
import { DEFAULTS } from './config';

/** Known setting keys — the single source of truth for the schema. */
const KEYS = Object.keys( DEFAULTS );

/**
 * Keep only known keys so legacy/duplicate keys never round-trip.
 *
 * @param {Object} obj Arbitrary settings-shaped object.
 * @return {Object} Object restricted to DEFAULTS keys.
 */
const pickKnown = ( obj ) => {
	const out = {};
	KEYS.forEach( ( k ) => {
		if ( obj && Object.prototype.hasOwnProperty.call( obj, k ) ) {
			out[ k ] = obj[ k ];
		}
	} );
	return out;
};

/**
 * @return {{
 *   status:string, error:string, values:Object, dirty:boolean,
 *   saving:boolean, set:Function, save:Function
 * }} Settings state + actions.
 */
export default function useSettings() {
	const { notify } = useToast();
	const [ status, setStatus ] = useState( 'loading' );
	const [ error, setError ] = useState( '' );
	const [ values, setValues ] = useState( DEFAULTS );
	const [ saved, setSaved ] = useState( DEFAULTS );
	const [ saving, setSaving ] = useState( false );

	useEffect( () => {
		let cancelled = false;
		api.getSettings()
			.then( ( res ) => {
				if ( cancelled ) {
					return;
				}
				const merged = {
					...DEFAULTS,
					...pickKnown( res.settings || {} ),
				};
				setValues( merged );
				setSaved( merged );
				setStatus( 'ready' );
			} )
			.catch( ( e ) => {
				if ( cancelled ) {
					return;
				}
				setError( errorMessage( e ) );
				setStatus( 'error' );
			} );
		return () => {
			cancelled = true;
		};
	}, [] );

	const set = useCallback(
		( key, val ) => setValues( ( v ) => ( { ...v, [ key ]: val } ) ),
		[]
	);

	const dirty = useMemo(
		() => JSON.stringify( values ) !== JSON.stringify( saved ),
		[ values, saved ]
	);

	const save = useCallback( async () => {
		setSaving( true );
		try {
			const payload = pickKnown( values );
			await api.saveSettings( payload );
			setSaved( values );
			notify(
				__(
					'Settings saved.',
					'option-set-builder'
				),
				'success'
			);
		} catch ( e ) {
			notify( errorMessage( e ), 'error' );
		} finally {
			setSaving( false );
		}
	}, [ values, notify ] );

	return { status, error, values, dirty, saving, set, save };
}
