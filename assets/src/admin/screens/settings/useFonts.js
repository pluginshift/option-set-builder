/**
 * Custom-fonts data hook — list / upload / delete. Fonts persist
 * immediately (their own REST routes) so they live outside useSettings.
 *
 * @package
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import * as api from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useToast } from '../../store/ToastContext';

/**
 * @return {{
 *   fonts:Array, loading:boolean, busy:boolean,
 *   upload:Function, update:Function, remove:Function
 * }} Fonts state + actions.
 */
export default function useFonts() {
	const { notify } = useToast();
	const [ fonts, setFonts ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ busy, setBusy ] = useState( false );

	const refresh = useCallback( async () => {
		try {
			const res = await api.getFonts();
			setFonts( res.fonts || [] );
		} catch ( e ) {
			notify( errorMessage( e ), 'error' );
		} finally {
			setLoading( false );
		}
	}, [ notify ] );

	useEffect( () => {
		refresh();
	}, [ refresh ] );

	const upload = useCallback(
		async ( file, title, family ) => {
			setBusy( true );
			try {
				await api.uploadFont( file, title, family );
				await refresh();
				notify(
					__(
						'Font uploaded.',
						'option-set-builder'
					),
					'success'
				);
				return true;
			} catch ( e ) {
				notify( errorMessage( e ), 'error' );
				return false;
			} finally {
				setBusy( false );
			}
		},
		[ refresh, notify ]
	);

	const update = useCallback(
		async ( id, fields ) => {
			setBusy( true );
			try {
				await api.patchFont( id, fields );
				await refresh();
				notify(
					__(
						'Font updated.',
						'option-set-builder'
					),
					'success'
				);
				return true;
			} catch ( e ) {
				notify( errorMessage( e ), 'error' );
				return false;
			} finally {
				setBusy( false );
			}
		},
		[ refresh, notify ]
	);

	const remove = useCallback(
		async ( id ) => {
			try {
				await api.deleteFont( id );
				await refresh();
				notify(
					__(
						'Font deleted.',
						'option-set-builder'
					),
					'success'
				);
			} catch ( e ) {
				notify( errorMessage( e ), 'error' );
			}
		},
		[ refresh, notify ]
	);

	return { fonts, loading, busy, upload, update, remove };
}
