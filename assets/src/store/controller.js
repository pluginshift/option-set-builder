/**
 * Per-form orchestrator.
 *
 * One Controller owns a single `.optset-options` wrapper (its product
 * `form.cart`). It: discovers fields, wires change/widget/upload events,
 * recomputes conditions + pricing on every change, writes the hidden inputs
 * the server reads, syncs variation prices, fires analytics, and validates
 * on submit (blocking native + theme ajax add-to-cart when invalid).
 *
 * Defensive throughout: a thrown error must never break add-to-cart.
 *
 * @package
 */

import State from './state';
import { collectField, collectLinkedProducts } from './collect';
import {
	priceField,
	priceFormula,
	collectFormulaVars,
	renderPriceSpans,
} from './pricing';
import { readLogic, isVisible, applyVisibility } from './conditions';
import { initUpload } from './upload';
import { initWidgets } from './widgets';
import { initAnalytics } from './analytics';
import { initVariations, readBase } from './variations';
import { validateAll } from './validate';

/**
 * Find the owning WooCommerce form for an options wrapper.
 *
 * @param {HTMLElement} root `.optset-options` element.
 * @return {HTMLElement|null} The `form.cart`, or null.
 */
function ownerForm( root ) {
	return (
		root.closest( 'form.cart' ) ||
		root.closest( 'form' ) ||
		document.querySelector( 'form.cart' )
	);
}

/**
 * Orchestrates one product form's option set(s).
 */
export default class Controller {
	/**
	 * @param {HTMLElement} root `.optset-options` wrapper.
	 */
	constructor( root ) {
		this.root = root;
		this.form = ownerForm( root );
		this.state = new State();
		this.fields = {};
		this.logic = {};
		this.cleanups = [];
		this._raf = 0;
	}

	/**
	 * Boot the controller (idempotent per element).
	 *
	 * @return {void}
	 */
	init() {
		if ( this.root.__optsetBound ) {
			return;
		}
		this.root.__optsetBound = true;

		try {
			this.discoverFields();
			this.bindEvents();

			const base = readBase( this.root );
			this.state.setBase( base.base, base.pct );

			this.cleanups.push(
				initVariations( this.root, this.form, ( b ) => {
					this.state.setBase( b.base, b.pct );
					this.recompute();
				} )
			);
			this.cleanups.push( initAnalytics( this.root ) );

			this.recompute();
			this.root.classList.remove( 'optset-loading' );
		} catch ( e ) {
			// Never leave the form unusable.
			this.root.classList.remove( 'optset-loading' );
		}
	}

	/**
	 * Index every `.optset-field` wrapper and prepare its logic + widgets.
	 *
	 * @return {void}
	 */
	discoverFields() {
		const els = this.root.querySelectorAll( '.optset-field[data-field-id]' );
		els.forEach( ( el ) => {
			const id = el.getAttribute( 'data-field-id' );
			if ( ! id ) {
				return;
			}
			this.fields[ id ] = el;
			const logic = readLogic( el );
			if ( logic ) {
				this.logic[ id ] = logic;
			}
			initWidgets( el, () => this.scheduleRecompute() );
			if ( el.getAttribute( 'data-type' ) === 'fileupload' ) {
				this.cleanups.push(
					initUpload( el, () => this.scheduleRecompute() )
				);
			}
		} );
	}

	/**
	 * Bind delegated change/input + submit handlers.
	 *
	 * @return {void}
	 */
	bindEvents() {
		const onChange = () => this.scheduleRecompute();
		this.root.addEventListener( 'change', onChange );
		this.root.addEventListener( 'input', onChange );
		this.cleanups.push( () => {
			this.root.removeEventListener( 'change', onChange );
			this.root.removeEventListener( 'input', onChange );
		} );

		if ( this.form ) {
			const onSubmit = ( e ) => {
				if ( ! this.validate() ) {
					e.preventDefault();
					e.stopImmediatePropagation();
				}
			};
			this.form.addEventListener( 'submit', onSubmit, true );
			this.cleanups.push( () =>
				this.form.removeEventListener( 'submit', onSubmit, true )
			);

			// Theme / WC ajax add-to-cart buttons.
			const btnSelector =
				'.single_add_to_cart_button, [name="add-to-cart"], .ajax_add_to_cart';
			const onClick = ( e ) => {
				const btn = e.target.closest( btnSelector );
				if ( ! btn ) {
					return;
				}
				if ( ! this.validate() ) {
					e.preventDefault();
					e.stopImmediatePropagation();
				}
			};
			this.form.addEventListener( 'click', onClick, true );
			this.cleanups.push( () =>
				this.form.removeEventListener( 'click', onClick, true )
			);
		}
	}

	/**
	 * Coalesce rapid changes into a single recompute on the next frame.
	 *
	 * @return {void}
	 */
	scheduleRecompute() {
		if ( this._raf ) {
			return;
		}
		const run = () => {
			this._raf = 0;
			this.recompute();
		};
		this._raf =
			typeof window.requestAnimationFrame === 'function'
				? window.requestAnimationFrame( run )
				: window.setTimeout( run, 16 );
	}

	/**
	 * Re-read the DOM, evaluate conditions, price, and write hidden inputs.
	 *
	 * @return {void}
	 */
	recompute() {
		try {
			// 1. Collect raw selections from every value field.
			const selections = {};
			Object.keys( this.fields ).forEach( ( id ) => {
				const entry = collectField( this.fields[ id ] );
				if ( entry ) {
					selections[ id ] = entry;
					this.state.setSelection( id, entry );
				} else {
					this.state.setSelection( id, null );
				}
			} );

			// 2. Evaluate conditional visibility (iterate twice so chained
			//    rules settle against the latest selections).
			const visibility = {};
			for ( let pass = 0; pass < 2; pass++ ) {
				Object.keys( this.fields ).forEach( ( id ) => {
					const logic = this.logic[ id ];
					const vis = isVisible( logic, selections );
					visibility[ id ] = vis;
				} );
			}
			Object.keys( this.fields ).forEach( ( id ) => {
				applyVisibility( this.fields[ id ], visibility[ id ] );
				this.state.setCondition( id, visibility[ id ] );
			} );

			// 3. Price each visible field.
			const formulaVars = collectFormulaVars( selections, this.fields );
			const dynamics = this.shippingDynamics();
			let optionsTotal = 0;

			Object.keys( this.fields ).forEach( ( id ) => {
				const el = this.fields[ id ];
				const type = el.getAttribute( 'data-type' ) || '';

				if ( visibility[ id ] === false ) {
					this.state.clearOptionPrice( id );
					return;
				}

				let price = 0;
				if ( type === 'formula' || type === 'advancedformula' ) {
					price = priceFormula(
						el,
						type,
						this.state.data.basePricePct,
						formulaVars,
						dynamics
					);
				} else if ( selections[ id ] ) {
					price = priceField(
						el,
						selections[ id ],
						this.state.data.basePricePct
					);
				}
				this.state.setOptionPrice( id, price );
				optionsTotal += price;
			} );

			// 4. Linked products. They become their own cart lines, but their
			//    cost is reflected in the on-page total so the preview matches
			//    what the shopper actually pays.
			const linked = [];
			Object.keys( this.fields ).forEach( ( id ) => {
				if (
					this.fields[ id ].getAttribute( 'data-type' ) ===
						'linkedproducts' &&
					visibility[ id ] !== false
				) {
					collectLinkedProducts( this.fields[ id ] ).forEach( ( p ) =>
						linked.push( p )
					);
				}
			} );
			this.state.setLinkedProducts( linked );

			// 5. Derived totals + price spans (display = converted).
			this.state.recomputeTotals();
			renderPriceSpans(
				this.root,
				optionsTotal,
				this.state.data.basePrice,
				this.state.data.linkedPrice
			);

			// 6. Serialise raw (base, non-converted) values for the server.
			this.writeHiddenInputs( selections, linked, visibility );

			this.state.emit();
		} catch ( e ) {
			/* recompute must never throw. */
		}
	}

	/**
	 * Build the advancedformula shipping/dynamics variable bag from the
	 * `optset_shipping_dynamics` hidden input + current product price.
	 *
	 * @return {Object} Dynamic variable map.
	 */
	shippingDynamics() {
		const out = {
			product_price: this.state.data.basePricePct,
			product_quantity: 1,
		};
		try {
			const el = this.form
				? this.form.querySelector( '[name="optset_shipping_dynamics"]' )
				: null;
			if ( el && el.value ) {
				const s = JSON.parse( el.value );
				if ( s && typeof s === 'object' ) {
					out.product_weight = parseFloat( s.weight ) || 0;
					out.product_length = parseFloat( s.length ) || 0;
					out.product_width = parseFloat( s.width ) || 0;
					out.product_height = parseFloat( s.height ) || 0;
				}
			}
			const qty = this.form
				? this.form.querySelector( 'input.qty, [name="quantity"]' )
				: null;
			if ( qty ) {
				out.product_quantity = Math.max(
					1,
					parseInt( qty.value, 10 ) || 1
				);
			}
		} catch ( e ) {
			/* ignore — fall back to base map. */
		}
		return out;
	}

	/**
	 * Write the §8 hidden inputs (raw selection, linked products).
	 *
	 * @param {Object} selections fieldId → entry.
	 * @param {Array}  linked     Linked-product list.
	 * @param {Object} visibility fieldId → boolean.
	 * @return {void}
	 */
	writeHiddenInputs( selections, linked, visibility ) {
		if ( ! this.form ) {
			return;
		}
		// Only visible fields are submitted (hidden-by-logic excluded).
		const payload = {};
		Object.keys( selections ).forEach( ( id ) => {
			if ( visibility[ id ] === false ) {
				return;
			}
			payload[ id ] = selections[ id ];
		} );

		const set = ( name, value ) => {
			const el = this.form.querySelector( '[name="' + name + '"]' );
			if ( el ) {
				el.value = value;
			}
		};
		set( 'optset_field_data', JSON.stringify( payload ) );
		set( 'optset_linked_products', JSON.stringify( linked ) );
	}

	/**
	 * Run validation across visible fields.
	 *
	 * @return {boolean} True when the form may submit.
	 */
	validate() {
		try {
			const selections = this.state.data.selections;
			const visibility = this.state.data.conditions;
			const res = validateAll(
				this.root,
				selections,
				this.fields,
				visibility
			);
			this.state.setErrors( res.required, res.minmax );
			this.state.emit();
			return res.ok;
		} catch ( e ) {
			// On internal failure, do not block the customer.
			return true;
		}
	}

	/**
	 * Detach all listeners + observers.
	 *
	 * @return {void}
	 */
	destroy() {
		this.cleanups.forEach( ( fn ) => {
			try {
				fn();
			} catch ( e ) {
				/* ignore */
			}
		} );
		this.cleanups = [];
		this.root.__optsetBound = false;
	}
}
