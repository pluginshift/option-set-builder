<?php
/**
 * Upload directory + file relocation helpers.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Manages the plugin's private upload buckets:
 * uploads/optset_uploads/{temp,order_placed,order_completed} and uploads/optset_fonts.
 */
final class Upload {

	const BUCKETS = array( 'temp', 'order_placed', 'order_completed' );

	/**
	 * Absolute path for a bucket (creates it on first use).
	 *
	 * @param string $bucket One of self::BUCKETS or 'fonts'.
	 * @return string Trailing-slashed path.
	 */
	public static function dir( $bucket = 'temp' ) {
		$base = wp_upload_dir();
		$sub  = 'fonts' === $bucket ? 'optset_fonts' : 'optset_uploads/' . sanitize_file_name( $bucket );
		$path = trailingslashit( $base['basedir'] ) . $sub . '/';
		if ( ! is_dir( $path ) ) {
			wp_mkdir_p( $path );
		}
		return $path;
	}

	/**
	 * Public URL for a bucket.
	 *
	 * @param string $bucket Bucket name.
	 * @return string
	 */
	public static function url( $bucket = 'temp' ) {
		$base = wp_upload_dir();
		$sub  = 'fonts' === $bucket ? 'optset_fonts' : 'optset_uploads/' . sanitize_file_name( $bucket );
		return trailingslashit( $base['baseurl'] ) . $sub . '/';
	}

	/**
	 * Move/copy uploaded files between buckets (e.g. temp → order_placed).
	 *
	 * @param array  $files  List of {name,path} entries.
	 * @param string $to     Destination bucket.
	 * @param bool   $delete Delete source after move.
	 * @return array Updated list of {name,path}.
	 */
	public static function relocate( $files, $to = 'order_placed', $delete = true ) {
		$files = is_array( $files ) ? $files : array();
		$dest  = self::dir( $to );
		$out   = array();

		foreach ( $files as $file ) {
			$name = isset( $file['name'] ) ? basename( $file['name'] ) : '';
			$src  = isset( $file['path'] ) ? self::url_to_path( $file['path'] ) : '';
			if ( '' === $name || ! $src || ! is_file( $src ) ) {
				$out[] = $file;
				continue;
			}
			$target = $dest . wp_unique_filename( $dest, $name );
			if ( copy( $src, $target ) ) {
				if ( $delete ) {
					wp_delete_file( $src );
				}
				$out[] = array(
					'name' => $name,
					'path' => self::url( $to ) . basename( $target ),
				);
			} else {
				$out[] = $file;
			}
		}
		return $out;
	}

	/**
	 * Translate an uploads URL back to an absolute path.
	 *
	 * Defends against traversal: the resolved path is rejected (empty string
	 * returned) unless it provably resolves inside the uploads base directory.
	 * Callers feed this stored option/order-meta data, so a tampered value must
	 * never be able to point copy()/wp_delete_file() outside the uploads tree.
	 *
	 * @param string $url URL.
	 * @return string Absolute path, or '' if it escapes the uploads dir.
	 */
	public static function url_to_path( $url ) {
		$base    = wp_upload_dir();
		$basedir = (string) $base['basedir'];
		$url     = (string) $url;

		// Only map URLs that actually live under the uploads base URL.
		if ( '' === $url || 0 !== strpos( $url, (string) $base['baseurl'] ) ) {
			return '';
		}

		$path = str_replace( $base['baseurl'], $basedir, $url );

		// Reject any traversal sequences outright before touching the filesystem.
		if ( false !== strpos( $path, '..' ) ) {
			return '';
		}

		// When the target exists, confirm its real path is contained in basedir.
		$real = realpath( $path );
		if ( false !== $real ) {
			$real_base = realpath( $basedir );
			if ( false === $real_base || 0 !== strpos( $real, $real_base ) ) {
				return '';
			}
			return $real;
		}

		// Non-existent (e.g. about to be created): rely on the prefix + ".." guard.
		return $path;
	}
}
