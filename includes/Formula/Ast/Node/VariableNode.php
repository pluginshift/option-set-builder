<?php
/**
 * Dynamic variable placeholder node (e.g. [product_price]).
 *
 * @package OptionSetBuilder\Formula\Ast\Node
 */

namespace OptionSetBuilder\Formula\Ast\Node;

use OptionSetBuilder\Formula\Ast\ExpressionEngine;

defined( 'ABSPATH' ) || exit;

/**
 * Resolves a [name] placeholder through the engine, which reads it from
 * the evaluation context (missing -> 0).
 */
final class VariableNode implements NodeInterface {

	/**
	 * Placeholder name (without brackets).
	 *
	 * @var string
	 */
	private $name;

	/**
	 * @param string $name Placeholder name.
	 */
	public function __construct( string $name ) {
		$this->name = $name;
	}

	/**
	 * Resolve the variable from the context.
	 *
	 * @param ExpressionEngine $engine Engine providing the resolver.
	 * @param array            $ctx    Variable context.
	 * @return mixed
	 */
	public function evaluate( ExpressionEngine $engine, array $ctx = array() ) {
		return $engine->getDynamic( $this->name, $ctx );
	}
}
