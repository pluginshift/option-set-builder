/**
 * Lightweight toast notification system. `useToast()` returns a `notify`
 * dispatcher; the visual stack is rendered by the layout via <ToastStack/>.
 *
 * @package
 */

import {
	createContext,
	useContext,
	useState,
	useCallback,
	useRef,
} from '@wordpress/element';

const ToastContext = createContext( { notify: () => {} } );

/**
 * Provider holding the active toast list.
 *
 * @param {Object}      props          Component props.
 * @param {JSX.Element} props.children Subtree.
 * @return {JSX.Element} Provider.
 */
export function ToastProvider( { children } ) {
	const [ toasts, setToasts ] = useState( [] );
	const idRef = useRef( 0 );

	/**
	 * Remove a toast by id.
	 *
	 * @param {number} id Toast id.
	 * @return {void}
	 */
	const dismiss = useCallback( ( id ) => {
		setToasts( ( list ) => list.filter( ( t ) => t.id !== id ) );
	}, [] );

	/**
	 * Push a toast.
	 *
	 * @param {string} message Message text.
	 * @param {string} type    success|error|info|warning.
	 * @return {void}
	 */
	const notify = useCallback(
		( message, type = 'info' ) => {
			idRef.current += 1;
			const id = idRef.current;
			setToasts( ( list ) => [ ...list, { id, message, type } ] );
			window.setTimeout(
				() => dismiss( id ),
				type === 'error' ? 6000 : 4000
			);
		},
		[ dismiss ]
	);

	return (
		<ToastContext.Provider value={ { toasts, notify, dismiss } }>
			{ children }
		</ToastContext.Provider>
	);
}

/**
 * Access the toast API.
 *
 * @return {{toasts:Array, notify:Function, dismiss:Function}} Toast API.
 */
export function useToast() {
	return useContext( ToastContext );
}
