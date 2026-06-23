/**
 * General-tab config for the Date field. Groups the picker's behaviour into
 * clear sections — pricing, display format, the selectable date window, and the
 * "block these dates" rules (today, specific dates, weekdays, month-days).
 *
 * The control surface is deliberately our own (segmented range modes + toggle
 * chips) rather than a clone of any third-party picker UI. Every value is
 * written to the exact `config` keys DateField.php + the store `wireDate`
 * widget consume; pricing lives on choices[0] like the other value fields.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { X } from 'lucide-react';
import {
	Field,
	SelectControl,
	ToggleField,
	DatePicker,
} from '../../../components';
import ValuePricing from './ValuePricing';

/** Selectable display formats (value = PHP/flatpickr token, label = sample). */
const DATE_FORMATS = [
	{
		value: 'd/m/Y',
		label: __(
			'DD/MM/YYYY (31/07/2026)',
			'option-set-builder'
		),
	},
	{
		value: 'm/d/Y',
		label: __(
			'MM/DD/YYYY (07/31/2026)',
			'option-set-builder'
		),
	},
	{
		value: 'Y-m-d',
		label: __(
			'YYYY-MM-DD (2026-07-31)',
			'option-set-builder'
		),
	},
	{
		value: 'd-m-Y',
		label: __(
			'DD-MM-YYYY (31-07-2026)',
			'option-set-builder'
		),
	},
	{
		value: 'F j, Y',
		label: __(
			'Month D, YYYY (July 31, 2026)',
			'option-set-builder'
		),
	},
	{
		value: 'j F Y',
		label: __(
			'D Month YYYY (31 July 2026)',
			'option-set-builder'
		),
	},
];

/** Range-bound modes shared by the min + max selectors. */
const RANGE_MODES = [
	{
		value: 'none',
		label: __( 'None', 'option-set-builder' ),
	},
	{
		value: 'today',
		label: __( 'Today', 'option-set-builder' ),
	},
	{
		value: 'custom',
		label: __( 'Custom', 'option-set-builder' ),
	},
];

/** Weekday chips (index = PHP/flatpickr day-of-week, 0 = Sunday). */
const WEEKDAYS = [
	{ value: 0, label: __( 'Sun', 'option-set-builder' ) },
	{ value: 1, label: __( 'Mon', 'option-set-builder' ) },
	{ value: 2, label: __( 'Tue', 'option-set-builder' ) },
	{ value: 3, label: __( 'Wed', 'option-set-builder' ) },
	{ value: 4, label: __( 'Thu', 'option-set-builder' ) },
	{ value: 5, label: __( 'Fri', 'option-set-builder' ) },
	{ value: 6, label: __( 'Sat', 'option-set-builder' ) },
];

/** Days-of-month, 1–31. */
const MONTH_DAYS = Array.from( { length: 31 }, ( _, i ) => i + 1 );

/**
 * Small segmented (radio-like) button group.
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.value    Selected value.
 * @param {Array}    props.options  [{ value, label }].
 * @param {Function} props.onChange (value) => void.
 * @return {JSX.Element} The control.
 */
function Segmented( { value, options, onChange } ) {
	return (
		<div className="optset-seg" role="radiogroup">
			{ options.map( ( opt ) => (
				<button
					key={ opt.value }
					type="button"
					role="radio"
					aria-checked={ value === opt.value }
					className={ `optset-seg__btn${
						value === opt.value ? ' is-active' : ''
					}` }
					onClick={ () => onChange( opt.value ) }
				>
					{ opt.label }
				</button>
			) ) }
		</div>
	);
}

/**
 * Toggleable chip grid for a numeric multi-select (weekdays / month-days).
 *
 * @param {Object}   props          Component props.
 * @param {number[]} props.value    Selected values.
 * @param {Array}    props.options  [{ value, label }].
 * @param {Function} props.onChange (next:number[]) => void.
 * @return {JSX.Element} The control.
 */
function ChipGrid( { value, options, onChange } ) {
	const selected = Array.isArray( value ) ? value : [];
	const toggle = ( v ) =>
		onChange(
			selected.includes( v )
				? selected.filter( ( x ) => x !== v )
				: [ ...selected, v ]
		);

	return (
		<div className="optset-daychips">
			{ options.map( ( opt ) => {
				const v = typeof opt === 'object' ? opt.value : opt;
				const label = typeof opt === 'object' ? opt.label : opt;
				return (
					<button
						key={ v }
						type="button"
						className={ `optset-daychip${
							selected.includes( v ) ? ' is-active' : ''
						}` }
						aria-pressed={ selected.includes( v ) }
						onClick={ () => toggle( v ) }
					>
						{ label }
					</button>
				);
			} ) }
		</div>
	);
}

/**
 * DateConfig.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.node          Selected node.
 * @param {Function} props.patch         (partialNode) => void.
 * @param {boolean}  [props.showPricing] Render the pricing panel (default true;
 *                                       the combined Date & Time field renders
 *                                       pricing once at the top instead).
 * @return {JSX.Element} The config block.
 */
export default function DateConfig( { node, patch, showPricing = true } ) {
	const cfg = node.config || {};
	const format = cfg.format || 'd/m/Y';
	const setKey = ( key, value ) =>
		patch( { config: { ...cfg, [ key ]: value } } );

	const disableDates = Array.isArray( cfg.disableDates )
		? cfg.disableDates
		: [];

	const addDisableDate = ( str ) => {
		if ( str && ! disableDates.includes( str ) ) {
			setKey( 'disableDates', [ ...disableDates, str ] );
		}
	};
	const removeDisableDate = ( str ) =>
		setKey(
			'disableDates',
			disableDates.filter( ( d ) => d !== str )
		);

	return (
		<>
			{ showPricing && <ValuePricing node={ node } patch={ patch } /> }

			<div className="optset-settings__group">
				<p className="optset-field-group__title">
					{ __(
						'Display',
						'option-set-builder'
					) }
				</p>
				<Field
					label={ __(
						'Date format',
						'option-set-builder'
					) }
				>
					<SelectControl
						value={ format }
						options={ DATE_FORMATS }
						onChange={ ( v ) => setKey( 'format', v ) }
					/>
				</Field>
			</div>

			<div className="optset-settings__group">
				<p className="optset-field-group__title">
					{ __(
						'Selectable range',
						'option-set-builder'
					) }
				</p>
				<div className="optset-settings__grid2">
					<Field
						label={ __(
							'Earliest date',
							'option-set-builder'
						) }
					>
						<div className="optset-daterange">
							<Segmented
								value={ cfg.minMode || 'none' }
								options={ RANGE_MODES }
								onChange={ ( v ) => setKey( 'minMode', v ) }
							/>
							{ cfg.minMode === 'custom' && (
								<DatePicker
									value={ cfg.minDate || '' }
									dateFormat={ format }
									onChange={ ( v ) => setKey( 'minDate', v ) }
								/>
							) }
						</div>
					</Field>
					<Field
						label={ __(
							'Latest date',
							'option-set-builder'
						) }
					>
						<div className="optset-daterange">
							<Segmented
								value={ cfg.maxMode || 'none' }
								options={ RANGE_MODES }
								onChange={ ( v ) => setKey( 'maxMode', v ) }
							/>
							{ cfg.maxMode === 'custom' && (
								<DatePicker
									value={ cfg.maxDate || '' }
									dateFormat={ format }
									onChange={ ( v ) => setKey( 'maxDate', v ) }
								/>
							) }
						</div>
					</Field>
				</div>
				<div className="optset-settings__toggle-row">
					<ToggleField
						checked={ !! cfg.disableToday }
						onChange={ ( v ) => setKey( 'disableToday', v ) }
						label={ __(
							"Block today's date",
							'option-set-builder'
						) }
					/>
				</div>
			</div>

			<div className="optset-settings__group">
				<p className="optset-field-group__title">
					{ __(
						'Blocked dates',
						'option-set-builder'
					) }
				</p>
				<Field
					label={ __(
						'Add a date to block',
						'option-set-builder'
					) }
				>
					<DatePicker
						value=""
						dateFormat={ format }
						placeholder={ __(
							'Pick a date…',
							'option-set-builder'
						) }
						onChange={ addDisableDate }
					/>
				</Field>
				{ disableDates.length > 0 && (
					<div className="optset-daychips optset-daychips--dates">
						{ disableDates.map( ( d ) => (
							<span key={ d } className="optset-datechip">
								{ d }
								<button
									type="button"
									aria-label={ __(
										'Remove',
										'option-set-builder'
									) }
									onClick={ () => removeDisableDate( d ) }
								>
									<X size={ 12 } />
								</button>
							</span>
						) ) }
					</div>
				) }
			</div>

			<div className="optset-settings__group">
				<p className="optset-field-group__title">
					{ __(
						'Blocked weekdays',
						'option-set-builder'
					) }
				</p>
				<ChipGrid
					value={ cfg.disableWeekdays }
					options={ WEEKDAYS }
					onChange={ ( v ) => setKey( 'disableWeekdays', v ) }
				/>
			</div>

			<div className="optset-settings__group">
				<p className="optset-field-group__title">
					{ __(
						'Blocked days of the month',
						'option-set-builder'
					) }
				</p>
				<ChipGrid
					value={ cfg.disableMonthlyDays }
					options={ MONTH_DAYS }
					onChange={ ( v ) => setKey( 'disableMonthlyDays', v ) }
				/>
			</div>
		</>
	);
}
