/**
 * Extends the default @wordpress/scripts webpack config with explicit,
 * named entry points and a fixed output directory (assets/build) so the
 * PHP side can resolve each bundle + its generated *.asset.php.
 */
const defaults = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
	...defaults,
	entry: {
		admin: path.resolve( process.cwd(), 'assets/src/admin/index.js' ),
		store: path.resolve( process.cwd(), 'assets/src/store/index.js' ),
	},
	output: {
		...defaults.output,
		path: path.resolve( process.cwd(), 'assets/build' ),
	},
};
