<?php
/**
 * Expression lexer / tokenizer.
 *
 * Converts a raw expression string into a flat array of {@see Token}
 * objects. The lexer recognises a deliberately small, fixed alphabet so
 * the rest of the engine never has to inspect raw user input again.
 *
 * Grammar of the token stream:
 *   - Whitespace          : skipped.
 *   - Variable            : "[" .. "]" — any characters until the closing
 *                           bracket; trimmed; must be non-empty -> T_VAR.
 *   - Number              : 12 | 12.34 | .5 (single decimal point) -> T_NUMBER.
 *   - Identifier          : a run of ASCII letters; only used for the
 *                           whitelisted function names -> T_IDENT.
 *   - Two-char operators  : >= <= != ||
 *   - One-char operators  : + - * / > < = &
 *   - Punctuation         : ( ) ,
 *   - Anything else       : EvaluationError "Unexpected character".
 *
 * @package OptionSetBuilder\Formula\Ast
 */

namespace OptionSetBuilder\Formula\Ast;

defined( 'ABSPATH' ) || exit;

/**
 * Turns an expression string into a token stream.
 */
final class Lexer {

	/**
	 * Tokenize the source string.
	 *
	 * @param string $src Raw expression text.
	 * @return Token[] Token list terminated by a single T_EOF token.
	 * @throws EvaluationError When an unrecognised character is found.
	 */
	public function tokenize( string $src ): array {
		$tokens = array();
		$len    = strlen( $src );
		$i      = 0;

		while ( $i < $len ) {
			$ch = $src[ $i ];

			// 1. Skip whitespace.
			if ( ctype_space( $ch ) ) {
				++$i;
				continue;
			}

			// 2. Variable placeholder: [ ... ] (any chars until ]).
			if ( '[' === $ch ) {
				$start = $i;
				++$i;
				$name = '';
				while ( $i < $len && ']' !== $src[ $i ] ) {
					$name .= $src[ $i ];
					++$i;
				}
				if ( $i >= $len || ']' !== $src[ $i ] ) {
					throw new EvaluationError( esc_html( 'Unclosed variable placeholder at position ' . $start ) );
				}
				++$i; // Consume the closing ].
				$name = trim( $name );
				if ( '' === $name ) {
					throw new EvaluationError( esc_html( 'Empty variable placeholder at position ' . $start ) );
				}
				$tokens[] = new Token( Token::T_VAR, $name, $start );
				continue;
			}

			// 3. Number: 12, 12.34, .5 (at most one decimal point).
			if ( ctype_digit( $ch ) || '.' === $ch ) {
				$start  = $i;
				$number = '';
				$dots   = 0;
				while ( $i < $len ) {
					$c = $src[ $i ];
					if ( '.' === $c ) {
						++$dots;
						if ( $dots > 1 ) {
							break;
						}
						$number .= $c;
						++$i;
						continue;
					}
					if ( ctype_digit( $c ) ) {
						$number .= $c;
						++$i;
						continue;
					}
					break;
				}
				if ( '.' === $number || '' === $number ) {
					throw new EvaluationError( esc_html( 'Invalid number at position ' . $start ) );
				}
				$tokens[] = new Token( Token::T_NUMBER, (float) $number, $start );
				continue;
			}

			// 4. Identifier (function name): letters only.
			if ( ctype_alpha( $ch ) ) {
				$start = $i;
				$ident = '';
				while ( $i < $len && ctype_alpha( $src[ $i ] ) ) {
					$ident .= $src[ $i ];
					++$i;
				}
				$tokens[] = new Token( Token::T_IDENT, $ident, $start );
				continue;
			}

			// 5. Punctuation.
			if ( '(' === $ch ) {
				$tokens[] = new Token( Token::T_LPAREN, '(', $i );
				++$i;
				continue;
			}
			if ( ')' === $ch ) {
				$tokens[] = new Token( Token::T_RPAREN, ')', $i );
				++$i;
				continue;
			}
			if ( ',' === $ch ) {
				$tokens[] = new Token( Token::T_COMMA, ',', $i );
				++$i;
				continue;
			}

			// 6. Two-character operators take priority over one-char ones.
			$two = ( $i + 1 < $len ) ? $ch . $src[ $i + 1 ] : '';
			if ( '>=' === $two || '<=' === $two || '!=' === $two || '||' === $two ) {
				$tokens[] = new Token( Token::T_OP, $two, $i );
				$i       += 2;
				continue;
			}

			// 7. One-character operators.
			if ( false !== strpos( '+-*/><=&', $ch ) ) {
				$tokens[] = new Token( Token::T_OP, $ch, $i );
				++$i;
				continue;
			}

			// 8. Anything outside the fixed alphabet is rejected.
			throw new EvaluationError( esc_html( 'Unexpected character "' . $ch . '" at position ' . $i ) );
		}

		$tokens[] = new Token( Token::T_EOF, null, $len );
		return $tokens;
	}
}
