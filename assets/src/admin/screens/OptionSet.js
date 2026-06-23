/**
 * Option Sets route entry — owns the SetsContext provider and renders the
 * <OptionSet /> screen (formerly <List /> inside SetsList).
 *
 * @package
 */

import { SetsProvider } from '../store/SetsContext';
import OptionSetScreen from './option-set/OptionSetScreen';

/**
 * OptionSet — provider wrapper for the Option Sets screen.
 *
 * @return {JSX.Element} The screen.
 */
export default function OptionSet() {
	return (
		<SetsProvider>
			<OptionSetScreen />
		</SetsProvider>
	);
}
