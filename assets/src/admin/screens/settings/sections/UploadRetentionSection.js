/**
 * Upload Retention section — three retention windows (temporary, after
 * order placed, after order completed). 0 means keep forever; the hint
 * line restates the effect of the current value.
 *
 * @package
 */

import { __, sprintf, _n } from '@wordpress/i18n';
import { TextControl } from '../../../components';
import SettingCard from '../SettingCard';

/**
 * Human-readable effect of a retention value.
 *
 * @param {number} days Retention days (0 = forever).
 * @return {string} Hint text.
 */
function retentionHint( days ) {
	const n = parseInt( days, 10 ) || 0;
	if ( n <= 0 ) {
		return __( 'Kept forever', 'option-set-builder' );
	}
	return sprintf(
		/* translators: %d: number of days. */
		_n(
			'Deleted after %d day',
			'Deleted after %d days',
			n,
			'option-set-builder'
		),
		n
	);
}

/**
 * Single retention card.
 *
 * @param {Object}   props       Props.
 * @param {string}   props.icon  dashicons suffix.
 * @param {string}   props.tone  Accent tone.
 * @param {string}   props.title Card title.
 * @param {number}   props.value Current value.
 * @param {Function} props.onSet (next:number) => void.
 * @return {JSX.Element} The card.
 */
function RetentionCard( { icon, tone, title, value, onSet } ) {
	return (
		<SettingCard
			icon={ icon }
			tone={ tone }
			title={ title }
			hint={ retentionHint( value ) }
		>
			<TextControl
				type="number"
				min="0"
				value={ value }
				onChange={ ( v ) => onSet( parseInt( v, 10 ) || 0 ) }
			/>
		</SettingCard>
	);
}

/**
 * UploadRetentionSection.
 *
 * @param {Object}   props        Props.
 * @param {Object}   props.values Settings map.
 * @param {Function} props.set    (key,val) => void.
 * @return {JSX.Element} The section.
 */
export default function UploadRetentionSection( { values, set } ) {
	return (
		<div className="optset-set-grid optset-set-grid--3">
			<RetentionCard
				icon="clock"
				tone="blue"
				title={ __(
					'Temporary Uploads',
					'option-set-builder'
				) }
				value={ values.uploadTempDays }
				onSet={ ( v ) => set( 'uploadTempDays', v ) }
			/>
			<RetentionCard
				icon="cart"
				tone="amber"
				title={ __(
					'After Order Placed',
					'option-set-builder'
				) }
				value={ values.uploadPlacedDays }
				onSet={ ( v ) => set( 'uploadPlacedDays', v ) }
			/>
			<RetentionCard
				icon="yes"
				tone="green"
				title={ __(
					'After Order Completed',
					'option-set-builder'
				) }
				value={ values.uploadCompletedDays }
				onSet={ ( v ) => set( 'uploadCompletedDays', v ) }
			/>
		</div>
	);
}
