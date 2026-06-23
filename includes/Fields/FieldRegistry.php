<?php
/**
 * Field type registry.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Fields;

defined( 'ABSPATH' ) || exit;

/**
 * Maps a type slug to its renderer class and instantiates field objects.
 *
 * Every option type ships in this plugin. Additional types can be registered by
 * third parties through the `optset_field_types` filter.
 */
final class FieldRegistry {

	/**
	 * slug => FQCN map.
	 *
	 * @var array<string,string>
	 */
	private $map;

	/**
	 * Build the default map.
	 */
	public function __construct() {
		$base = __NAMESPACE__ . '\\Type\\';
		$this->map = apply_filters(
			'optset_field_types',
			array(
				'text'            => $base . 'TextField',
				'textarea'        => $base . 'TextareaField',
				'email'           => $base . 'EmailField',
				'url'             => $base . 'UrlField',
				'tel'             => $base . 'TelField',
				'number'          => $base . 'NumberField',
				'checkbox'        => $base . 'CheckboxField',
				'radio'           => $base . 'RadioField',
				'select'          => $base . 'SelectField',
				'toggle'          => $base . 'ToggleField',
				'range'           => $base . 'RangeField',
				'date'            => $base . 'DateField',
				'time'            => $base . 'TimeField',
				'datetime'        => $base . 'DatetimeField',
				'colorpicker'     => $base . 'ColorPickerField',
				'colorswatch'     => $base . 'ColorSwatchField',
				'imageswatch'     => $base . 'ImageSwatchField',
				'fileupload'      => $base . 'FileUploadField',
				'heading'         => $base . 'HeadingField',
				'html'            => $base . 'HtmlField',
				'divider'         => $base . 'DividerField',
				'spacer'          => $base . 'SpacerField',
				'section'         => $base . 'SectionField',
				'buttongroup'     => $base . 'ButtonGroupField',
				'popup'           => $base . 'PopupField',
				'shortcode'       => $base . 'ShortcodeField',
				'linkedproducts'  => $base . 'LinkedProductsField',
				'formula'         => $base . 'FormulaField',
				'fontpicker'      => $base . 'FontPickerField',
				'advancedformula' => $base . 'AdvancedFormulaField',
			)
		);
	}

	/**
	 * Whether a slug is registered.
	 *
	 * @param string $type Slug.
	 * @return bool
	 */
	public function has( $type ) {
		return isset( $this->map[ $type ] );
	}

	/**
	 * Registered slugs.
	 *
	 * @return string[]
	 */
	public function types() {
		return array_keys( $this->map );
	}

	/**
	 * Instantiate a field from a node.
	 *
	 * @param array $node       Field node.
	 * @param int   $product_id Product id.
	 * @param int   $set_id     Option-set id.
	 * @return FieldContract|null
	 */
	public function make( array $node, $product_id = 0, $set_id = 0 ) {
		$type = isset( $node['type'] ) ? $node['type'] : '';
		if ( ! $this->has( $type ) ) {
			return null;
		}
		$class = $this->map[ $type ];
		if ( ! class_exists( $class ) ) {
			return null;
		}
		return new $class( $node, $product_id, $set_id );
	}
}
