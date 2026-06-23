<?php
/**
 * Advanced expression engine (lex -> parse -> evaluate).
 *
 * Evaluates "advanced formula" expressions that support [variable]
 * placeholders, comparisons, logical operators and a fixed whitelist of
 * functions (if/abs/ceil/floor/round/pow/min/max).
 *
 * Security model:
 *   - No eval(), no create_function(), no variable-variables.
 *   - The lexer accepts only a fixed alphabet; the parser only emits the
 *     whitelisted function nodes; nodes never dispatch to PHP callables
 *     derived from input. All operations are pure arithmetic / logic.
 *
 * @package OptionSetBuilder\Formula\Ast
 */

namespace OptionSetBuilder\Formula\Ast;

defined( 'ABSPATH' ) || exit;

/**
 * Public facade over the lexer, parser and AST evaluator.
 */
final class ExpressionEngine {

	/**
	 * Evaluate an expression and return the normalised result.
	 *
	 * Pipeline: tokenize -> parse -> root->evaluate(). Numeric results are
	 * normalised so a whole float comes back as an int. Missing variables
	 * resolve to 0.
	 *
	 * @param string $expr Expression source.
	 * @param array  $vars Variable name => value map.
	 * @return mixed Int/float for numeric results, bool for pure conditions.
	 * @throws EvaluationError On lex/parse/eval failure.
	 */
	public function evaluate( string $expr, array $vars = array() ) {
		$tokens = ( new Lexer() )->tokenize( $expr );
		$root   = ( new Parser() )->parse( $tokens );

		$result = $root->evaluate( $this, $vars );

		if ( is_bool( $result ) ) {
			return $result;
		}
		if ( is_numeric( $result ) ) {
			return $this->normalizeNumber( $result );
		}

		return $result;
	}

	/**
	 * Soft-fail variant: returns 0 instead of throwing.
	 *
	 * @param string $expr Expression source.
	 * @param array  $vars Variable name => value map.
	 * @return mixed Result, or 0 on any EvaluationError.
	 */
	public function evaluateSafe( string $expr, array $vars = array() ) {
		try {
			return $this->evaluate( $expr, $vars );
		} catch ( EvaluationError $e ) {
			return 0;
		}
	}

	/**
	 * Normalise a numeric value: collapse whole floats to int.
	 *
	 * Uses a 1e-9 tolerance so float arithmetic like 0.1 + 0.2 does not
	 * accidentally appear "whole".
	 *
	 * @param mixed $value Numeric value.
	 * @return int|float
	 */
	public function normalizeNumber( $value ) {
		$num     = (float) $value;
		$rounded = round( $num );
		if ( abs( $num - $rounded ) < 1e-9 ) {
			return (int) $rounded;
		}
		return $num;
	}

	/**
	 * Coerce any value into a float for arithmetic.
	 *
	 * bool -> 1/0, null -> 0, numeric -> float, anything else -> 0.
	 *
	 * @param mixed $value Any value.
	 * @return float
	 */
	public function toNumber( $value ): float {
		if ( is_bool( $value ) ) {
			return $value ? 1.0 : 0.0;
		}
		if ( null === $value ) {
			return 0.0;
		}
		if ( is_numeric( $value ) ) {
			return (float) $value;
		}
		return 0.0;
	}

	/**
	 * Coerce any value into a boolean for logical operators.
	 *
	 * @param mixed $value Any value.
	 * @return bool
	 */
	public function toBool( $value ): bool {
		if ( is_bool( $value ) ) {
			return $value;
		}
		if ( is_numeric( $value ) ) {
			return 0.0 !== (float) $value;
		}
		return ! empty( $value );
	}

	/**
	 * Resolve a [name] placeholder from the context.
	 *
	 * Missing variables resolve to 0 by convention.
	 *
	 * @param string $name Placeholder name (without brackets).
	 * @param array  $ctx  Variable context.
	 * @return mixed
	 */
	public function getDynamic( string $name, array $ctx ) {
		return $ctx[ $name ] ?? 0;
	}
}
