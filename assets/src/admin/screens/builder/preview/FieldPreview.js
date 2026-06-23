/**
 * Live, storefront-accurate preview of a single field node. Drives both the
 * editable canvas (wrapped by FieldCard) and the read-only Preview mode. It
 * mirrors the real control per type — button groups, swatches, dropdowns,
 * inputs — and shows computed per-choice prices (regular + sale) plus any
 * per-choice image so editors see exactly what shoppers will. Recurses for
 * `section` containers.
 *
 * @package
 */

import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ChevronDown, Check, Upload } from 'lucide-react';
import { useConfig } from '../../../store/ConfigContext';
import useCustomFonts from '../../../hooks/useCustomFonts';
import {
	COUNTRIES,
	flagEmoji,
	findCountry,
	resolveDefault,
} from '../../../../shared/phone';

/** Demo base price used to render percentage-based choice prices. */
const DEMO_BASE = 20;

/**
 * Format one price amount for a choice, honouring percentage mode.
 *
 * @param {Object}   choice      Choice row.
 * @param {*}        raw         Raw amount (regular or sale).
 * @param {Function} formatPrice Currency formatter.
 * @return {string} Formatted amount, or '' when not a number.
 */
function fmtAmount( choice, raw, formatPrice ) {
	const amount = Number( raw );
	if (
		raw === '' ||
		raw === undefined ||
		raw === null ||
		Number.isNaN( amount )
	) {
		return '';
	}
	if ( choice.priceMode === 'percent' ) {
		return formatPrice( ( DEMO_BASE * amount ) / 100 );
	}
	return formatPrice( amount );
}

/**
 * Resolve the inline style for a swatch box from the field config — size and
 * border-radius. Radius falls back to the chosen shape preset. Mirrors
 * AbstractField::swatch_style() so the canvas matches the storefront.
 *
 * @param {Object} cfg Field config bag.
 * @return {Object} React style object.
 */
function swatchStyle( cfg ) {
	const style = {};
	if ( cfg.swatchWidth !== '' && cfg.swatchWidth !== undefined ) {
		style.width = `${ cfg.swatchWidth }px`;
	}
	if ( cfg.swatchHeight !== '' && cfg.swatchHeight !== undefined ) {
		style.height = `${ cfg.swatchHeight }px`;
	}
	if ( cfg.swatchRadius !== '' && cfg.swatchRadius !== undefined ) {
		style.borderRadius = `${ cfg.swatchRadius }px`;
	} else if ( cfg.shape === 'circle' ) {
		style.borderRadius = '50%';
	} else if ( cfg.shape === 'rounded' ) {
		style.borderRadius = '10px';
	} else if ( cfg.shape === 'square' ) {
		style.borderRadius = '4px';
	}
	return style;
}

/**
 * Per-choice price tag — strikes the regular price when a sale exists, in
 * line with the field-settings reference designs.
 *
 * @param {Object}   props             Component props.
 * @param {Object}   props.choice      Choice row.
 * @param {Function} props.formatPrice Currency formatter.
 * @return {JSX.Element|null} The price tag.
 */
function PriceTag( { choice, formatPrice } ) {
	if ( ! choice || ! choice.priceMode || choice.priceMode === 'none' ) {
		return null;
	}
	const reg = fmtAmount( choice, choice.regular, formatPrice );
	const sale = fmtAmount( choice, choice.sale, formatPrice );
	if ( ! reg && ! sale ) {
		return null;
	}
	return (
		<span className="optset-pf__price">
			{ sale ? (
				<>
					<s>{ reg }</s> <b>{ sale }</b>
				</>
			) : (
				<b>{ reg }</b>
			) }
		</span>
	);
}

/**
 * Font Picker preview — a closed "Select Font" dropdown plus the list of
 * choices, each rendered in its own font with its price. Calling
 * useCustomFonts here guarantees the uploaded @font-face rules are injected so
 * the preview shows the real faces.
 *
 * @param {Object}   props             Component props.
 * @param {Object[]} props.choices     Choice rows.
 * @param {Function} props.formatPrice Currency formatter.
 * @return {JSX.Element} The preview.
 */
function FontPickerPreview( { choices, formatPrice } ) {
	useCustomFonts();
	const [ open, setOpen ] = useState( false );
	const current = choices.find( ( c ) => c.selected );
	return (
		<div className={ `optset-pf__fontpicker${ open ? ' is-open' : '' }` }>
			<button
				type="button"
				className="optset-pf__select-box"
				onClick={ () => setOpen( ( v ) => ! v ) }
			>
				{ current ? (
					<span
						className="optset-pf__select-placeholder"
						style={
							current.fontFamily
								? { fontFamily: current.fontFamily }
								: undefined
						}
					>
						{ current.label ||
							__(
								'Untitled',
								'option-set-builder'
							) }
					</span>
				) : (
					<span className="optset-pf__select-placeholder">
						{ __(
							'Select Font',
							'option-set-builder'
						) }
					</span>
				) }
				<ChevronDown size={ 16 } />
			</button>
			{ open && (
				<div className="optset-pf__fontlist">
					{ choices.map( ( c, i ) => (
						<span key={ c.uid || i } className="optset-pf__fontopt">
							<span
								className="optset-pf__fontopt-label"
								style={
									c.fontFamily
										? { fontFamily: c.fontFamily }
										: undefined
								}
							>
								{ c.label || `Option ${ i + 1 }` }
							</span>
							<PriceTag
								choice={ c }
								formatPrice={ formatPrice }
							/>
						</span>
					) ) }
				</div>
			) }
		</div>
	);
}

/**
 * Format a variation/product price pair, striking the regular when on sale.
 *
 * @param            meta.meta
 * @param {Object}   meta             Row carrying regular/sale.
 * @param {Function} formatPrice      Currency formatter.
 * @param            meta.formatPrice
 * @return {JSX.Element|null} The price tag.
 */
function ProductPrice( { meta, formatPrice } ) {
	const reg = Number( meta.regular );
	const sale = Number( meta.sale );
	const hasReg = meta.regular !== '' && ! Number.isNaN( reg );
	const hasSale =
		meta.sale !== '' && meta.sale !== null && ! Number.isNaN( sale );
	if ( ! hasReg && ! hasSale ) {
		return null;
	}
	return (
		<span className="optset-pf__price">
			{ hasSale ? (
				<>
					{ hasReg && <s>{ formatPrice( reg ) }</s> }{ ' ' }
					<b>{ formatPrice( sale ) }</b>
				</>
			) : (
				<b>{ formatPrice( reg ) }</b>
			) }
		</span>
	);
}

/**
 * Storefront-accurate preview for the Linked Products field — a grid of
 * product cards. Variable products expand to one card per selected variation,
 * or a single card with a variation dropdown when "merge variations" is on.
 *
 * @param {Object}   props             Component props.
 * @param {Object}   props.node        Field node.
 * @param {Function} props.formatPrice Currency formatter.
 * @return {JSX.Element} The preview.
 */
function LinkedProductsPreview( { node, formatPrice } ) {
	const cfg = node.config || {};
	const products = Array.isArray( cfg.products ) ? cfg.products : [];
	const inputType = cfg.multiple ? 'checkbox' : 'radio';

	/**
	 * Build the renderable cards. Active products are pre-selected (checked);
	 * `active` no longer hides anything.
	 */
	const cards = [];
	products.forEach( ( p ) => {
		if ( ! p.isVariable ) {
			cards.push( {
				key: `p${ p.id }`,
				title: p.name,
				img: p.img,
				meta: p,
				selected: p.active === true,
			} );
			return;
		}
		const meta = ( p.variationsMeta || [] ).filter( ( v ) =>
			( p.variations || [] ).includes( v.id )
		);
		if ( cfg.mergeVariations ) {
			cards.push( {
				key: `p${ p.id }`,
				title: p.name,
				img: p.img,
				meta: meta[ 0 ] || p,
				variations: meta,
				selected: false,
			} );
		} else {
			meta.forEach( ( v ) =>
				cards.push( {
					key: `v${ v.id }`,
					title: v.label,
					img: v.img || p.img,
					meta: v,
					selected: false,
				} )
			);
		}
	} );

	// Nothing linked yet → show three static product mockups so the editor
	// can see the layout/shape before choosing real products.
	const isMockup = cards.length === 0;
	const rows = isMockup
		? [ 1, 2, 3 ].map( ( n ) => ( {
				key: `mock${ n }`,
				title: __(
					'Product',
					'option-set-builder'
				),
				img: '',
				meta: {},
				mockup: true,
		  } ) )
		: cards;

	// Size (width/height) is applied to the whole card so it stays responsive;
	// the shape/radius is applied to the product image.
	const full = swatchStyle( cfg );
	const cardStyle = {};
	if ( full.width ) {
		cardStyle.width = full.width;
	}
	if ( full.height ) {
		cardStyle.height = full.height;
	}
	const thumbStyle = full.borderRadius
		? { borderRadius: full.borderRadius }
		: undefined;

	return (
		<div className={ `optset-pf__linked${ isMockup ? ' is-mockup' : '' }` }>
			{ rows.map( ( card ) => (
				<span
					key={ card.key }
					className="optset-pf__linked-card"
					style={ cardStyle }
				>
					<input
						type={ inputType }
						checked={ !! card.selected }
						readOnly
					/>
					<span className="optset-pf__linked-check" aria-hidden="true">
						<Check size={ 13 } />
					</span>
					<span className="optset-pf__linked-thumb" style={ thumbStyle }>
						{ card.img ? (
							<img src={ card.img } alt="" />
						) : (
							<span
								className="optset-pf__linked-ph"
								aria-hidden="true"
							/>
						) }
					</span>
					<span className="optset-pf__linked-title">{ card.title }</span>
					{ card.variations && card.variations.length > 0 && (
						<select className="optset-pf__linked-varsel" disabled>
							{ card.variations.map( ( v ) => (
								<option key={ v.id }>{ v.label }</option>
							) ) }
						</select>
					) }
					{ ! card.mockup && (
						<ProductPrice
							meta={ card.meta }
							formatPrice={ formatPrice }
						/>
					) }
					{ cfg.enableQty && (
						<span className="optset-pf__linked-qty">
							<QtyBox cfg={ cfg } />
						</span>
					) }
				</span>
			) ) }
		</div>
	);
}

/**
 * Interactive faux dropdown for the canvas (a native <select> can't show
 * per-option thumbnails). Clicking the box toggles the option list; the
 * click is contained so it doesn't bubble to card selection.
 *
 * @param {Object}   props             Component props.
 * @param {Object}   props.node        Field node.
 * @param {Array}    props.choices     Choice rows.
 * @param {Function} props.formatPrice Currency formatter.
 * @return {JSX.Element} The dropdown preview.
 */
function SelectPreview( { node, choices, formatPrice } ) {
	const [ open, setOpen ] = useState( false );
	const current = choices.find( ( c ) => c.selected ) || choices[ 0 ];

	const Option = ( { c, i } ) => (
		<span className="optset-pf__select-opt">
			{ c.image && (
				<span className="optset-pf__choice-img">
					<img src={ c.image } alt="" />
				</span>
			) }
			<span>{ c.label || `Option ${ i + 1 }` }</span>
			<PriceTag choice={ c } formatPrice={ formatPrice } />
		</span>
	);

	return (
		<div className={ `optset-pf__select${ open ? ' is-open' : '' }` }>
			{ /* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */ }
			<div
				className="optset-pf__select-box"
				role="button"
				tabIndex={ 0 }
				onClick={ ( e ) => {
					e.stopPropagation();
					setOpen( ( o ) => ! o );
				} }
				onKeyDown={ ( e ) => {
					if ( e.key === 'Enter' || e.key === ' ' ) {
						e.preventDefault();
						setOpen( ( o ) => ! o );
					}
				} }
			>
				{ current ? (
					<Option c={ current } i={ 0 } />
				) : (
					<span className="optset-pf__select-placeholder">
						{ node.placeholder ||
							__(
								'Choose…',
								'option-set-builder'
							) }
					</span>
				) }
				<ChevronDown size={ 16 } aria-hidden="true" />
			</div>
			{ open && choices.length > 0 && (
				<div className="optset-pf__select-list">
					{ choices.map( ( c, i ) => (
						<div key={ c.uid || i } className="optset-pf__select-row">
							<Option c={ c } i={ i } />
						</div>
					) ) }
				</div>
			) }
		</div>
	);
}

/**
 * Per-choice quantity stepper, shown when the field has quantity enabled.
 * Mirrors the storefront input including the configured min/max bounds.
 *
 * @param {Object} props     Component props.
 * @param {Object} props.cfg Field config bag.
 * @return {JSX.Element} The quantity input.
 */
function QtyBox( { cfg } ) {
	const min = cfg.minQty === '' || cfg.minQty === undefined ? 0 : cfg.minQty;
	return (
		<input
			type="number"
			className="optset-pf__qty"
			min={ min }
			max={
				cfg.maxQty === '' || cfg.maxQty === undefined
					? undefined
					: cfg.maxQty
			}
			defaultValue={ cfg.minQty || 1 }
			readOnly
		/>
	);
}

/**
 * The description line, honouring placement.
 *
 * @param {Object} props      Component props.
 * @param {Object} props.node Field node.
 * @param {string} props.at   Placement slot to render in.
 * @return {JSX.Element|null} The help text.
 */
function Help( { node, at } ) {
	if ( ! node.description || node.descriptionPlacement !== at ) {
		return null;
	}
	return <p className="optset-pf__help">{ node.description }</p>;
}

/**
 * Read-only Section preview. Renders a plain labelled group, or — when the
 * style is "accordion" — a collapsible header whose open/close state mirrors
 * the configured initial state and the storefront behaviour. Recurses into
 * children via FieldPreview.
 *
 * @param {Object} props      Component props.
 * @param {Object} props.node Section node.
 * @return {JSX.Element} The section preview.
 */
function SectionPreview( { node } ) {
	const cfg = node.config || {};
	const isAccordion = cfg.style === 'accordion';
	const [ open, setOpen ] = useState( cfg.initialState !== 'close' );

	// Reflect setting changes (e.g. switching the initial state) live.
	useEffect( () => {
		setOpen( cfg.initialState !== 'close' );
	}, [ cfg.initialState, isAccordion ] );

	const children = node.children || [];
	const title =
		node.label ||
		__( 'Section', 'option-set-builder' );
	const showBody = ! isAccordion || open;

	return (
		<div
			className={ `optset-pf__section${
				isAccordion ? ' is-accordion' : ''
			}${ isAccordion && ! open ? ' is-collapsed' : '' }` }
		>
			{ isAccordion ? (
				<button
					type="button"
					className="optset-pf__section-header"
					aria-expanded={ open }
					onClick={ () => setOpen( ( o ) => ! o ) }
				>
					<span className="optset-pf__section-title">{ title }</span>
					<span
						className="optset-pf__section-chevron"
						aria-hidden="true"
					/>
				</button>
			) : (
				node.label && (
					<div className="optset-pf__section-header optset-pf__section-header--static">
						<span className="optset-pf__section-title">{ title }</span>
					</div>
				)
			) }
			{ showBody && (
				<div className="optset-pf__section-body">
					{ children.length === 0 ? (
						<p className="optset-pf__placeholder">
							{ __(
								'Empty section',
								'option-set-builder'
							) }
						</p>
					) : (
						children.map( ( c ) => (
							<FieldPreview key={ c.id } node={ c } />
						) )
					) }
				</div>
			) }
		</div>
	);
}

/**
 * Storefront-accurate preview of the Phone field's country selector. Mirrors
 * the runtime widget (store/phone.js): a flag (+ dial code) button that opens a
 * searchable country list, plus the number input. Honours the flag-style and
 * default-country settings live.
 *
 * @param {Object} props      Component props.
 * @param {Object} props.node Phone field node.
 * @return {JSX.Element} The preview control.
 */
function PhonePreview( { node } ) {
	const cfg = node.config || {};
	const flagStyle = cfg.flagStyle || 'flag_dial';
	const [ open, setOpen ] = useState( false );
	const [ query, setQuery ] = useState( '' );
	const [ iso, setIso ] = useState(
		() => resolveDefault( cfg.defaultCountry ).iso2
	);

	// Reflect a default-country change made in the settings panel.
	useEffect( () => {
		setIso( resolveDefault( cfg.defaultCountry ).iso2 );
	}, [ cfg.defaultCountry ] );

	if ( flagStyle === 'number' ) {
		return (
			<input
				className="optset-pf__input"
				type="tel"
				placeholder={ node.placeholder }
				readOnly
			/>
		);
	}

	const country = findCountry( iso ) || resolveDefault( '' );
	const q = query.trim().toLowerCase();
	const list = COUNTRIES.filter(
		( c ) =>
			! q ||
			c.name.toLowerCase().includes( q ) ||
			c.iso2.includes( q ) ||
			c.dial.includes( q.replace( /\D/g, '' ) )
	);

	return (
		<div className={ `optset-pf__phone${ open ? ' is-open' : '' }` }>
			<div className="optset-pf__phone-control">
				<button
					type="button"
					className="optset-pf__phone-country"
					onClick={ () => setOpen( ( o ) => ! o ) }
				>
					<span className="optset-pf__phone-flag">
						{ flagEmoji( country.iso2 ) }
					</span>
					<ChevronDown size={ 14 } aria-hidden="true" />
					{ flagStyle === 'flag_dial' && (
						<span className="optset-pf__phone-dial">
							+{ country.dial }
						</span>
					) }
				</button>
				<input
					className="optset-pf__input optset-pf__phone-input"
					type="tel"
					placeholder={ node.placeholder }
					readOnly
				/>
			</div>
			{ open && (
				<div className="optset-pf__phone-drop">
					<input
						className="optset-pf__phone-search"
						placeholder={ __(
							'Search',
							'option-set-builder'
						) }
						value={ query }
						onChange={ ( e ) => setQuery( e.target.value ) }
					/>
					<div className="optset-pf__phone-list">
						{ list.map( ( c ) => (
							<button
								key={ c.iso2 }
								type="button"
								className={ `optset-pf__phone-opt${
									c.iso2 === iso ? ' is-active' : ''
								}` }
								onClick={ () => {
									setIso( c.iso2 );
									setOpen( false );
									setQuery( '' );
								} }
							>
								<span className="optset-pf__phone-flag">
									{ flagEmoji( c.iso2 ) }
								</span>
								<span className="optset-pf__phone-name">
									{ c.name }
								</span>
								<span className="optset-pf__phone-dial">
									+{ c.dial }
								</span>
							</button>
						) ) }
					</div>
				</div>
			) }
		</div>
	);
}

/**
 * FieldPreview.
 *
 * @param {Object} props      Component props.
 * @param {Object} props.node Field node to render.
 * @return {JSX.Element} The preview markup.
 */
export default function FieldPreview( { node } ) {
	const { formatPrice } = useConfig();
	const choices = node.choices || [];
	const cfg = node.config || {};

	// Layout types render without the label/help scaffold.
	if ( node.type === 'heading' ) {
		const Tag = cfg.level || 'h3';
		return (
			<Tag className="optset-pf__heading">
				{ node.label ||
					__( 'Heading', 'option-set-builder' ) }
			</Tag>
		);
	}
	if ( node.type === 'divider' ) {
		const h = Number( cfg.height );
		return (
			<hr
				className="optset-pf__divider"
				style={ h > 0 ? { borderTopWidth: `${ h }px` } : undefined }
			/>
		);
	}
	if ( node.type === 'spacer' ) {
		return (
			<div
				className="optset-pf__spacer"
				style={ { height: `${ cfg.height || 24 }px` } }
			/>
		);
	}
	if ( node.type === 'html' ) {
		return (
			<div className="optset-pf__html">
				{ cfg.html || (
					<span className="optset-pf__placeholder">
						{ __(
							'Custom HTML',
							'option-set-builder'
						) }
					</span>
				) }
			</div>
		);
	}
	if ( node.type === 'shortcode' ) {
		return (
			<code className="optset-pf__shortcode">
				{ cfg.shortcode || '[shortcode]' }
			</code>
		);
	}
	if ( node.type === 'section' ) {
		return <SectionPreview node={ node } />;
	}

	let control = null;
	switch ( node.type ) {
		case 'fontpicker':
			control = (
				<FontPickerPreview
					choices={ choices }
					formatPrice={ formatPrice }
				/>
			);
			break;
		case 'buttongroup':
			control = (
				<div className="optset-pf__buttons">
					{ choices.map( ( c, i ) => (
						<span
							key={ c.uid || i }
							className={ `optset-pf__button${
								c.selected ? ' is-active' : ''
							}` }
							style={
								c.fontFamily
									? { fontFamily: c.fontFamily }
									: undefined
							}
						>
							{ c.label || `Option ${ i + 1 }` }
							<PriceTag
								choice={ c }
								formatPrice={ formatPrice }
							/>
						</span>
					) ) }
				</div>
			);
			break;
		case 'checkbox':
		case 'radio':
			control = (
				<div className="optset-pf__choices">
					{ choices.map( ( c, i ) => (
						<span key={ c.uid || i } className="optset-pf__choice">
							<input
								type={
									node.type === 'checkbox'
										? 'checkbox'
										: 'radio'
								}
								defaultChecked={ !! c.selected }
								readOnly
							/>
							{ c.image && (
								<span className="optset-pf__choice-img">
									<img src={ c.image } alt="" />
								</span>
							) }
							<span>{ c.label || `Option ${ i + 1 }` }</span>
							<PriceTag
								choice={ c }
								formatPrice={ formatPrice }
							/>
							{ cfg.enableQty && <QtyBox cfg={ cfg } /> }
						</span>
					) ) }
				</div>
			);
			break;
		case 'select':
			control = (
				<SelectPreview
					node={ node }
					choices={ choices }
					formatPrice={ formatPrice }
				/>
			);
			break;
		case 'toggle': {
			const tc = choices[ 0 ] || {};
			control = (
				<span className="optset-pf__toggle-row">
					<span
						className={ `optset-pf__toggle${
							tc.selected ? ' is-on' : ''
						}` }
						aria-hidden="true"
					>
						<span className="optset-pf__toggle-knob" />
					</span>
					{ tc.image && (
						<span className="optset-pf__toggle-img">
							<img src={ tc.image } alt="" />
						</span>
					) }
					{ tc.label && (
						<span className="optset-pf__toggle-label">
							{ tc.label }
						</span>
					) }
					<PriceTag choice={ tc } formatPrice={ formatPrice } />
					{ cfg.enableQty && <QtyBox cfg={ cfg } /> }
				</span>
			);
			break;
		}
		case 'colorswatch':
			control = (
				<div className="optset-pf__swatches">
					{ choices.map( ( c, i ) => (
						<span
							key={ c.uid || i }
							className="optset-pf__swatch-tile"
						>
							<span
								className={ `optset-pf__swatch${
									c.selected ? ' is-active' : ''
								}` }
								style={ {
									background: c.color || '#e2e8f0',
									...swatchStyle( cfg ),
								} }
								title={ c.label }
							>
								{ c.selected && (
									<span className="optset-pf__swatch-check">
										<Check size={ 12 } />
									</span>
								) }
							</span>
							<span className="optset-pf__swatch-label">
								{ c.label || `Color ${ i + 1 }` }
							</span>
							<PriceTag
								choice={ c }
								formatPrice={ formatPrice }
							/>
							{ cfg.enableQty && <QtyBox cfg={ cfg } /> }
						</span>
					) ) }
				</div>
			);
			break;
		case 'imageswatch':
			control = (
				<div className="optset-pf__swatches">
					{ choices.map( ( c, i ) => (
						<span
							key={ c.uid || i }
							className="optset-pf__swatch-tile"
						>
							<span
								className={ `optset-pf__img-swatch${
									c.selected ? ' is-active' : ''
								}` }
								style={ swatchStyle( cfg ) }
								title={ c.label }
							>
								{ c.image ? (
									<img src={ c.image } alt={ c.label } />
								) : null }
								{ c.selected && (
									<span className="optset-pf__swatch-check">
										<Check size={ 12 } />
									</span>
								) }
							</span>
							<span className="optset-pf__swatch-label">
								{ c.label || `Image ${ i + 1 }` }
							</span>
							<PriceTag
								choice={ c }
								formatPrice={ formatPrice }
							/>
							{ cfg.enableQty && <QtyBox cfg={ cfg } /> }
						</span>
					) ) }
				</div>
			);
			break;
		case 'range':
			control = (
				<input
					type="range"
					className="optset-pf__range"
					min={ cfg.min ?? 0 }
					max={ cfg.max ?? 100 }
					step={ cfg.step ?? 1 }
					readOnly
				/>
			);
			break;
		case 'textarea':
			control = (
				<textarea
					className="optset-pf__input"
					rows={ cfg.rows || 3 }
					placeholder={ node.placeholder }
					readOnly
				/>
			);
			break;
		case 'colorpicker':
			control = (
				<span className="optset-pf__colorpicker">
					<span
						className="optset-pf__colorpicker-dot"
						style={
							cfg.defaultColor
								? { background: cfg.defaultColor }
								: undefined
						}
					/>
					{ cfg.defaultColor ||
						__(
							'Pick a colour',
							'option-set-builder'
						) }
				</span>
			);
			break;
		case 'fileupload':
			control = (
				<div className="optset-pf__dropzone">
					<span className="optset-pf__dropzone-btn">
						<Upload size={ 14 } aria-hidden="true" />
						{ cfg.uploadText ||
							__(
								'Upload',
								'option-set-builder'
							) }
					</span>
					<span className="optset-pf__dropzone-text">
						{ cfg.dragText ||
							__(
								'Click or drag and drop',
								'option-set-builder'
							) }
					</span>
				</div>
			);
			break;
		case 'linkedproducts':
			control = (
				<LinkedProductsPreview
					node={ node }
					formatPrice={ formatPrice }
				/>
			);
			break;
		case 'popup':
			control = (
				<span className="optset-pf__button is-active">
					{ cfg.triggerText ||
						__(
							'Open',
							'option-set-builder'
						) }
				</span>
			);
			break;
		case 'formula':
		case 'advancedformula':
			control = (
				<code className="optset-pf__shortcode">
					{ cfg.formula ||
						__(
							'Formula result',
							'option-set-builder'
						) }
				</code>
			);
			break;
		case 'datetime':
			control = (
				<div className="optset-pf__datetime">
					<span className="optset-pf__dt-part">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
						>
							<rect
								x="3"
								y="4.5"
								width="18"
								height="16"
								rx="2.5"
								stroke="currentColor"
								strokeWidth="1.6"
							/>
							<path
								d="M3 9h18M8 2.5v4M16 2.5v4"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinecap="round"
							/>
						</svg>
						<input
							className="optset-pf__input"
							placeholder={ cfg.format || 'DD/MM/YYYY' }
							readOnly
						/>
					</span>
					<span className="optset-pf__dt-part">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
						>
							<circle
								cx="12"
								cy="12"
								r="9"
								stroke="currentColor"
								strokeWidth="1.6"
							/>
							<path
								d="M12 7.5V12l3 2"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						<input
							className="optset-pf__input"
							placeholder={
								cfg.hour12 === false ? 'HH:mm' : 'hh:mm AM/PM'
							}
							readOnly
						/>
					</span>
				</div>
			);
			break;
		case 'tel':
			control = <PhonePreview node={ node } />;
			break;
		default:
			control = (
				<input
					className="optset-pf__input"
					type={
						[ 'email', 'url', 'number', 'date', 'time' ].includes(
							node.type
						)
							? node.type
							: 'text'
					}
					placeholder={ node.placeholder }
					readOnly
				/>
			);
	}

	return (
		<div className={ `optset-pf optset-pf--${ node.type }` }>
			{ ! node.hideLabel && (
				<span className="optset-pf__label">
					{ node.label ||
						__(
							'Untitled field',
							'option-set-builder'
						) }
					{ node.required && <span className="optset-pf__req">*</span> }
					{ [
						'date',
						'time',
						'datetime',
						'text',
						'textarea',
						'url',
						'tel',
						'email',
						'number',
						'fileupload',
						'range',
						'colorpicker',
					].includes( node.type ) && (
						<PriceTag
							choice={ choices[ 0 ] }
							formatPrice={ formatPrice }
						/>
					) }
				</span>
			) }
			<Help node={ node } at="below_label" />
			{ control }
			<Help node={ node } at="below_field" />
		</div>
	);
}
