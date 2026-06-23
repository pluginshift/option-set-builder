/**
 * Admin app entry point.
 *
 * Configures @wordpress/api-fetch (REST root + nonce), then mounts the
 * React tree into #optset-admin-root via createRoot. SCSS is imported here so
 * wp-scripts compiles it into admin.css alongside the bundle.
 *
 * @package
 */

import './styles/admin.scss';

import { createRoot } from '@wordpress/element';
import { bootstrapApi } from './api/client';
import App from './app/App';

bootstrapApi();

const mount = document.getElementById( 'optset-admin-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
