<?php
/**
 * Uninstall routine — removes all plugin data.
 *
 * @package OptionSetBuilder
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

require_once __DIR__ . '/includes/Core/Uninstaller.php';

\OptionSetBuilder\Core\Uninstaller::purge();
