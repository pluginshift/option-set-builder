<?php
/**
 * Recursive-descent parser turning a token stream into an AST.
 *
 * Operator precedence (lowest binds loosest, listed low -> high):
 *   1. ||                       logical OR
 *   2. &                        logical AND
 *   3. > < >= <= != =           comparisons (non-associative chains allowed)
 *   4. + -                      additive
 *   5. * /                      multiplicative
 *   6. unary + -                prefix sign
 *   7. primary                  number | variable | function call | ( expr )
 *
 * Each precedence level is one method that consumes the next-higher level
 * and folds left-associatively, which yields the table above without an
 * explicit precedence-climbing loop.
 *
 * @package OptionSetBuilder\Formula\Ast
 */

namespace OptionSetBuilder\Formula\Ast;

use OptionSetBuilder\Formula\Ast\Node\BinaryNode;
use OptionSetBuilder\Formula\Ast\Node\FunctionNode;
use OptionSetBuilder\Formula\Ast\Node\NodeInterface;
use OptionSetBuilder\Formula\Ast\Node\NumberNode;
use OptionSetBuilder\Formula\Ast\Node\UnaryNode;
use OptionSetBuilder\Formula\Ast\Node\VariableNode;

defined( 'ABSPATH' ) || exit;

/**
 * Parses a flat token list into an evaluable AST.
 */
final class Parser {

	/**
	 * Token list being parsed.
	 *
	 * @var Token[]
	 */
	private $tokens = array();

	/**
	 * Current token index.
	 *
	 * @var int
	 */
	private $pos = 0;

	/**
	 * Names of the whitelisted functions (lower-case).
	 *
	 * @var string[]
	 */
	private const FUNCTIONS = array(
		'if',
		'abs',
		'ceil',
		'floor',
		'round',
		'pow',
		'min',
		'max',
	);

	/**
	 * Parse a token stream into an AST root node.
	 *
	 * @param Token[] $tokens Token list (must end with a T_EOF token).
	 * @return NodeInterface Root of the parsed tree.
	 * @throws EvaluationError On any syntax error.
	 */
	public function parse( array $tokens ): NodeInterface {
		$this->tokens = array_values( $tokens );
		$this->pos    = 0;

		$node = $this->parseOr();
		$this->expect( Token::T_EOF );

		return $node;
	}

	/**
	 * Current token without consuming it.
	 *
	 * @return Token
	 */
	private function current(): Token {
		return $this->tokens[ $this->pos ];
	}

	/**
	 * Consume and return the current token.
	 *
	 * @return Token
	 */
	private function advance(): Token {
		return $this->tokens[ $this->pos++ ];
	}

	/**
	 * Consume the current token if it matches type (and optional value).
	 *
	 * @param int        $type  Expected token type.
	 * @param mixed|null $value Optional expected value.
	 * @return Token|null The consumed token, or null when no match.
	 */
	private function match( int $type, $value = null ): ?Token {
		$token = $this->current();
		if ( ! $token->is( $type ) ) {
			return null;
		}
		if ( null !== $value && $token->getValue() !== $value ) {
			return null;
		}
		return $this->advance();
	}

	/**
	 * Require the current token to match, otherwise fail.
	 *
	 * @param int        $type  Expected token type.
	 * @param mixed|null $value Optional expected value.
	 * @return Token
	 * @throws EvaluationError When the token does not match.
	 */
	private function expect( int $type, $value = null ): Token {
		$token = $this->match( $type, $value );
		if ( null === $token ) {
			$got = $this->current();
			throw new EvaluationError(
				esc_html( 'Unexpected token at position ' . $got->getPosition() . '.' )
			);
		}
		return $token;
	}

	/**
	 * Level 1: logical OR (||), left-associative.
	 *
	 * @return NodeInterface
	 */
	private function parseOr(): NodeInterface {
		$node = $this->parseAnd();
		while ( null !== $this->match( Token::T_OP, '||' ) ) {
			$node = new BinaryNode( '||', $node, $this->parseAnd() );
		}
		return $node;
	}

	/**
	 * Level 2: logical AND (&), left-associative.
	 *
	 * @return NodeInterface
	 */
	private function parseAnd(): NodeInterface {
		$node = $this->parseComparison();
		while ( null !== $this->match( Token::T_OP, '&' ) ) {
			$node = new BinaryNode( '&', $node, $this->parseComparison() );
		}
		return $node;
	}

	/**
	 * Level 3: comparisons (> < >= <= != =), left-associative.
	 *
	 * @return NodeInterface
	 */
	private function parseComparison(): NodeInterface {
		$node = $this->parseAdditive();

		$ops = array( '>', '<', '>=', '<=', '!=', '=' );
		while ( true ) {
			$token = $this->current();
			if ( ! $token->is( Token::T_OP ) || ! in_array( $token->getValue(), $ops, true ) ) {
				break;
			}
			$op   = (string) $token->getValue();
			$this->advance();
			$node = new BinaryNode( $op, $node, $this->parseAdditive() );
		}

		return $node;
	}

	/**
	 * Level 4: addition / subtraction, left-associative.
	 *
	 * @return NodeInterface
	 */
	private function parseAdditive(): NodeInterface {
		$node = $this->parseMultiplicative();
		while ( true ) {
			if ( null !== $this->match( Token::T_OP, '+' ) ) {
				$node = new BinaryNode( '+', $node, $this->parseMultiplicative() );
				continue;
			}
			if ( null !== $this->match( Token::T_OP, '-' ) ) {
				$node = new BinaryNode( '-', $node, $this->parseMultiplicative() );
				continue;
			}
			break;
		}
		return $node;
	}

	/**
	 * Level 5: multiplication / division, left-associative.
	 *
	 * @return NodeInterface
	 */
	private function parseMultiplicative(): NodeInterface {
		$node = $this->parseUnary();
		while ( true ) {
			if ( null !== $this->match( Token::T_OP, '*' ) ) {
				$node = new BinaryNode( '*', $node, $this->parseUnary() );
				continue;
			}
			if ( null !== $this->match( Token::T_OP, '/' ) ) {
				$node = new BinaryNode( '/', $node, $this->parseUnary() );
				continue;
			}
			break;
		}
		return $node;
	}

	/**
	 * Level 6: prefix unary + / - (right-associative via recursion).
	 *
	 * @return NodeInterface
	 */
	private function parseUnary(): NodeInterface {
		if ( null !== $this->match( Token::T_OP, '+' ) ) {
			return new UnaryNode( '+', $this->parseUnary() );
		}
		if ( null !== $this->match( Token::T_OP, '-' ) ) {
			return new UnaryNode( '-', $this->parseUnary() );
		}
		return $this->parsePrimary();
	}

	/**
	 * Level 7: primary — literal, variable, function call, or ( expr ).
	 *
	 * @return NodeInterface
	 * @throws EvaluationError On an unexpected token or bad function call.
	 */
	private function parsePrimary(): NodeInterface {
		$token = $this->current();

		// Numeric literal.
		if ( $token->is( Token::T_NUMBER ) ) {
			$this->advance();
			return new NumberNode( $token->getValue() );
		}

		// Variable placeholder.
		if ( $token->is( Token::T_VAR ) ) {
			$this->advance();
			return new VariableNode( (string) $token->getValue() );
		}

		// Identifier — must be a whitelisted function call.
		if ( $token->is( Token::T_IDENT ) ) {
			$this->advance();
			$name = strtolower( (string) $token->getValue() );

			if ( ! in_array( $name, self::FUNCTIONS, true ) ) {
				throw new EvaluationError( esc_html( 'Unknown function "' . $token->getValue() . '".' ) );
			}

			$this->expect( Token::T_LPAREN );

			$args = array();
			if ( null === $this->match( Token::T_RPAREN ) ) {
				$args[] = $this->parseOr();
				while ( null !== $this->match( Token::T_COMMA ) ) {
					$args[] = $this->parseOr();
				}
				$this->expect( Token::T_RPAREN );
			}

			return new FunctionNode( $name, $args );
		}

		// Parenthesised sub-expression.
		if ( null !== $this->match( Token::T_LPAREN ) ) {
			$node = $this->parseOr();
			$this->expect( Token::T_RPAREN );
			return $node;
		}

		throw new EvaluationError(
			esc_html( 'Unexpected token at position ' . $token->getPosition() . '.' )
		);
	}
}
