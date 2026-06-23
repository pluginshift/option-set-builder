<?php
/**
 * Numeric literal node.
 *
 * @package OptionSetBuilder\Formula\Ast\Node
 */

namespace OptionSetBuilder\Formula\Ast\Node;

use OptionSetBuilder\Formula\Ast\ExpressionEngine;

defined( 'ABSPATH' ) || exit;

/**
 * A constant numeric value parsed straight from the source.
 */
final class NumberNode implements NodeInterface {

	/**
	 * The literal value.
	 *
	 * @var float
	 */
	private $value;

	/**
	 * @param mixed $value Numeric literal.
	 */
	public function __construct( $value ) {
		$this->value = (float) $value;
	}

	/**
	 * Return the literal value unchanged.
	 *
	 * @param ExpressionEngine $engine Engine (unused).
	 * @param array            $ctx    Context (unused).
	 * @return float
	 */
	public function evaluate( ExpressionEngine $engine, array $ctx = array() ) {
		return $this->value;
	}
}
