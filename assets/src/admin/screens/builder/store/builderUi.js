/**
 * Ephemeral builder UI state (zustand). Kept deliberately separate from the
 * BuilderContext reducer, which owns the persisted field tree: this store
 * only holds transient view state — the active view mode, the field-picker
 * modal, and whether the settings drawer is open — so toggling a panel never
 * re-renders the tree and vice-versa.
 *
 * @package
 */

import { create } from 'zustand';

/**
 * @typedef {Object} BuilderUiState
 * @property {'build'|'preview'} view         Canvas mode.
 * @property {boolean}           pickerOpen   Field-picker modal visibility.
 * @property {string}            pickerParent Parent id to insert into ('' = root).
 * @property {number|undefined}  pickerIndex  Insert index (undefined = append).
 * @property {boolean}           settingsOpen Settings drawer visibility.
 */

export const useBuilderUI = create( ( set ) => ( {
	view: 'build',
	pickerOpen: false,
	pickerParent: '',
	pickerIndex: undefined,
	settingsOpen: false,

	/** @param {'build'|'preview'} view View mode. */
	setView: ( view ) => set( { view } ),

	/**
	 * Open the field picker, remembering where the new field should land.
	 *
	 * @param {string} [parent] Parent id ('' for root).
	 * @param {number} [index]  Insert index (undefined appends).
	 */
	openPicker: ( parent = '', index = undefined ) =>
		set( { pickerOpen: true, pickerParent: parent, pickerIndex: index } ),

	closePicker: () => set( { pickerOpen: false } ),

	openSettings: () => set( { settingsOpen: true } ),
	closeSettings: () => set( { settingsOpen: false } ),
} ) );
