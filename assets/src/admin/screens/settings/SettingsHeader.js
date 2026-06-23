/**
 * Sticky page header — branded title block on the left, the primary
 * "Save settings" action on the right. The save button reflects the
 * dirty + saving state of useSettings.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';

/** Inline floppy-disk glyph (dashicons has no clean save icon). */
const SaveIcon = () => (
	<svg
		width="18"
		height="18"
		viewBox="0 0 24 24"
		fill="none"
		aria-hidden="true"
		focusable="false"
	>
		<path
			d="M5 3h11l4 4v12.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5 3Z"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinejoin="round"
		/>
		<path
			d="M8 3v5h7V3M8 21v-6h8v6"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinejoin="round"
		/>
	</svg>
);

/**
 * SettingsHeader.
 *
 * @param {Object}   props        Props.
 * @param {boolean}  props.saving Save in flight.
 * @param {boolean}  props.dirty  Unsaved changes present.
 * @param {Function} props.onSave Save handler.
 * @return {JSX.Element} The header.
 */
export default function SettingsHeader( { saving, dirty, onSave } ) {
	return (
		<header className="optset-set-header">
			<div className="optset-set-header__brand">
				<span
					className="optset-set-tile optset-set-tile--lg optset-set-tile--violet"
					aria-hidden="true"
				>
					<span className="dashicons dashicons-admin-settings" />
				</span>
				<div>
					<h1 className="optset-set-header__title">
						{ __(
							'Settings',
							'option-set-builder'
						) }
					</h1>
					<p className="optset-set-header__sub">
						{ __(
							'Manage your plugin configuration',
							'option-set-builder'
						) }
					</p>
				</div>
			</div>

			<div className="optset-set-header__actions">
				{ dirty && ! saving && (
					<span className="optset-set-header__unsaved" role="status">
						{ __(
							'Unsaved changes',
							'option-set-builder'
						) }
					</span>
				) }
				<button
					type="button"
					className="optset-set-save"
					disabled={ saving }
					onClick={ onSave }
				>
					<SaveIcon />
					{ saving
						? __(
								'Saving…',
								'option-set-builder'
						  )
						: __(
								'Save Settings',
								'option-set-builder'
						  ) }
				</button>
			</div>
		</header>
	);
}
