<?php
/**
 * Binary operator node.
 *
 * Supports (grouped by the precedence the parser assigns, low -> high):
 *   ||                 logical OR  (short-circuit, boolean operands)
 *   &                  logical AND (short-circuit, boolean operands)
 *   > < >= <= != =     comparisons (loose numeric for = / !=)
 *   + -                additive
 *   * /                multiplicative (division by zero throws)
 *
 * @package OptionSetBuilder\Formula\Ast\Node
 */

namespace OptionSetBuilder\Formula\Ast\Node;

use OptionSetBuilder\Formula\Ast\EvaluationError;
use OptionSetBuilder\Formula\Ast\ExpressionEngine;

defined( 'ABSPATH' ) || exit;

/**
 * A node combining two sub-expressions with an operator.
 */
final class BinaryNode implements NodeInterface {

	/**
	 * Operator text.
	 *
	 * @var string
	 */
	private $op;

	/**
	 * Left operand.
	 *
	 * @var NodeInterface
	 */
	private $left;

	/**
	 * Right operand.
	 *
	 * @var NodeInterface
	 */
	private $right;

	/**
	 * @param string        $op    Operator text.
	 * @param NodeInterface $left  Left operand.
	 * @param NodeInterface $right Right operand.
	 */
	public function __construct( string $op, NodeInterface $left, NodeInterface $right ) {
		$this->op    = $op;
		$this->left  = $left;
		$this->right = $right;
	}

	/**
	 * Evaluate the binary expression.
	 *
	 * @param ExpressionEngine $engine Engine providing coercion helpers.
	 * @param array            $ctx    Variable context.
	 * @return mixed Boolean for logical/comparison ops, float for math.
	 * @throws EvaluationError On division by zero or an unknown operator.
	 */
	public function evaluate( ExpressionEngine $engine, array $ctx = array() ) {
		$op = $this->op;

		// Logical operators short-circuit on the boolean view of operands.
		if ( '||' === $op ) {
			return $engine->toBool( $this->left->evaluate( $engine, $ctx ) )
				|| $engine->toBool( $this->right->evaluate( $engine, $ctx ) );
		}
		if ( '&' === $op ) {
			return $engine->toBool( $this->left->evaluate( $engine, $ctx ) )
				&& $engine->toBool( $this->right->evaluate( $engine, $ctx ) );
		}

		$left  = $this->left->evaluate( $engine, $ctx );
		$right = $this->right->evaluate( $engine, $ctx );

		// Comparisons operate on the numeric view of both operands.
		$ln = $engine->toNumber( $left );
		$rn = $engine->toNumber( $right );

		switch ( $op ) {
			case '>':
				return $ln > $rn;
			case '<':
				return $ln < $rn;
			case '>=':
				return $ln >= $rn;
			case '<=':
				return $ln <= $rn;
			case '!=':
				return $ln != $rn; // phpcs:ignore WordPress.PHP.StrictComparisons.LooseComparison -- loose numeric inequality intended.
			case '=':
				return $ln == $rn; // phpcs:ignore WordPress.PHP.StrictComparisons.LooseComparison -- loose numeric equality intended.
			case '+':
				return $ln + $rn;
			case '-':
				return $ln - $rn;
			case '*':
				return $ln * $rn;
			case '/':
				if ( 0.0 === $rn ) {
					throw new EvaluationError( 'Division by zero.' );
				}
				return $ln / $rn;
		}

		throw new EvaluationError( esc_html( 'Unsupported operator: ' . $op ) );
	}
}
