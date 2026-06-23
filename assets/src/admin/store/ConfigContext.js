/**
 * Read-only access to the localized `window.optsetAdmin` bootstrap config plus
 * a few derived helpers (price formatting). Provided once at the app root so
 * screens never touch the global directly.
 *
 * @package
 */

import { createContext, useContext, useMemo } from '@wordpress/element';

const ConfigContext = createContext( {} );

/** Default currency shape if WooCommerce data is missing. */
const DEFAULT_CURRENCY = {
	symbol: '$',
	pos: 'left',
	decimals: 2,
	decimalSep: '.',
	thousandSep: ',',
};

/**
 * Provider — normalises the global once and exposes derived helpers.
 *
 * @param {Object}      props          Component props.
 * @param {JSX.Element} props.children Subtree.
 * @return {JSX.Element} Provider.
 */
export function ConfigProvider( { children } ) {
	const value = useMemo( () => {
		const cfg = ( typeof window !== 'undefined' && window.optsetAdmin ) || {};
		const currency = { ...DEFAULT_CURRENCY, ...( cfg.currency || {} ) };

		/**
		 * Format a number as a localized money string.
		 *
		 * @param {number} amount Raw amount.
		 * @return {string} Formatted price.
		 */
		const formatPrice = ( amount ) => {
			const n = Number( amount ) || 0;
			const fixed = n.toFixed( currency.decimals );
			const [ intPart, decPart ] = fixed.split( '.' );
			const grouped = intPart.replace(
				/\B(?=(\d{3})+(?!\d))/g,
				currency.thousandSep
			);
			const num =
				currency.decimals > 0
					? `${ grouped }${ currency.decimalSep }${ decPart }`
					: grouped;
			return currency.pos === 'left'
				? `${ currency.symbol }${ num }`
				: `${ num }${ currency.symbol }`;
		};

		return {
			...cfg,
			currency,
			fieldTypes: cfg.fieldTypes || [],
			attributes: cfg.attributes || {},
			user: cfg.user || {},
			formatPrice,
		};
	}, [] );

	return (
		<ConfigContext.Provider value={ value }>
			{ children }
		</ConfigContext.Provider>
	);
}

/**
 * Access the config context.
 *
 * @return {Object} The normalised config.
 */
export function useConfig() {
	return useContext( ConfigContext );
}
