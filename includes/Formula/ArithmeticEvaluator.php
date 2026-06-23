<?php
/**
 * Simple arithmetic formula evaluator.
 *
 * Handles the "formula" pricing mode: {{placeholder}} substitution and a
 * trailing-percent sugar, then pure four-function arithmetic with
 * parentheses. There is no eval(); after substitution the input alphabet
 * is restricted to [0-9 + - * / ( ) . space], parentheses are resolved
 * recursively, then * and / (left to right), then + and - (left to
 * right). The final result is clamped to be non-negative.
 *
 * @package OptionSetBuilder\Formula
 */

namespace OptionSetBuilder\Formula;

use OptionSetBuilder\Formula\Ast\EvaluationError;

defined( 'ABSPATH' ) || exit;

/**
 * Evaluates basic arithmetic expressions with {{var}} and % support.
 */
final class ArithmeticEvaluator {

	/**
	 * Substitute placeholders, expand percents, then safely evaluate.
	 *
	 * @param string $expression Raw formula text.
	 * @param array  $vars       Placeholder name => numeric value map.
	 * @return float Result, clamped to >= 0 (non-numeric collapses to 0).
	 * @throws EvaluationError On invalid characters, unbalanced parens, or
	 *                         division by zero.
	 */
	public static function evaluate( string $expression, array $vars = array() ): float {
		// 1. Replace {{name}} placeholders with their numeric value.
		//    Missing or empty values become 0.
		$expression = preg_replace_callback(
			'/\{\{([a-zA-Z0-9_-]+)\}\}/',
			static function ( $matches ) use ( $vars ) {
				$key = $matches[1];
				return ( isset( $vars[ $key ] ) && '' !== $vars[ $key ] && null !== $vars[ $key ] )
					? (string) $vars[ $key ]
					: '0';
			},
			$expression
		);

		// 2. Expand "NUMBER%" sugar into "(NUMBER/100)".
		$expression = preg_replace( '/(\d+(?:\.\d+)?)%/', '($1/100)', (string) $expression );

		// 3. Strip whitespace for a tight alphabet check.
		$expression = preg_replace( '/\s+/', '', (string) $expression );

		// 4. Only arithmetic characters may remain.
		if ( '' === $expression || ! preg_match( '/^[0-9+\-*\/().]+$/', $expression ) ) {
			throw new EvaluationError( 'Invalid characters in expression.' );
		}

		// 5. Parentheses must be balanced.
		if ( ! self::hasBalancedParentheses( $expression ) ) {
			throw new EvaluationError( 'Unbalanced parentheses.' );
		}

		// 6. Resolve and evaluate.
		$result = self::resolve( $expression );

		// 7. Clamp: non-numeric -> 0, negative -> 0.
		return ( is_numeric( $result ) && $result >= 0 ) ? (float) $result : 0.0;
	}

	/**
	 * Soft-fail variant: returns 0.0 instead of throwing.
	 *
	 * @param string $expression Raw formula text.
	 * @param array  $vars       Placeholder name => numeric value map.
	 * @return float Result, or 0.0 on any EvaluationError.
	 */
	public static function evaluateSafe( string $expression, array $vars = array() ): float {
		try {
			return self::evaluate( $expression, $vars );
		} catch ( EvaluationError $e ) {
			return 0.0;
		}
	}

	/**
	 * Check that every "(" has a matching ")" and none close early.
	 *
	 * @param string $expression Sanitised expression.
	 * @return bool
	 */
	private static function hasBalancedParentheses( string $expression ): bool {
		$depth = 0;
		$len   = strlen( $expression );
		for ( $i = 0; $i < $len; $i++ ) {
			if ( '(' === $expression[ $i ] ) {
				++$depth;
			} elseif ( ')' === $expression[ $i ] ) {
				--$depth;
				if ( $depth < 0 ) {
					return false;
				}
			}
		}
		return 0 === $depth;
	}

	/**
	 * Recursively collapse the innermost parentheses, then evaluate the
	 * remaining flat expression.
	 *
	 * @param string $expression Sanitised expression.
	 * @return float
	 * @throws EvaluationError On division by zero or a malformed result.
	 */
	private static function resolve( string $expression ): float {
		// Repeatedly replace the innermost "( ... )" with its value.
		while ( false !== strpos( $expression, '(' ) ) {
			$expression = preg_replace_callback(
				'/\(([^()]+)\)/',
				static function ( $matches ) {
					return (string) self::evaluateFlat( $matches[1] );
				},
				$expression
			);
			if ( null === $expression ) {
				throw new EvaluationError( 'Malformed expression.' );
			}
		}

		return self::evaluateFlat( $expression );
	}

	/**
	 * Evaluate a parenthesis-free expression: * and / first (left to
	 * right), then + and - (left to right).
	 *
	 * @param string $expression Flat expression.
	 * @return float
	 * @throws EvaluationError On division by zero or a malformed result.
	 */
	private static function evaluateFlat( string $expression ): float {
		// A numeric operand: optional sign, then digits with optional
		// fraction, or a leading-dot fraction (.5).
		$num = '(-?(?:\d+(?:\.\d+)?|\.\d+))';

		// Multiplication and division, left to right.
		while ( preg_match( '/' . $num . '([*\/])' . $num . '/', $expression, $m ) ) {
			$left  = (float) $m[1];
			$right = (float) $m[3];

			if ( '*' === $m[2] ) {
				$value = $left * $right;
			} else {
				if ( 0.0 === $right ) {
					throw new EvaluationError( 'Division by zero.' );
				}
				$value = $left / $right;
			}

			$expression = self::spliceFirst( $expression, $m[0], $value );
		}

		// Addition and subtraction, left to right.
		while ( preg_match( '/' . $num . '([+\-])' . $num . '/', $expression, $m ) ) {
			$left  = (float) $m[1];
			$right = (float) $m[3];

			$value = ( '+' === $m[2] ) ? ( $left + $right ) : ( $left - $right );

			$expression = self::spliceFirst( $expression, $m[0], $value );
		}

		if ( ! is_numeric( $expression ) ) {
			throw new EvaluationError( 'Invalid expression result.' );
		}

		return (float) $expression;
	}

	/**
	 * Replace only the first occurrence of $search in $haystack.
	 *
	 * Using a positional splice (instead of str_replace) prevents an
	 * accidental match elsewhere in the string from being rewritten.
	 *
	 * @param string $haystack Source string.
	 * @param string $search   Substring to replace.
	 * @param float  $value    Replacement numeric value.
	 * @return string
	 */
	private static function spliceFirst( string $haystack, string $search, float $value ): string {
		$at = strpos( $haystack, $search );
		if ( false === $at ) {
			return $haystack;
		}
		return substr( $haystack, 0, $at )
			. self::numberToString( $value )
			. substr( $haystack, $at + strlen( $search ) );
	}

	/**
	 * Render a float back into the expression without exponent notation.
	 *
	 * @param float $value Numeric value.
	 * @return string
	 */
	private static function numberToString( float $value ): string {
		// 14 significant digits keeps precision while avoiding "1.0E+20".
		$str = rtrim( rtrim( sprintf( '%.14F', $value ), '0' ), '.' );
		return ( '' === $str || '-' === $str ) ? '0' : $str;
	}
}
