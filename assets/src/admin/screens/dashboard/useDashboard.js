/**
 * Dashboard data hook. Fetches the analytics aggregate (all-time per-set
 * table + a 30-day daily series) and the most recent option sets in
 * parallel, then derives every figure the screen renders so the
 * presentational components stay declarative.
 *
 * All maths is computed once per response (memoised). The derivations
 * mirror useAnalytics() — daily sums when present, falling back to the
 * lifetime table — so the Dashboard and Analytics screens never disagree.
 *
 * @package
 */

import { useState, useEffect, useMemo, useCallback } from '@wordpress/element';
import * as api from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { rangeToken, trend, ratio, absDelta } from './helpers';

/** Metrics summed from the daily series / lifetime table. */
const SUM_KEYS = [
	'impressions',
	'clicks',
	'add_to_cart',
	'orders',
	'revenue',
];

/**
 * useDashboard.
 *
 * @return {Object} { status, error, reload, totals, deltas, sets,
 *                     activity, performers, checklist, progress }.
 */
export default function useDashboard() {
	const [ status, setStatus ] = useState( 'loading' );
	const [ error, setError ] = useState( '' );
	const [ table, setTable ] = useState( [] );
	const [ daily, setDaily ] = useState( [] );
	const [ sets, setSets ] = useState( [] );

	const load = useCallback( () => {
		let cancelled = false;
		setStatus( 'loading' );

		Promise.all( [
			api.getAnalytics( rangeToken( '30d' ) ),
			api.listSets( { page: 1, per_page: 100, order: 'DESC' } ),
		] )
			.then( ( [ an, ls ] ) => {
				if ( cancelled ) {
					return;
				}
				setTable( Array.isArray( an.table ) ? an.table : [] );
				setDaily( Array.isArray( an.daily ) ? an.daily : [] );
				setSets( Array.isArray( ls.items ) ? ls.items : [] );
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

	useEffect( () => load(), [ load ] );

	/* KPI totals + signed deltas. Prefer the range-aware daily series; fall
	   back to the lifetime per-set table when the daily series is empty
	   (seeded installs) so the strip is never blank when data exists. */
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

		return {
			totals: t,
			deltas: {
				impressions: trend( daily, 'impressions' ),
				add_to_cart: trend( daily, 'add_to_cart' ),
				revenue: trend( daily, 'revenue' ),
				revenueAbs: absDelta( daily, 'revenue' ),
			},
		};
	}, [ daily, table ] );

	/* Onboarding checklist — every step is derived from real account
	   state, so the progress meter is honest. */
	const checklist = useMemo( () => {
		const published = sets.filter( ( s ) => s.published ).length;
		const withFields = sets.some( ( s ) => Number( s.fields ) > 0 );
		return [
			{
				id: 'create',
				done: sets.length > 0,
				to: '/set/new',
			},
			{
				id: 'fields',
				done: withFields,
				to: sets.length ? `/set/${ sets[ 0 ].id }` : '/set/new',
			},
			{
				id: 'publish',
				done: published > 0,
				to: '/sets',
			},
			{
				id: 'track',
				done: ( totals.impressions || 0 ) > 0,
				to: '/analytics',
			},
		];
	}, [ sets, totals ] );

	const progress = useMemo(
		() => checklist.filter( ( s ) => s.done ).length,
		[ checklist ]
	);

	/* Recent activity — synthesised from the latest sets ordered by their
	   modified time. Honest about what we know (saved vs. published). */
	const activity = useMemo(
		() =>
			[ ...sets ]
				.sort( ( a, b ) =>
					String( b.updated || '' ).localeCompare(
						String( a.updated || '' )
					)
				)
				.slice( 0, 5 )
				.map( ( s ) => ( {
					id: s.id,
					title: s.title,
					updated: s.updated,
					kind: s.published ? 'published' : 'draft',
					fields: Number( s.fields ) || 0,
				} ) ),
		[ sets ]
	);

	/* Top performers — best revenue-earning option sets (all-time). */
	const performers = useMemo(
		() =>
			[ ...table ]
				.sort(
					( a, b ) =>
						( Number( b.revenue ) || 0 ) -
						( Number( a.revenue ) || 0 )
				)
				.slice( 0, 3 )
				.map( ( r ) => ( {
					id: r.set_id,
					title: r.title,
					orders: Number( r.orders ) || 0,
					revenue: Number( r.revenue ) || 0,
					ctr: Math.round( Number( r.ctr ) || 0 ),
				} ) ),
		[ table ]
	);

	const setsCount = Math.max( sets.length, table.length );
	const publishedCount = sets.filter( ( s ) => s.published ).length;

	return {
		status,
		error,
		reload: load,
		totals,
		deltas,
		setsCount,
		publishedCount,
		cartRate: ratio( totals.add_to_cart, totals.impressions ),
		activity,
		performers,
		checklist,
		progress,
	};
}
