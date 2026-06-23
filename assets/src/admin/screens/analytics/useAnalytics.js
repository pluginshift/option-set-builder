/**
 * Analytics data hook. Owns the range selection, the fetch lifecycle and
 * every derived figure the screen renders (KPI totals + period deltas and
 * the conversion funnel). Components stay presentational; all the maths
 * lives here so it is computed once per response.
 *
 * The endpoint range token only constrains the *daily* series (the server
 * `table()` is a lifetime per-set aggregate), so the KPI cards, trend
 * chart and funnel react to the range while the option table is honest
 * about being all-time.
 *
 * @package
 */

import { useState, useEffect, useMemo, useCallback } from '@wordpress/element';
import * as api from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { rangeToken, ratio, trend } from './helpers';

/** Metrics summed from the daily series for the KPI row. */
const SUM_KEYS = [
	'impressions',
	'clicks',
	'add_to_cart',
	'orders',
	'revenue',
];

/**
 * useAnalytics.
 *
 * @return {Object} { status, error, range, setRange, daily, table,
 *                     totals, deltas, funnel, reload }.
 */
export default function useAnalytics() {
	const [ range, setRange ] = useState( '7d' );
	const [ status, setStatus ] = useState( 'loading' );
	const [ error, setError ] = useState( '' );
	const [ table, setTable ] = useState( [] );
	const [ daily, setDaily ] = useState( [] );

	const load = useCallback( ( rangeId ) => {
		let cancelled = false;
		setStatus( 'loading' );
		api.getAnalytics( rangeToken( rangeId ) )
			.then( ( res ) => {
				if ( cancelled ) {
					return;
				}
				setTable( Array.isArray( res.table ) ? res.table : [] );
				setDaily( Array.isArray( res.daily ) ? res.daily : [] );
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

	useEffect( () => load( range ), [ range, load ] );

	/* KPI totals + period-over-period deltas.
	   The endpoint only range-filters the daily series, so we sum that
	   for a range-aware view. When it is empty (e.g. seeded installs that
	   only populated the per-set aggregate) we fall back to the lifetime
	   `table` totals so the cards/funnel are never blank when data exists.
	   Deltas come from the daily series only and are null when it is too
	   short to compare — the cards then honestly hide the delta. */
	const { totals, deltas } = useMemo( () => {
		const sum = ( rows, k ) =>
			rows.reduce( ( s, r ) => s + ( Number( r[ k ] ) || 0 ), 0 );

		const dailyTotals = SUM_KEYS.reduce( ( acc, k ) => {
			acc[ k ] = sum( daily, k );
			return acc;
		}, {} );

		const hasDaily = SUM_KEYS.some( ( k ) => dailyTotals[ k ] > 0 );

		const t = hasDaily
			? dailyTotals
			: SUM_KEYS.reduce( ( acc, k ) => {
					acc[ k ] = sum( table, k );
					return acc;
			  }, {} );

		const d = SUM_KEYS.reduce( ( acc, k ) => {
			acc[ k ] = trend( daily, k );
			return acc;
		}, {} );
		return { totals: t, deltas: d };
	}, [ daily, table ] );

	/* Conversion funnel stages (lifetime is closer to truth here, but the
	   ranged daily totals keep the whole screen consistent). */
	const funnel = useMemo( () => {
		const viewed = totals.impressions || 0;
		const clicked = totals.clicks || 0;
		const carted = totals.add_to_cart || 0;
		const purchased = totals.orders || 0;
		return {
			viewed,
			clicked,
			carted,
			purchased,
			rates: {
				clicked: ratio( clicked, viewed ),
				carted: ratio( carted, clicked ),
				purchased: ratio( purchased, carted ),
			},
		};
	}, [ totals ] );

	return {
		status,
		error,
		range,
		setRange,
		daily,
		table,
		totals,
		deltas,
		funnel,
		reload: () => load( range ),
	};
}
