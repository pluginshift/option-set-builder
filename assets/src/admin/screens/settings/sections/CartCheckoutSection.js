/**
 * Cart & Checkout section — visibility of the chosen options on the cart
 * and checkout pages. The hint line reflects the live toggle state.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import SettingCard from '../SettingCard';
import SwitchRow from '../SwitchRow';

/**
 * CartCheckoutSection.
 *
 * @param {Object}   props        Props.
 * @param {Object}   props.values Settings map.
 * @param {Function} props.set    (key,val) => void.
 * @return {JSX.Element} The section.
 */
export default function CartCheckoutSection( { values, set } ) {
	const visible = __(
		'Options will be visible',
		'option-set-builder'
	);
	const hidden = __(
		'Options will be hidden',
		'option-set-builder'
	);

	return (
		<div className="optset-set-grid optset-set-grid--2">
			<SettingCard
				icon="cart"
				tone="amber"
				title={ __(
					'Cart Page',
					'option-set-builder'
				) }
				subtitle={ __(
					'Visibility in cart',
					'option-set-builder'
				) }
				hint={ values.hideInCart ? hidden : visible }
			>
				<SwitchRow
					label={ __(
						'Hide options in cart',
						'option-set-builder'
					) }
					checked={ values.hideInCart }
					onChange={ ( v ) => set( 'hideInCart', v ) }
				/>
			</SettingCard>

			<SettingCard
				icon="money-alt"
				tone="green"
				title={ __(
					'Checkout Page',
					'option-set-builder'
				) }
				subtitle={ __(
					'Visibility at checkout',
					'option-set-builder'
				) }
				hint={ values.hideInCheckout ? hidden : visible }
			>
				<SwitchRow
					label={ __(
						'Hide options in checkout',
						'option-set-builder'
					) }
					checked={ values.hideInCheckout }
					onChange={ ( v ) => set( 'hideInCheckout', v ) }
				/>
			</SettingCard>
		</div>
	);
}
