/**
 * General-tab config for the Linked Products field. Lets the editor attach
 * real WooCommerce products (and, for variable products, a curated set of
 * variations) that the shopper can add to the cart as their own line items —
 * never priced through the options calculator.
 *
 * The control surface is bespoke: a debounced product search that appends to a
 * sortable table, an inline "Select Variations" popover per variable product,
 * and the display toggles (merge variations / quantity / allow multiple). Every
 * value is written to the exact `config` keys LinkedProductsField.php and the
 * store `collectLinkedProducts` reader consume.
 *
 * @package
 */

import { useState, useRef, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Search, Plus, Trash2, X, GripVertical } from 'lucide-react';
import * as api from '../../../api/endpoints';
import { errorMessage } from '../../../api/client';
import {
	ToggleField,
	TextControl,
	Field,
	DragList,
} from '../../../components';
import { reorder } from '../../../components/DragList';

/**
 * Normalise a search result row into the stored product shape. Caches enough
 * variation metadata to drive the builder preview + the variations popover
 * without a second round-trip; the storefront always reads live WC data.
 *
 * @param {Object} item Search result row.
 * @return {Object} Stored product entry.
 */
function toProduct( item ) {
	const meta = ( item.variation || [] ).map( ( v ) => ( {
		id: Number( v.id ),
		label: v.label,
		img: v.img || '',
		regular: v.regular ?? '',
		sale: v.sale ?? '',
	} ) );
	return {
		id: Number( item.id ),
		name: item.label || '',
		img: item.img || '',
		url: item.url || '',
		isVariable: !! item.isVariable,
		regular: item.regular ?? '',
		sale: item.sale ?? '',
		// Variable products start with every variation enabled; the editor
		// can trim the list from the popover.
		variations: meta.map( ( v ) => v.id ),
		variationsMeta: meta,
	};
}

/**
 * Debounced product search box that appends the chosen product to the table.
 *
 * @param {Object}   props          Component props.
 * @param {Array}    props.selected Already-linked product ids.
 * @param {boolean}  props.disabled Whether the picker is capped/locked.
 * @param {Function} props.onAdd    (product) => void.
 * @return {JSX.Element} The search control.
 */
function ProductSearch( { selected, disabled, onAdd } ) {
	const [ term, setTerm ] = useState( '' );
	const [ results, setResults ] = useState( [] );
	const [ busy, setBusy ] = useState( false );
	const [ open, setOpen ] = useState( false );
	const [ err, setErr ] = useState( '' );
	const timer = useRef( null );
	const boxRef = useRef( null );

	useEffect( () => {
		const onDoc = ( e ) => {
			if ( boxRef.current && ! boxRef.current.contains( e.target ) ) {
				setOpen( false );
			}
		};
		document.addEventListener( 'mousedown', onDoc );
		return () => document.removeEventListener( 'mousedown', onDoc );
	}, [] );

	const runSearch = useCallback(
		( q ) => {
			if ( timer.current ) {
				window.clearTimeout( timer.current );
			}
			timer.current = window.setTimeout( async () => {
				setBusy( true );
				setErr( '' );
				try {
					const r = await api.searchProducts( q, selected );
					setResults( r.items || [] );
					setOpen( true );
				} catch ( e ) {
					setErr( errorMessage( e ) );
				} finally {
					setBusy( false );
				}
			}, 300 );
		},
		[ selected ]
	);

	const selectedSet = new Set( selected );

	return (
		<div className="optset-lp-search" ref={ boxRef }>
			<span className="optset-lp-search__icon" aria-hidden="true">
				<Search size={ 15 } />
			</span>
			<input
				type="text"
				className="optset-input optset-lp-search__input"
				value={ term }
				disabled={ disabled }
				placeholder={
					disabled
						? __(
								'Product limit reached',
								'option-set-builder'
						  )
						: __(
								'Search…',
								'option-set-builder'
						  )
				}
				onChange={ ( e ) => {
					setTerm( e.target.value );
					runSearch( e.target.value );
				} }
				onFocus={ () => results.length && setOpen( true ) }
			/>
			{ open && ! disabled && (
				<ul className="optset-lp-search__menu" role="listbox">
					{ busy && (
						<li className="optset-lp-search__msg">
							{ __(
								'Searching…',
								'option-set-builder'
							) }
						</li>
					) }
					{ ! busy && err && (
						<li className="optset-lp-search__msg optset-lp-search__msg--err">
							{ err }
						</li>
					) }
					{ ! busy && ! err && results.length === 0 && (
						<li className="optset-lp-search__msg">
							{ __(
								'No products found.',
								'option-set-builder'
							) }
						</li>
					) }
					{ ! busy &&
						results.map( ( r ) => (
							<li key={ r.id }>
								<button
									type="button"
									className="optset-lp-search__opt"
									disabled={ selectedSet.has(
										Number( r.id )
									) }
									onClick={ () => {
										onAdd( toProduct( r ) );
										setTerm( '' );
										setResults( [] );
										setOpen( false );
									} }
								>
									{ r.img && <img src={ r.img } alt="" /> }
									<span>{ r.label }</span>
								</button>
							</li>
						) ) }
				</ul>
			) }
		</div>
	);
}

/**
 * Inline "Select Variations" popover for one variable product. Lists every
 * available variation; clicking a row toggles its membership in the linked set.
 *
 * @param {Object}   props          Component props.
 * @param {Object}   props.product  Linked product entry.
 * @param {Function} props.onToggle (variationId) => void.
 * @param {Function} props.onClose  () => void.
 * @return {JSX.Element} The popover.
 */
function VariationPopover( { product, onToggle, onClose } ) {
	const ref = useRef( null );
	const selected = new Set( product.variations || [] );

	useEffect( () => {
		const onDoc = ( e ) => {
			if ( ref.current && ! ref.current.contains( e.target ) ) {
				onClose();
			}
		};
		document.addEventListener( 'mousedown', onDoc );
		return () => document.removeEventListener( 'mousedown', onDoc );
	}, [ onClose ] );

	return (
		<div className="optset-lp-vars" ref={ ref }>
			<p className="optset-lp-vars__title">
				{ __(
					'Select Variations',
					'option-set-builder'
				) }
			</p>
			<div className="optset-lp-vars__list">
				{ ( product.variationsMeta || [] ).length === 0 && (
					<p className="optset-lp-vars__empty">
						{ __(
							'No purchasable variations.',
							'option-set-builder'
						) }
					</p>
				) }
				{ ( product.variationsMeta || [] ).map( ( v ) => {
					const on = selected.has( v.id );
					return (
						<button
							key={ v.id }
							type="button"
							className={ `optset-lp-vars__row${
								on ? ' is-on' : ''
							}` }
							onClick={ () => onToggle( v.id ) }
						>
							<span className="optset-lp-vars__label">
								{ v.label }
							</span>
							{ on ? (
								<X size={ 14 } className="optset-lp-vars__x" />
							) : (
								<Plus
									size={ 14 }
									className="optset-lp-vars__add"
								/>
							) }
						</button>
					);
				} ) }
			</div>
		</div>
	);
}

/**
 * LinkedProductsConfig.
 *
 * @param {Object}   props       Component props.
 * @param {Object}   props.node  Selected node.
 * @param {Function} props.patch (partialNode) => void.
 * @return {JSX.Element} The config block.
 */
export default function LinkedProductsConfig( { node, patch } ) {
	const cfg = node.config || {};
	const products = Array.isArray( cfg.products ) ? cfg.products : [];
	const [ openIdx, setOpenIdx ] = useState( -1 );

	const setKey = ( key, value ) =>
		patch( { config: { ...cfg, [ key ]: value } } );
	const setProducts = ( next ) => setKey( 'products', next );

	const addProduct = ( product ) => {
		if ( products.some( ( p ) => p.id === product.id ) ) {
			return;
		}
		setProducts( [ ...products, product ] );
	};
	const removeProduct = ( idx ) => {
		setOpenIdx( -1 );
		setProducts( products.filter( ( _, i ) => i !== idx ) );
	};
	const patchProduct = ( idx, partial ) =>
		setProducts(
			products.map( ( p, i ) => ( i === idx ? { ...p, ...partial } : p ) )
		);
	const toggleVariation = ( idx, vid ) => {
		const cur = products[ idx ].variations || [];
		patchProduct( idx, {
			variations: cur.includes( vid )
				? cur.filter( ( x ) => x !== vid )
				: [ ...cur, vid ],
		} );
	};
	// "Active" = default-selected on the storefront. When multiple is off only
	// one product may be active, so enabling one clears the others.
	const setActive = ( idx, value ) =>
		setProducts(
			products.map( ( p, i ) => {
				if ( i === idx ) {
					return { ...p, active: value };
				}
				if ( value && ! cfg.multiple && p.active ) {
					return { ...p, active: false };
				}
				return p;
			} )
		);
	// When switching off "Allow Multiple", keep at most one product active.
	const setMultiple = ( value ) => {
		if ( value ) {
			setKey( 'multiple', true );
			return;
		}
		let kept = false;
		const next = products.map( ( p ) => {
			if ( ! p.active ) {
				return p;
			}
			if ( ! kept ) {
				kept = true;
				return p;
			}
			return { ...p, active: false };
		} );
		patch( { config: { ...cfg, multiple: false, products: next } } );
	};

	return (
		<div className="optset-lp">
			<div className="optset-lp__table" role="table">
				<div className="optset-lp__head" role="row">
					<span>
						{ __(
							'Product',
							'option-set-builder'
						) }
					</span>
					<span>
						{ __(
							'Variation',
							'option-set-builder'
						) }
					</span>
					<span>
						{ __(
							'Active',
							'option-set-builder'
						) }
					</span>
				</div>

				{ products.length > 0 && (
					<DragList
						className="optset-lp__rows"
						items={ products.map( ( p, i ) => ( {
							...p,
							key: p.id ?? i,
							_idx: i,
						} ) ) }
						onReorder={ ( from, to ) => {
							setOpenIdx( -1 );
							setProducts( reorder( products, from, to ) );
						} }
						renderItem={ ( p, idx, handleProps ) => {
							const varCount = ( p.variations || [] ).length;
							return (
								<div className="optset-lp__row" role="row">
									<span
										className="optset-lp__grip"
										{ ...handleProps }
										aria-label={ __(
											'Reorder',
											'option-set-builder'
										) }
									>
										<GripVertical size={ 15 } />
									</span>
									<span className="optset-lp__product">
										<span className="optset-lp__avatar">
											{ p.img ? (
												<img src={ p.img } alt="" />
											) : null }
										</span>
										<span className="optset-lp__name">
											{ p.name }
										</span>
									</span>
									<span className="optset-lp__variation">
										{ p.isVariable
											? sprintf(
													/* translators: %d: number of selected variations. */
													__(
														'%d Variations',
														'option-set-builder'
													),
													varCount
											  )
											: __(
													'N/A',
													'option-set-builder'
											  ) }
									</span>
									<span className="optset-lp__actions">
										{ ! p.isVariable && (
											<span className="optset-lp__active">
												<ToggleField
													checked={
														p.active === true
													}
													onChange={ ( v ) =>
														setActive( idx, v )
													}
													label=""
												/>
											</span>
										) }
										{ p.isVariable && (
											<span className="optset-lp__var-wrap">
												<button
													type="button"
													className="optset-lp__icon-btn optset-lp__icon-btn--add"
													aria-label={ __(
														'Select variations',
														'option-set-builder'
													) }
													onClick={ () =>
														setOpenIdx(
															openIdx === idx
																? -1
																: idx
														)
													}
												>
													<Plus size={ 16 } />
												</button>
												{ openIdx === idx && (
													<VariationPopover
														product={ p }
														onToggle={ ( vid ) =>
															toggleVariation(
																idx,
																vid
															)
														}
														onClose={ () =>
															setOpenIdx( -1 )
														}
													/>
												) }
											</span>
										) }
										<button
											type="button"
											className="optset-lp__icon-btn optset-lp__icon-btn--del"
											aria-label={ __(
												'Remove product',
												'option-set-builder'
											) }
											onClick={ () =>
												removeProduct( idx )
											}
										>
											<Trash2 size={ 16 } />
										</button>
									</span>
								</div>
							);
						} }
					/>
				) }

				<div className="optset-lp__search-row">
					<ProductSearch
						selected={ products.map( ( p ) => p.id ) }
						disabled={ false }
						onAdd={ addProduct }
					/>
				</div>
			</div>

			<div className="optset-lp__switches">
				<ToggleField
					checked={ !! cfg.mergeVariations }
					onChange={ ( v ) => setKey( 'mergeVariations', v ) }
					label={ __(
						'Merge Variation Products into one product',
						'option-set-builder'
					) }
				/>
				<ToggleField
					checked={ !! cfg.enableQty }
					onChange={ ( v ) => setKey( 'enableQty', v ) }
					label={ __(
						'Enable Quantity',
						'option-set-builder'
					) }
				/>
				<ToggleField
					checked={ !! cfg.multiple }
					onChange={ ( v ) => setMultiple( v ) }
					label={ __(
						'Allow Multiple',
						'option-set-builder'
					) }
				/>
			</div>

			{ cfg.enableQty && (
				<div className="optset-settings__grid2">
					<Field
						label={ __(
							'Min quantity',
							'option-set-builder'
						) }
					>
						<TextControl
							type="number"
							value={ cfg.minQty ?? '' }
							onChange={ ( v ) => setKey( 'minQty', v ) }
						/>
					</Field>
					<Field
						label={ __(
							'Max quantity',
							'option-set-builder'
						) }
					>
						<TextControl
							type="number"
							value={ cfg.maxQty ?? '' }
							onChange={ ( v ) => setKey( 'maxQty', v ) }
						/>
					</Field>
				</div>
			) }
		</div>
	);
}
