/**
 * Animated "add field" affordance — an interactive dashed dropzone with a
 * springy plus button that opens the field picker, scoped to a container.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useBuilderUI } from '../store/builderUi';

/**
 * AddFieldButton.
 *
 * @param {Object}  props          Component props.
 * @param {string}  props.parentId Container to add into ('' for root).
 * @param {boolean} props.compact  Render the slim in-section variant.
 * @return {JSX.Element} The dropzone + button.
 */
export default function AddFieldButton( { parentId = '', compact = false } ) {
	const { openPicker } = useBuilderUI();

	return (
		<motion.button
			type="button"
			className={ `optset-add${ compact ? ' optset-add--compact' : '' }` }
			onClick={ () => openPicker( parentId ) }
			whileHover={ { scale: 1.01 } }
			whileTap={ { scale: 0.99 } }
		>
			<motion.span
				className="optset-add__plus"
				whileHover={ { rotate: 90 } }
				transition={ { type: 'spring', stiffness: 300, damping: 20 } }
			>
				<Plus size={ compact ? 16 : 20 } />
			</motion.span>
			{ ! compact && (
				<span className="optset-add__label">
					{ __(
						'Add field',
						'option-set-builder'
					) }
				</span>
			) }
		</motion.button>
	);
}
