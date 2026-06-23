/**
 * Shop Loop section — how option-bearing products behave on shop/archive
 * pages: force the "Select options" button and customise its text.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { Field, TextControl } from '../../../components';
import SettingCard from '../SettingCard';
import SwitchRow from '../SwitchRow';

/**
 * ShopLoopSection.
 *
 * @param {Object}   props        Props.
 * @param {Object}   props.values Settings map.
 * @param {Function} props.set    (key,val) => void.
 * @return {JSX.Element} The section.
 */
export default function ShopLoopSection( { values, set } ) {
	return (
		<div className="optset-set-grid optset-set-grid--2">
			<SettingCard
				icon="screenoptions"
				tone="violet"
				title={ __(
					'Select Options Button',
					'option-set-builder'
				) }
				subtitle={ __(
					'Behaviour on the shop loop',
					'option-set-builder'
				) }
				hint={
					values.shopForceSelect
						? __(
								'Shoppers are sent to the product page to choose options',
								'option-set-builder'
						  )
						: __(
								'Default WooCommerce add-to-cart behaviour',
								'option-set-builder'
						  )
				}
			>
				<SwitchRow
					label={ __(
						'Force "Select options" on shop loop',
						'option-set-builder'
					) }
					checked={ values.shopForceSelect }
					onChange={ ( v ) => set( 'shopForceSelect', v ) }
				/>
			</SettingCard>

			<SettingCard
				icon="edit"
				tone="blue"
				title={ __(
					'Button Text',
					'option-set-builder'
				) }
				subtitle={ __(
					'Label shown on the shop loop',
					'option-set-builder'
				) }
			>
				<Field
					label={ __(
						'Shop loop button text',
						'option-set-builder'
					) }
				>
					<TextControl
						value={ values.shopButtonText }
						onChange={ ( v ) => set( 'shopButtonText', v ) }
					/>
				</Field>
			</SettingCard>
		</div>
	);
}
