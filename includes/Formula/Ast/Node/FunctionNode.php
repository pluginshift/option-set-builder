<?php
/**
 * Whitelisted function-call node.
 *
 * Only a fixed set of pure arithmetic / logic helpers is allowed. There
 * is no dynamic PHP dispatch — every name maps to an explicit branch.
 *
 * Supported functions (case-insensitive):
 *   if(c, a, b)   exactly 3 args, lazy (only the chosen branch evaluated)
 *   abs(x)        1 arg
 *   ceil(x)       1 arg
 *   floor(x)      1 arg
 *   round(x[,p])  1 or 2 args, PHP_ROUND_HALF_UP
 *   pow(b, e)     exactly 2 args
 *   min(...)      1+ args
 *   max(...)      1+ args
 *
 * @package OptionSetBuilder\Formula\Ast\Node
 */

namespace OptionSetBuilder\Formula\Ast\Node;

use OptionSetBuilder\Formula\Ast\EvaluationError;
use OptionSetBuilder\Formula\Ast\ExpressionEngine;

defined( 'ABSPATH' ) || exit;

/**
 * A call to one of the whitelisted functions.
 */
final class FunctionNode implements NodeInterface {

	/**
	 * Lower-cased function name.
	 *
	 * @var string
	 */
	private $name;

	/**
	 * Argument nodes (unevaluated).
	 *
	 * @var NodeInterface[]
	 */
	private $args;

	/**
	 * @param string          $name Function name (case-insensitive).
	 * @param NodeInterface[] $args Argument nodes.
	 */
	public function __construct( string $name, array $args ) {
		$this->name = strtolower( $name );
		$this->args = $args;
	}

	/**
	 * Evaluate the function call.
	 *
	 * @param ExpressionEngine $engine Engine providing coercion helpers.
	 * @param array            $ctx    Variable context.
	 * @return mixed
	 * @throws EvaluationError On unknown function or wrong arity.
	 */
	public function evaluate( ExpressionEngine $engine, array $ctx = array() ) {
		$name = $this->name;
		$argc = count( $this->args );

		// if() is lazy: evaluate the condition, then only one branch.
		if ( 'if' === $name ) {
			if ( 3 !== $argc ) {
				throw new EvaluationError( 'if() expects exactly 3 arguments.' );
			}
			$condition = $engine->toBool( $this->args[0]->evaluate( $engine, $ctx ) );
			return $condition
				? $this->args[1]->evaluate( $engine, $ctx )
				: $this->args[2]->evaluate( $engine, $ctx );
		}

		// All other functions are eager: evaluate every argument once.
		$values = array();
		foreach ( $this->args as $arg ) {
			$values[] = $engine->toNumber( $arg->evaluate( $engine, $ctx ) );
		}

		switch ( $name ) {
			case 'abs':
				if ( 1 !== $argc ) {
					throw new EvaluationError( 'abs() expects exactly 1 argument.' );
				}
				return abs( $values[0] );

			case 'ceil':
				if ( 1 !== $argc ) {
					throw new EvaluationError( 'ceil() expects exactly 1 argument.' );
				}
				return ceil( $values[0] );

			case 'floor':
				if ( 1 !== $argc ) {
					throw new EvaluationError( 'floor() expects exactly 1 argument.' );
				}
				return floor( $values[0] );

			case 'round':
				if ( $argc < 1 || $argc > 2 ) {
					throw new EvaluationError( 'round() expects 1 or 2 arguments.' );
				}
				$precision = ( 2 === $argc ) ? (int) $values[1] : 0;
				return round( $values[0], $precision, PHP_ROUND_HALF_UP );

			case 'pow':
				if ( 2 !== $argc ) {
					throw new EvaluationError( 'pow() expects exactly 2 arguments.' );
				}
				return pow( $values[0], $values[1] );

			case 'min':
				if ( $argc < 1 ) {
					throw new EvaluationError( 'min() expects at least 1 argument.' );
				}
				return min( $values );

			case 'max':
				if ( $argc < 1 ) {
					throw new EvaluationError( 'max() expects at least 1 argument.' );
				}
				return max( $values );
		}

		throw new EvaluationError( esc_html( 'Unknown function "' . $this->name . '".' ) );
	}
}
