/**
 * Settings screen — wrapped in the unified PageFrame. The previous
 * SettingsHeader (sticky branded header) is superseded: the title row lives
 * in PageFrame and the Save action sits in the page actions slot.
 *
 * @package
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { PageFrame, SkeletonNav, SkeletonForm, FadeIn } from '../components';
import { SECTIONS } from './settings/config';
import useSettings from './settings/useSettings';
import SettingsNav from './settings/SettingsNav';
import SectionPanel from './settings/SectionPanel';
import PriceDisplaySection from './settings/sections/PriceDisplaySection';
import CartCheckoutSection from './settings/sections/CartCheckoutSection';
import ShopLoopSection from './settings/sections/ShopLoopSection';
import UploadRetentionSection from './settings/sections/UploadRetentionSection';
import FontsSection from './settings/sections/FontsSection';

/** Section id → body component. */
const BODIES = {
	price: PriceDisplaySection,
	cart: CartCheckoutSection,
	shop: ShopLoopSection,
	uploads: UploadRetentionSection,
	fonts: FontsSection,
};

/**
 * Settings.
 *
 * @return {JSX.Element} The screen.
 */
export default function Settings() {
	const { status, error, values, dirty, saving, set, save } = useSettings();
	const [ activeId, setActiveId ] = useState( SECTIONS[ 0 ].id );

	const section =
		SECTIONS.find( ( s ) => s.id === activeId ) || SECTIONS[ 0 ];
	const Body = BODIES[ section.id ];
	
	const actions = (
		<>
			{ dirty && ! saving && (
				<span className="optset-page__unsaved" role="status">
					{ __(
						'Unsaved changes',
						'option-set-builder'
					) }
				</span>
			) }
			<button
				type="button"
				className="optset-pg-btn optset-pg-btn--primary"
				disabled={ saving }
				onClick={ save }
			>
				{ saving
					? __( 'Saving…', 'option-set-builder' )
					: __(
							'Save Settings',
							'option-set-builder'
					  ) }
			</button>
		</>
	);
	console.log('Save Settings by...', actions);

	return (
		<PageFrame
			title={ __(
				'Settings',
				'option-set-builder'
			) }
			subtitle={ __(
				'Manage your plugin configuration.',
				'option-set-builder'
			) }
			actions={ actions }
		>
			<div className="optset-set__body">
				{ status === 'loading' ? (
					<SkeletonNav items={ 5 } />
				) : (
					<SettingsNav active={ activeId } onSelect={ setActiveId } />
				) }

				{ status === 'loading' ? (
					<div className="optset-set-state">
						<SkeletonForm fields={ 5 } />
					</div>
				) : (
					<SectionPanel section={ section }>
						{ status === 'error' && (
							<div className="optset-set-state">
								<p className="optset-error">{ error }</p>
							</div>
						) }
						{ status === 'ready' && (
							<FadeIn>
								{ section.id === 'fonts' ? (
									<Body />
								) : (
									<Body values={ values } set={ set } />
								) }
							</FadeIn>
						) }
					</SectionPanel>
				) }
			</div>
		</PageFrame>
	);
}
