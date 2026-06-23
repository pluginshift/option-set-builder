/**
 * Price Display section — the options price line and running total line,
 * each in its own card with an enable toggle + custom label.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { Field, TextControl } from '../../../components';
import SettingCard from '../SettingCard';
import SwitchRow from '../SwitchRow';

/**
 * PriceDisplaySection.
 *
 * @param {Object}   props        Props.
 * @param {Object}   props.values Settings map.
 * @param {Function} props.set    (key,val) => void.
 * @return {JSX.Element} The section.
 */
export default function PriceDisplaySection( { values, set } ) {
	return (
		<div className="optset-set-grid optset-set-grid--2">
			<SettingCard
				icon="money-alt"
				tone="blue"
				title={ __(
					'Options Price Line',
					'option-set-builder'
				) }
				subtitle={ __(
					'The combined price of selected options',
					'option-set-builder'
				) }
			>
				<SwitchRow
					label={ __(
						'Show options price line',
						'option-set-builder'
					) }
					checked={ values.showPriceLine }
					onChange={ ( v ) => set( 'showPriceLine', v ) }
				/>
				<Field
					label={ __(
						'Label',
						'option-set-builder'
					) }
				>
					<TextControl
						value={ values.priceLineLabel }
						onChange={ ( v ) => set( 'priceLineLabel', v ) }
					/>
				</Field>
			</SettingCard>

			<SettingCard
				icon="money-alt"
				tone="green"
				title={ __(
					'Total Price Line',
					'option-set-builder'
				) }
				subtitle={ __(
					'Base product price plus all options',
					'option-set-builder'
				) }
			>
				<SwitchRow
					label={ __(
						'Show total price line',
						'option-set-builder'
					) }
					checked={ values.showTotalLine }
					onChange={ ( v ) => set( 'showTotalLine', v ) }
				/>
				<Field
					label={ __(
						'Label',
						'option-set-builder'
					) }
				>
					<TextControl
						value={ values.totalLineLabel }
						onChange={ ( v ) => set( 'totalLineLabel', v ) }
					/>
				</Field>
			</SettingCard>
		</div>
	);
}
