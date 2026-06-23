<?php
/**
 * Lexical token value object for the expression engine.
 *
 * A token is the smallest meaningful unit produced by the lexer
 * (a number, variable, identifier, operator or punctuation mark).
 * Instances are treated as immutable: construct once, read via accessors.
 *
 * @package OptionSetBuilder\Formula\Ast
 */

namespace OptionSetBuilder\Formula\Ast;

defined( 'ABSPATH' ) || exit;

/**
 * Immutable token produced by {@see Lexer}.
 *
 * Token kinds are represented as integer constants so comparisons in the
 * parser are cheap and unambiguous.
 */
final class Token {

	/**
	 * Numeric literal (e.g. 12, 12.34, .5).
	 */
	public const T_NUMBER = 1;

	/**
	 * Dynamic variable placeholder written as [name].
	 */
	public const T_VAR = 2;

	/**
	 * Bare identifier (used exclusively for function names).
	 */
	public const T_IDENT = 3;

	/**
	 * Operator symbol (+ - * / > < >= <= != = & ||).
	 */
	public const T_OP = 4;

	/**
	 * Left parenthesis "(".
	 */
	public const T_LPAREN = 5;

	/**
	 * Right parenthesis ")".
	 */
	public const T_RPAREN = 6;

	/**
	 * Argument separator ",".
	 */
	public const T_COMMA = 7;

	/**
	 * End-of-input sentinel.
	 */
	public const T_EOF = 8;

	/**
	 * Token kind (one of the T_* constants).
	 *
	 * @var int
	 */
	private $type;

	/**
	 * Token payload (number value, variable/identifier name, operator text).
	 *
	 * @var mixed
	 */
	private $value;

	/**
	 * Zero-based character offset where the token started.
	 *
	 * @var int
	 */
	private $position;

	/**
	 * Build a token.
	 *
	 * @param int   $type     One of the T_* constants.
	 * @param mixed $value    Token payload.
	 * @param int   $position Source character offset.
	 */
	public function __construct( int $type, $value, int $position = 0 ) {
		$this->type     = $type;
		$this->value    = $value;
		$this->position = $position;
	}

	/**
	 * Token kind.
	 *
	 * @return int One of the T_* constants.
	 */
	public function getType(): int {
		return $this->type;
	}

	/**
	 * Token payload.
	 *
	 * @return mixed
	 */
	public function getValue() {
		return $this->value;
	}

	/**
	 * Source character offset where the token began.
	 *
	 * @return int
	 */
	public function getPosition(): int {
		return $this->position;
	}

	/**
	 * Convenience predicate: does this token have the given kind?
	 *
	 * @param int $type One of the T_* constants.
	 * @return bool
	 */
	public function is( int $type ): bool {
		return $this->type === $type;
	}
}
