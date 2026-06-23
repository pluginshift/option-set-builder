/**
 * General-tab config for the combined Date & Time field. It reuses the Date
 * and Time panels wholesale (they write the same shared `config` keys), with a
 * single pricing block at the top — so the datetime field stays in lock-step
 * with the standalone Date / Time fields and the DatetimeField.php renderer.
 *
 * @package
 */

import ValuePricing from './ValuePricing';
import DateConfig from './DateConfig';
import TimeConfig from './TimeConfig';

/**
 * DatetimeConfig.
 *
 * @param {Object}   props       Component props.
 * @param {Object}   props.node  Selected node.
 * @param {Function} props.patch (partialNode) => void.
 * @return {JSX.Element} The config block.
 */
export default function DatetimeConfig( { node, patch } ) {
	return (
		<>
			<ValuePricing node={ node } patch={ patch } />
			<DateConfig node={ node } patch={ patch } showPricing={ false } />
			<TimeConfig node={ node } patch={ patch } showPricing={ false } />
		</>
	);
}
