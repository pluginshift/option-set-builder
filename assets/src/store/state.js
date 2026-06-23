/**
 * Per-form reactive pricing state.
 *
 * Each product `form.cart` gets its own State instance. The most recently
 * touched instance is mirrored onto `window.optsetPricingState` so theme code
 * and integrations can introspect it (read ARCHITECTURE §1 public surface).
 *
 * Shape (window.optsetPricingState):
 * {
 *   basePrice:        number,                 // product/variation base (base ccy)
 *   basePricePct:     number,                 // base used for percent math
 *   optionPrices:     { [fieldId]: number },  // per-field price contribution
 *   selections:       { [fieldId]: {          // §9 selection entry
 *                         type, setId, label, value,
 *                         choiceIndexes:[int], dynamics:{} } },
 *   linkedProducts:   [ { id, count, variation } ],
 *   conditions:       { [fieldId]: boolean },  // true = visible
 *   requiredErrors:   [ fieldId ],
 *   minmaxErrors:     [ fieldId ],
 *   optionsPrice:     number,                  // sum of optionPrices
 *   total:            number                   // basePrice + optionsPrice
 * }
 *
 * @package
 */

/**
 * Build a fresh empty state object.
 *
 * @return {Object} Default state.
 */
function emptyState() {
	return {
		basePrice: 0,
		basePricePct: 0,
		optionPrices: {},
		selections: {},
		linkedProducts: [],
		linkedPrice: 0,
		conditions: {},
		requiredErrors: [],
		minmaxErrors: [],
		optionsPrice: 0,
		total: 0,
	};
}

/**
 * Reactive per-form state container with a tiny subscribe() emitter.
 */
export default class State {
	/**
	 * Create a state instance.
	 */
	constructor() {
		this.data = emptyState();
		this._subs = [];
		this._publish();
	}

	/**
	 * Mirror this instance onto the global public surface.
	 *
	 * @return {void}
	 */
	_publish() {
		try {
			window.optsetPricingState = this.data;
		} catch ( e ) {
			/* read-only window — ignore. */
		}
	}

	/**
	 * Subscribe to state changes.
	 *
	 * @param {Function} fn Listener invoked with the state object.
	 * @return {Function} Unsubscribe function.
	 */
	subscribe( fn ) {
		if ( typeof fn === 'function' ) {
			this._subs.push( fn );
		}
		return () => {
			this._subs = this._subs.filter( ( s ) => s !== fn );
		};
	}

	/**
	 * Notify all subscribers (defensive — a bad listener never breaks others).
	 *
	 * @return {void}
	 */
	emit() {
		this._publish();
		this._subs.forEach( ( fn ) => {
			try {
				fn( this.data );
			} catch ( e ) {
				/* swallow: never break add-to-cart. */
			}
		} );
	}

	/* --------------------------------------------------------------- */
	/* Mutators                                                          */
	/* --------------------------------------------------------------- */

	/**
	 * Set the product/variation base price.
	 *
	 * @param {number} base Base price (base currency).
	 * @param {number} pct  Percent-math base.
	 * @return {void}
	 */
	setBase( base, pct ) {
		this.data.basePrice = Number( base ) || 0;
		this.data.basePricePct =
			pct === undefined || pct === null
				? this.data.basePrice
				: Number( pct ) || 0;
	}

	/**
	 * Replace the selection entry for a field.
	 *
	 * @param {string}      fieldId Field id.
	 * @param {object|null} entry   Selection entry, or null to clear.
	 * @return {void}
	 */
	setSelection( fieldId, entry ) {
		if ( entry === null || entry === undefined ) {
			delete this.data.selections[ fieldId ];
			return;
		}
		this.data.selections[ fieldId ] = entry;
	}

	/**
	 * Record a field's computed price contribution.
	 *
	 * @param {string} fieldId Field id.
	 * @param {number} amount  Price.
	 * @return {void}
	 */
	setOptionPrice( fieldId, amount ) {
		this.data.optionPrices[ fieldId ] = Number( amount ) || 0;
	}

	/**
	 * Drop a field's price contribution (used when hidden by logic).
	 *
	 * @param {string} fieldId Field id.
	 * @return {void}
	 */
	clearOptionPrice( fieldId ) {
		delete this.data.optionPrices[ fieldId ];
	}

	/**
	 * Replace the linked-products list.
	 *
	 * @param {Array<object>} list [{ id, count, variation }].
	 * @return {void}
	 */
	setLinkedProducts( list ) {
		this.data.linkedProducts = Array.isArray( list ) ? list : [];
		// Linked products are added as their own cart lines; their cost is
		// surfaced in the on-page total (base + options + linked) so the
		// preview matches what the shopper will actually pay.
		this.data.linkedPrice = this.data.linkedProducts.reduce(
			( sum, item ) =>
				sum +
				( Number( item.price ) || 0 ) *
					Math.max( 1, Number( item.count ) || 1 ),
			0
		);
	}

	/**
	 * Record a field visibility decision (true = visible).
	 *
	 * @param {string}  fieldId Field id.
	 * @param {boolean} visible Visible flag.
	 * @return {void}
	 */
	setCondition( fieldId, visible ) {
		this.data.conditions[ fieldId ] = !! visible;
	}

	/**
	 * Replace the validation error lists.
	 *
	 * @param {string[]} required Required-error field ids.
	 * @param {string[]} minmax   Min/max-error field ids.
	 * @return {void}
	 */
	setErrors( required, minmax ) {
		this.data.requiredErrors = Array.isArray( required ) ? required : [];
		this.data.minmaxErrors = Array.isArray( minmax ) ? minmax : [];
	}

	/**
	 * Recompute the derived totals from current option prices.
	 *
	 * @return {void}
	 */
	recomputeTotals() {
		let sum = 0;
		Object.keys( this.data.optionPrices ).forEach( ( id ) => {
			sum += Number( this.data.optionPrices[ id ] ) || 0;
		} );
		this.data.optionsPrice = sum;
		this.data.total =
			( Number( this.data.basePrice ) || 0 ) +
			sum +
			( Number( this.data.linkedPrice ) || 0 );
	}
}
