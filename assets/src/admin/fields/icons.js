/**
 * Lucide icon map for field types and palette categories. The registry
 * still stores dashicon slugs (for the legacy storefront/PHP side), so this
 * module is the single bridge from a field `slug` → a modern <Icon /> in the
 * React builder. Unknown slugs degrade to a neutral square.
 *
 * @package
 */

import {
	AlignLeft,
	Calculator,
	Calendar,
	CalendarClock,
	CheckSquare,
	ChevronDown,
	CircleDot,
	Clock,
	Code2,
	Hash,
	Heading,
	Image,
	LayoutGrid,
	LayoutTemplate,
	Link2,
	ListChecks,
	Mail,
	Minus,
	MoveVertical,
	Palette,
	Phone,
	Pipette,
	Rows3,
	Settings2,
	ShoppingCart,
	Sigma,
	SlidersHorizontal,
	Sparkles,
	SquareArrowOutUpRight,
	SquareCode,
	TextCursorInput,
	ToggleRight,
	Type,
	Upload,
} from 'lucide-react';

/** Field slug → lucide icon component. */
const FIELD_ICONS = {
	text: Type,
	textarea: AlignLeft,
	email: Mail,
	url: Link2,
	tel: Phone,
	number: Hash,
	date: Calendar,
	time: Clock,
	datetime: CalendarClock,
	fileupload: Upload,
	checkbox: CheckSquare,
	radio: CircleDot,
	select: ChevronDown,
	toggle: ToggleRight,
	buttongroup: LayoutGrid,
	colorswatch: Palette,
	imageswatch: Image,
	range: SlidersHorizontal,
	colorpicker: Pipette,
	fontpicker: Type,
	formula: Calculator,
	advancedformula: Sigma,
	linkedproducts: ShoppingCart,
	heading: Heading,
	html: Code2,
	divider: Minus,
	spacer: MoveVertical,
	section: Rows3,
	popup: SquareArrowOutUpRight,
	shortcode: SquareCode,
};

/** Category key → lucide icon component (field picker headers). */
export const CATEGORY_ICONS = {
	Input: TextCursorInput,
	Choice: ListChecks,
	Advanced: Sparkles,
	Layout: LayoutTemplate,
	Special: Settings2,
};

/**
 * Resolve a field type slug to its lucide icon component.
 *
 * @param {string} slug Field type slug.
 * @return {Function} A lucide icon component.
 */
export function fieldIcon( slug ) {
	return FIELD_ICONS[ slug ] || Settings2;
}
