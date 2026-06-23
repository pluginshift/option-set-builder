<?php
/**
 * Prefix unary operator node (+x / -x).
 *
 * @package OptionSetBuilder\Formula\Ast\Node
 */

namespace OptionSetBuilder\Formula\Ast\Node;

use OptionSetBuilder\Formula\Ast\EvaluationError;
use OptionSetBuilder\Formula\Ast\ExpressionEngine;

defined( 'ABSPATH' ) || exit;

/**
 * Applies a leading + or - to its operand. The operand is coerced to a
 * number first so unary math is always well defined.
 */
final class UnaryNode implements NodeInterface {

	/**
	 * Operator, either "+" or "-".
	 *
	 * @var string
	 */
	private $op;

	/**
	 * Operand node.
	 *
	 * @var NodeInterface
	 */
	private $operand;

	/**
	 * @param string        $op      "+" or "-".
	 * @param NodeInterface $operand Operand node.
	 */
	public function __construct( string $op, NodeInterface $operand ) {
		$this->op      = $op;
		$this->operand = $operand;
	}

	/**
	 * Evaluate the unary expression.
	 *
	 * @param ExpressionEngine $engine Engine providing coercion.
	 * @param array            $ctx    Variable context.
	 * @return float
	 * @throws EvaluationError On an unsupported operator.
	 */
	public function evaluate( ExpressionEngine $engine, array $ctx = array() ) {
		$value = $engine->toNumber( $this->operand->evaluate( $engine, $ctx ) );

		if ( '+' === $this->op ) {
			return +$value;
		}
		if ( '-' === $this->op ) {
			return -$value;
		}

		throw new EvaluationError( esc_html( 'Unsupported unary operator: ' . $this->op ) );
	}
}
