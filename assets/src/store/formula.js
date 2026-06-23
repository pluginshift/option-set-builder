/**
 * Client-side formula evaluators — faithful ports of the PHP engines.
 *
 * - `simple`  : mirrors OptionSetBuilder\Formula\ArithmeticEvaluator ({{var}} + trailing
 *               percent sugar, four-function arithmetic, result clamped >= 0).
 * - `advanced`: mirrors OptionSetBuilder\Formula\Ast\ExpressionEngine ([var] placeholders,
 *               comparisons, logical &/||, whitelisted functions
 *               if/abs/ceil/floor/round/pow/min/max, precedence per the PHP
 *               recursive-descent parser).
 *
 * These exist only for the live storefront preview — the server recomputes
 * authoritatively from the raw selection on add-to-cart.
 *
 * @package
 */

/* -------------------------------------------------------------------------- */
/* Simple arithmetic evaluator (ArithmeticEvaluator)                          */
/* -------------------------------------------------------------------------- */

/**
 * Evaluate a parenthesis-free expression: * / first, then + - (LTR).
 *
 * @param {string} expr Flat expression.
 * @return {number} Result.
 */
function evaluateFlat( expr ) {
	const num = '(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+))';
	let work = expr;

	const mul = new RegExp( num + '([*/])' + num );
	let m = work.match( mul );
	while ( m ) {
		const left = parseFloat( m[ 1 ] );
		const right = parseFloat( m[ 3 ] );
		let value;
		if ( m[ 2 ] === '*' ) {
			value = left * right;
		} else {
			if ( right === 0 ) {
				throw new Error( 'Division by zero.' );
			}
			value = left / right;
		}
		work = spliceFirst( work, m[ 0 ], value );
		m = work.match( mul );
	}

	const add = new RegExp( num + '([+-])' + num );
	m = work.match( add );
	while ( m ) {
		const left = parseFloat( m[ 1 ] );
		const right = parseFloat( m[ 3 ] );
		const value = m[ 2 ] === '+' ? left + right : left - right;
		work = spliceFirst( work, m[ 0 ], value );
		m = work.match( add );
	}

	if ( ! isNumericString( work ) ) {
		throw new Error( 'Invalid expression result.' );
	}
	return parseFloat( work );
}

/**
 * Replace only the first occurrence of `search` in `haystack`.
 *
 * @param {string} haystack Source.
 * @param {string} search   Substring.
 * @param {number} value    Replacement number.
 * @return {string} Result.
 */
function spliceFirst( haystack, search, value ) {
	const at = haystack.indexOf( search );
	if ( at === -1 ) {
		return haystack;
	}
	return (
		haystack.slice( 0, at ) +
		numberToString( value ) +
		haystack.slice( at + search.length )
	);
}

/**
 * Render a float without exponent notation (mirrors %.14F + trim).
 *
 * @param {number} value Number.
 * @return {string} String form.
 */
function numberToString( value ) {
	let str = value.toFixed( 14 );
	str = str.replace( /0+$/, '' ).replace( /\.$/, '' );
	return str === '' || str === '-' ? '0' : str;
}

/**
 * Strict numeric-string test (PHP is_numeric parity for our alphabet).
 *
 * @param {string} str Candidate.
 * @return {boolean} True when fully numeric.
 */
function isNumericString( str ) {
	return /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test( str );
}

/**
 * Verify every "(" has a matching ")".
 *
 * @param {string} expr Sanitised expression.
 * @return {boolean} True when balanced.
 */
function balancedParens( expr ) {
	let depth = 0;
	for ( let i = 0; i < expr.length; i++ ) {
		if ( expr[ i ] === '(' ) {
			depth++;
		} else if ( expr[ i ] === ')' ) {
			depth--;
			if ( depth < 0 ) {
				return false;
			}
		}
	}
	return depth === 0;
}

/**
 * Evaluate the simple {{var}} arithmetic formula.
 *
 * @param {string} expression Raw formula.
 * @param {Object} vars       name => numeric value map.
 * @return {number} Result clamped to >= 0 (0 on any failure).
 */
export function evaluateSimple( expression, vars ) {
	try {
		let expr = String( expression == null ? '' : expression );
		const bag = vars || {};

		expr = expr.replace( /\{\{([a-zA-Z0-9_-]+)\}\}/g, ( _all, key ) => {
			const v = bag[ key ];
			return v !== undefined && v !== '' && v !== null
				? String( v )
				: '0';
		} );

		expr = expr.replace( /(\d+(?:\.\d+)?)%/g, '($1/100)' );
		expr = expr.replace( /\s+/g, '' );

		if ( expr === '' || ! /^[0-9+\-*/().]+$/.test( expr ) ) {
			return 0;
		}
		if ( ! balancedParens( expr ) ) {
			return 0;
		}

		// Collapse innermost parentheses repeatedly.
		let guard = 0;
		while ( expr.indexOf( '(' ) !== -1 && guard < 1000 ) {
			expr = expr.replace( /\(([^()]+)\)/g, ( _all, inner ) =>
				numberToString( evaluateFlat( inner ) )
			);
			guard++;
		}

		const result = evaluateFlat( expr );
		return isFinite( result ) && result >= 0 ? result : 0;
	} catch ( e ) {
		return 0;
	}
}

/* -------------------------------------------------------------------------- */
/* Advanced AST engine (ExpressionEngine / Lexer / Parser / Nodes)            */
/* -------------------------------------------------------------------------- */

const T_NUMBER = 1;
const T_VAR = 2;
const T_IDENT = 3;
const T_OP = 4;
const T_LPAREN = 5;
const T_RPAREN = 6;
const T_COMMA = 7;
const T_EOF = 8;

const FUNCTIONS = [
	'if',
	'abs',
	'ceil',
	'floor',
	'round',
	'pow',
	'min',
	'max',
];

/**
 * Coerce any value to a float for arithmetic (engine->toNumber parity).
 *
 * @param {*} value Value.
 * @return {number} Float.
 */
function toNum( value ) {
	if ( typeof value === 'boolean' ) {
		return value ? 1 : 0;
	}
	if ( value === null || value === undefined ) {
		return 0;
	}
	const n = parseFloat( value );
	return isFinite( n ) ? n : 0;
}

/**
 * Coerce any value to a boolean (engine->toBool parity).
 *
 * @param {*} value Value.
 * @return {boolean} Boolean.
 */
function toBool( value ) {
	if ( typeof value === 'boolean' ) {
		return value;
	}
	if ( value !== '' && isFinite( parseFloat( value ) ) ) {
		return parseFloat( value ) !== 0;
	}
	return !! value;
}

/**
 * Tokenize an advanced expression. Mirrors Ast\Lexer exactly.
 *
 * @param {string} src Source.
 * @return {Array<object>} Token list ending with a T_EOF token.
 */
function tokenize( src ) {
	const tokens = [];
	const len = src.length;
	let i = 0;

	const isSpace = ( c ) => /\s/.test( c );
	const isDigit = ( c ) => c >= '0' && c <= '9';
	const isAlpha = ( c ) => /[a-zA-Z]/.test( c );

	while ( i < len ) {
		const ch = src[ i ];

		if ( isSpace( ch ) ) {
			i++;
			continue;
		}

		if ( ch === '[' ) {
			const start = i;
			i++;
			let name = '';
			while ( i < len && src[ i ] !== ']' ) {
				name += src[ i ];
				i++;
			}
			if ( i >= len || src[ i ] !== ']' ) {
				throw new Error(
					'Unclosed variable placeholder at position ' + start
				);
			}
			i++;
			name = name.trim();
			if ( name === '' ) {
				throw new Error(
					'Empty variable placeholder at position ' + start
				);
			}
			tokens.push( { type: T_VAR, value: name, pos: start } );
			continue;
		}

		if ( isDigit( ch ) || ch === '.' ) {
			const start = i;
			let number = '';
			let dots = 0;
			while ( i < len ) {
				const c = src[ i ];
				if ( c === '.' ) {
					dots++;
					if ( dots > 1 ) {
						break;
					}
					number += c;
					i++;
					continue;
				}
				if ( isDigit( c ) ) {
					number += c;
					i++;
					continue;
				}
				break;
			}
			if ( number === '.' || number === '' ) {
				throw new Error( 'Invalid number at position ' + start );
			}
			tokens.push( {
				type: T_NUMBER,
				value: parseFloat( number ),
				pos: start,
			} );
			continue;
		}

		if ( isAlpha( ch ) ) {
			const start = i;
			let ident = '';
			while ( i < len && isAlpha( src[ i ] ) ) {
				ident += src[ i ];
				i++;
			}
			tokens.push( { type: T_IDENT, value: ident, pos: start } );
			continue;
		}

		if ( ch === '(' ) {
			tokens.push( { type: T_LPAREN, value: '(', pos: i } );
			i++;
			continue;
		}
		if ( ch === ')' ) {
			tokens.push( { type: T_RPAREN, value: ')', pos: i } );
			i++;
			continue;
		}
		if ( ch === ',' ) {
			tokens.push( { type: T_COMMA, value: ',', pos: i } );
			i++;
			continue;
		}

		const two = i + 1 < len ? ch + src[ i + 1 ] : '';
		if ( two === '>=' || two === '<=' || two === '!=' || two === '||' ) {
			tokens.push( { type: T_OP, value: two, pos: i } );
			i += 2;
			continue;
		}

		if ( '+-*/><=&'.indexOf( ch ) !== -1 ) {
			tokens.push( { type: T_OP, value: ch, pos: i } );
			i++;
			continue;
		}

		throw new Error( 'Unexpected character "' + ch + '" at position ' + i );
	}

	tokens.push( { type: T_EOF, value: null, pos: len } );
	return tokens;
}

/**
 * Recursive-descent parser producing evaluable closures.
 * Precedence mirrors Ast\Parser: || , & , comparisons , +- , * / , unary.
 *
 * @param {Array<object>} tokens Token list.
 * @return {Function} Root evaluator (ctx) => value.
 */
function parse( tokens ) {
	let pos = 0;

	const current = () => tokens[ pos ];
	const advance = () => tokens[ pos++ ];
	const match = ( type, value ) => {
		const tok = current();
		if ( tok.type !== type ) {
			return null;
		}
		if ( value !== undefined && value !== null && tok.value !== value ) {
			return null;
		}
		return advance();
	};
	const expect = ( type, value ) => {
		const tok = match( type, value );
		if ( tok === null ) {
			throw new Error(
				'Unexpected token at position ' + current().pos + '.'
			);
		}
		return tok;
	};

	const binary = ( op, left, right ) => ( ctx ) => {
		if ( op === '||' ) {
			return toBool( left( ctx ) ) || toBool( right( ctx ) );
		}
		if ( op === '&' ) {
			return toBool( left( ctx ) ) && toBool( right( ctx ) );
		}
		const ln = toNum( left( ctx ) );
		const rn = toNum( right( ctx ) );
		switch ( op ) {
			case '>':
				return ln > rn;
			case '<':
				return ln < rn;
			case '>=':
				return ln >= rn;
			case '<=':
				return ln <= rn;
			case '!=':
				/* eslint-disable-next-line eqeqeq */
				return ln != rn;
			case '=':
				/* eslint-disable-next-line eqeqeq */
				return ln == rn;
			case '+':
				return ln + rn;
			case '-':
				return ln - rn;
			case '*':
				return ln * rn;
			case '/':
				if ( rn === 0 ) {
					throw new Error( 'Division by zero.' );
				}
				return ln / rn;
			default:
				throw new Error( 'Unsupported operator: ' + op );
		}
	};

	const unary = ( op, operand ) => ( ctx ) => {
		const v = toNum( operand( ctx ) );
		if ( op === '+' ) {
			return +v;
		}
		if ( op === '-' ) {
			return -v;
		}
		throw new Error( 'Unsupported unary operator: ' + op );
	};

	function parseOr() {
		let node = parseAnd();
		while ( match( T_OP, '||' ) !== null ) {
			node = binary( '||', node, parseAnd() );
		}
		return node;
	}

	function parseAnd() {
		let node = parseComparison();
		while ( match( T_OP, '&' ) !== null ) {
			node = binary( '&', node, parseComparison() );
		}
		return node;
	}

	function parseComparison() {
		let node = parseAdditive();
		const ops = [ '>', '<', '>=', '<=', '!=', '=' ];
		while ( true ) {
			const tok = current();
			if ( tok.type !== T_OP || ops.indexOf( tok.value ) === -1 ) {
				break;
			}
			const op = String( tok.value );
			advance();
			node = binary( op, node, parseAdditive() );
		}
		return node;
	}

	function parseAdditive() {
		let node = parseMultiplicative();
		while ( true ) {
			if ( match( T_OP, '+' ) !== null ) {
				node = binary( '+', node, parseMultiplicative() );
				continue;
			}
			if ( match( T_OP, '-' ) !== null ) {
				node = binary( '-', node, parseMultiplicative() );
				continue;
			}
			break;
		}
		return node;
	}

	function parseMultiplicative() {
		let node = parseUnary();
		while ( true ) {
			if ( match( T_OP, '*' ) !== null ) {
				node = binary( '*', node, parseUnary() );
				continue;
			}
			if ( match( T_OP, '/' ) !== null ) {
				node = binary( '/', node, parseUnary() );
				continue;
			}
			break;
		}
		return node;
	}

	function parseUnary() {
		if ( match( T_OP, '+' ) !== null ) {
			return unary( '+', parseUnary() );
		}
		if ( match( T_OP, '-' ) !== null ) {
			return unary( '-', parseUnary() );
		}
		return parsePrimary();
	}

	function callFunction( name, argFns ) {
		return ( ctx ) => {
			const argc = argFns.length;
			if ( name === 'if' ) {
				if ( argc !== 3 ) {
					throw new Error( 'if() expects exactly 3 arguments.' );
				}
				return toBool( argFns[ 0 ]( ctx ) )
					? argFns[ 1 ]( ctx )
					: argFns[ 2 ]( ctx );
			}
			const v = argFns.map( ( fn ) => toNum( fn( ctx ) ) );
			switch ( name ) {
				case 'abs':
					if ( argc !== 1 ) {
						throw new Error( 'abs() expects exactly 1 argument.' );
					}
					return Math.abs( v[ 0 ] );
				case 'ceil':
					if ( argc !== 1 ) {
						throw new Error( 'ceil() expects exactly 1 argument.' );
					}
					return Math.ceil( v[ 0 ] );
				case 'floor':
					if ( argc !== 1 ) {
						throw new Error(
							'floor() expects exactly 1 argument.'
						);
					}
					return Math.floor( v[ 0 ] );
				case 'round': {
					if ( argc < 1 || argc > 2 ) {
						throw new Error( 'round() expects 1 or 2 arguments.' );
					}
					const p = argc === 2 ? Math.trunc( v[ 1 ] ) : 0;
					const f = Math.pow( 10, p );
					return Math.round( v[ 0 ] * f ) / f;
				}
				case 'pow':
					if ( argc !== 2 ) {
						throw new Error( 'pow() expects exactly 2 arguments.' );
					}
					return Math.pow( v[ 0 ], v[ 1 ] );
				case 'min':
					if ( argc < 1 ) {
						throw new Error( 'min() expects at least 1 argument.' );
					}
					return Math.min.apply( null, v );
				case 'max':
					if ( argc < 1 ) {
						throw new Error( 'max() expects at least 1 argument.' );
					}
					return Math.max.apply( null, v );
				default:
					throw new Error( 'Unknown function "' + name + '".' );
			}
		};
	}

	function parsePrimary() {
		const tok = current();

		if ( tok.type === T_NUMBER ) {
			advance();
			const val = tok.value;
			return () => val;
		}

		if ( tok.type === T_VAR ) {
			advance();
			const name = String( tok.value );
			return ( ctx ) => {
				const v = ctx && ctx[ name ];
				return v === undefined ? 0 : v;
			};
		}

		if ( tok.type === T_IDENT ) {
			advance();
			const name = String( tok.value ).toLowerCase();
			if ( FUNCTIONS.indexOf( name ) === -1 ) {
				throw new Error( 'Unknown function "' + tok.value + '".' );
			}
			expect( T_LPAREN );
			const args = [];
			if ( match( T_RPAREN ) === null ) {
				args.push( parseOr() );
				while ( match( T_COMMA ) !== null ) {
					args.push( parseOr() );
				}
				expect( T_RPAREN );
			}
			return callFunction( name, args );
		}

		if ( match( T_LPAREN ) !== null ) {
			const node = parseOr();
			expect( T_RPAREN );
			return node;
		}

		throw new Error( 'Unexpected token at position ' + tok.pos + '.' );
	}

	const root = parseOr();
	expect( T_EOF );
	return root;
}

/**
 * Normalise a numeric result (collapse whole floats), 1e-9 tolerance.
 *
 * @param {*} value Value.
 * @return {number} Normalised number.
 */
function normalizeNumber( value ) {
	const num = parseFloat( value );
	if ( ! isFinite( num ) ) {
		return 0;
	}
	const rounded = Math.round( num );
	if ( Math.abs( num - rounded ) < 1e-9 ) {
		return rounded;
	}
	return num;
}

/**
 * Evaluate an advanced AST expression (soft-fail → 0).
 *
 * @param {string} expression Source.
 * @param {Object} vars       [name] => value context.
 * @return {number} Numeric result (booleans become 1/0), 0 on failure.
 */
export function evaluateAdvanced( expression, vars ) {
	try {
		const tokens = tokenize(
			String( expression == null ? '' : expression )
		);
		const root = parse( tokens );
		const result = root( vars || {} );
		if ( typeof result === 'boolean' ) {
			return result ? 1 : 0;
		}
		if ( isFinite( parseFloat( result ) ) ) {
			return normalizeNumber( result );
		}
		return 0;
	} catch ( e ) {
		return 0;
	}
}

/**
 * Public facade: evaluate a formula by mode (mirrors the two PHP engines).
 *
 * @param {string} expr Expression text.
 * @param {Object} vars Variable map.
 * @param {string} mode 'simple' | 'advanced'.
 * @return {number} Numeric result, 0 on any failure.
 */
export function evaluateFormula( expr, vars, mode ) {
	return mode === 'advanced'
		? evaluateAdvanced( expr, vars )
		: evaluateSimple( expr, vars );
}
