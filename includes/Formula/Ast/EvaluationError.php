<?php
/**
 * Exception raised for any lexing, parsing or evaluation failure.
 *
 * @package OptionSetBuilder\Formula\Ast
 */

namespace OptionSetBuilder\Formula\Ast;

defined( 'ABSPATH' ) || exit;

/**
 * Thrown when an expression cannot be tokenized, parsed, or evaluated.
 *
 * Callers that want soft-fail behaviour should use the *Safe() helpers,
 * which catch this type and return 0.
 */
final class EvaluationError extends \Exception {
}
