/**
 * A label-left / toggle-right row used inside SettingCard bodies. The
 * label is the toggle's own <label> text (kept accessible) and CSS
 * pushes the switch to the trailing edge.
 *
 * @package
 */

import { ToggleField } from '../../components';

/**
 * SwitchRow.
 *
 * @param {Object}   props          Props.
 * @param {string}   props.label    Row label (also the control's a11y name).
 * @param {boolean}  props.checked  Toggle state.
 * @param {Function} props.onChange (next:boolean) => void.
 * @return {JSX.Element} The row.
 */
export default function SwitchRow( { label, checked, onChange } ) {
	return (
		<div className="optset-set-switchrow">
			<ToggleField
				label={ label }
				checked={ checked }
				onChange={ onChange }
			/>
		</div>
	);
}
