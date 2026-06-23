<?php
/**
 * Tiny service container.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Minimal lazy singleton container. Services are registered as factory
 * closures and instantiated on first access, then cached.
 */
final class Container {

	/**
	 * Factory closures keyed by id.
	 *
	 * @var array<string,callable>
	 */
	private $factories = array();

	/**
	 * Resolved instances.
	 *
	 * @var array<string,object>
	 */
	private $resolved = array();

	/**
	 * Register a service factory.
	 *
	 * @param string   $id      Service id.
	 * @param callable $factory Factory receiving the container.
	 * @return void
	 */
	public function set( $id, callable $factory ) {
		$this->factories[ $id ] = $factory;
	}

	/**
	 * Resolve a service (singleton per container).
	 *
	 * @param string $id Service id.
	 * @return object|null
	 */
	public function get( $id ) {
		if ( isset( $this->resolved[ $id ] ) ) {
			return $this->resolved[ $id ];
		}
		if ( ! isset( $this->factories[ $id ] ) ) {
			return null;
		}
		$this->resolved[ $id ] = call_user_func( $this->factories[ $id ], $this );
		return $this->resolved[ $id ];
	}

	/**
	 * Whether a service is registered.
	 *
	 * @param string $id Service id.
	 * @return bool
	 */
	public function has( $id ) {
		return isset( $this->factories[ $id ] );
	}
}
