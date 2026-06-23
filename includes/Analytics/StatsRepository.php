<?php
/**
 * Statistics storage + aggregation.
 *
 * @package OptionSetBuilder
 */

namespace OptionSetBuilder\Analytics;

defined( 'ABSPATH' ) || exit;

/**
 * Owns the two analytics tables ({prefix}optset_stats per option set, and
 * {prefix}optset_stats_daily per calendar day) and the upsert/report logic
 * on top of them. Every metric write funnels through self::record(),
 * which is wired to the `optset_stats_record` action by the Plugin bootstrap.
 *
 * All SQL is built with $wpdb->prepare(); metric/column names are never
 * interpolated raw — they are validated against METRICS first.
 */
final class StatsRepository {

	/**
	 * Whitelisted metric columns shared by both tables.
	 *
	 * @var string[]
	 */
	const METRICS = array( 'impressions', 'clicks', 'add_to_cart', 'orders', 'revenue' );

	/**
	 * Per-option-set aggregate table (without prefix).
	 *
	 * @var string
	 */
	const TABLE = 'optset_stats';

	/**
	 * Per-day aggregate table (without prefix).
	 *
	 * @var string
	 */
	const TABLE_DAILY = 'optset_stats_daily';

	/**
	 * Fully-qualified set-aggregate table name.
	 *
	 * @return string
	 */
	private static function table_name() {
		global $wpdb;
		return $wpdb->prefix . self::TABLE;
	}

	/**
	 * Fully-qualified daily table name.
	 *
	 * @return string
	 */
	private static function daily_table_name() {
		global $wpdb;
		return $wpdb->prefix . self::TABLE_DAILY;
	}

	/**
	 * Create (or upgrade) both analytics tables via dbDelta.
	 *
	 * Safe to call repeatedly — dbDelta is idempotent.
	 *
	 * @return void
	 */
	public static function install_tables() {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();
		$stats           = self::table_name();
		$daily           = self::daily_table_name();

		$sql_stats = "CREATE TABLE {$stats} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			set_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			impressions INT(11) NOT NULL DEFAULT 0,
			clicks INT(11) NOT NULL DEFAULT 0,
			add_to_cart INT(11) NOT NULL DEFAULT 0,
			orders INT(11) NOT NULL DEFAULT 0,
			revenue DOUBLE NOT NULL DEFAULT 0,
			PRIMARY KEY  (id),
			KEY set_id (set_id)
		) {$charset_collate};";

		$sql_daily = "CREATE TABLE {$daily} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			day DATE NOT NULL,
			impressions INT(11) NOT NULL DEFAULT 0,
			clicks INT(11) NOT NULL DEFAULT 0,
			add_to_cart INT(11) NOT NULL DEFAULT 0,
			orders INT(11) NOT NULL DEFAULT 0,
			revenue DOUBLE NOT NULL DEFAULT 0,
			PRIMARY KEY  (id),
			KEY day (day)
		) {$charset_collate};";

		dbDelta( $sql_stats );
		dbDelta( $sql_daily );
	}

	/**
	 * Validate a metric name against the whitelist.
	 *
	 * @param string $metric Candidate metric.
	 * @return string|false Sanitized metric or false when unknown.
	 */
	private static function valid_metric( $metric ) {
		$metric = is_string( $metric ) ? strtolower( trim( $metric ) ) : '';
		return in_array( $metric, self::METRICS, true ) ? $metric : false;
	}

	/**
	 * Whether a table currently exists.
	 *
	 * @param string $table Fully-qualified table name.
	 * @return bool
	 */
	private static function table_exists( $table ) {
		global $wpdb;
		$found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		return $found === $table;
	}

	/**
	 * Record a metric for an option set (and mirror it onto today's daily row).
	 *
	 * - `revenue` accumulates as a float, by $amount.
	 * - Any other metric increments by 1, or by (int) $amount when $amount > 0.
	 *
	 * @param int        $set_id Option-set post id.
	 * @param string     $metric One of self::METRICS.
	 * @param int|float  $amount Increment / revenue delta.
	 * @return void
	 */
	public function record( $set_id, $metric, $amount = 0 ) {
		global $wpdb;

		$metric = self::valid_metric( $metric );
		if ( false === $metric ) {
			return;
		}

		$set_id = absint( $set_id );
		$table  = self::table_name();
		$daily  = self::daily_table_name();

		// Auto-heal missing tables (e.g. dropped manually / failed activation).
		if ( ! self::table_exists( $table ) || ! self::table_exists( $daily ) ) {
			self::install_tables();
		}

		$is_revenue = ( 'revenue' === $metric );
		$amount_f   = (float) $amount;
		$amount_i   = (int) $amount;

		if ( $is_revenue ) {
			$delta = $amount_f;
		} else {
			$delta = $amount_i > 0 ? $amount_i : 1;
		}

		$this->upsert_set_row( $set_id, $metric, $delta, $is_revenue );
		$this->upsert_daily_row( $metric, $delta, $is_revenue );
	}

	/**
	 * Upsert the per-set aggregate row.
	 *
	 * @param int       $set_id     Option-set id.
	 * @param string    $metric     Validated column name.
	 * @param int|float $delta      Amount to add.
	 * @param bool      $is_revenue Whether the column is the float revenue column.
	 * @return void
	 */
	private function upsert_set_row( $set_id, $metric, $delta, $is_revenue ) {
		global $wpdb;

		$table = self::table_name();

		// Table and column names are passed through prepare()'s %i identifier
		// placeholder (WP 6.2+); $metric is additionally whitelisted by
		// self::valid_metric(). Direct writes to a custom analytics table —
		// nothing to cache on write.
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT id, %i AS val FROM %i WHERE set_id = %d',
				$metric,
				$table,
				$set_id
			),
			ARRAY_A
		);

		if ( $row ) {
			if ( $is_revenue ) {
				$new = (float) $row['val'] + (float) $delta;
				$wpdb->query(
					$wpdb->prepare(
						'UPDATE %i SET %i = %f WHERE id = %d',
						$table,
						$metric,
						$new,
						(int) $row['id']
					)
				);
			} else {
				$new = (int) $row['val'] + (int) $delta;
				$wpdb->query(
					$wpdb->prepare(
						'UPDATE %i SET %i = %d WHERE id = %d',
						$table,
						$metric,
						$new,
						(int) $row['id']
					)
				);
			}
		} elseif ( $is_revenue ) {
			$wpdb->query(
				$wpdb->prepare(
					'INSERT INTO %i (set_id, %i) VALUES (%d, %f)',
					$table,
					$metric,
					$set_id,
					(float) $delta
				)
			);
		} else {
			$wpdb->query(
				$wpdb->prepare(
					'INSERT INTO %i (set_id, %i) VALUES (%d, %d)',
					$table,
					$metric,
					$set_id,
					(int) $delta
				)
			);
		}
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
	}

	/**
	 * Upsert today's per-day aggregate row.
	 *
	 * @param string    $metric     Validated column name.
	 * @param int|float $delta      Amount to add.
	 * @param bool      $is_revenue Whether the column is the float revenue column.
	 * @return void
	 */
	private function upsert_daily_row( $metric, $delta, $is_revenue ) {
		global $wpdb;

		$table = self::daily_table_name();
		$day   = current_time( 'Y-m-d' );

		// Table and column names are passed through prepare()'s %i identifier
		// placeholder (WP 6.2+); $metric is additionally whitelisted by
		// self::valid_metric(). Direct writes to a custom analytics table —
		// nothing to cache on write.
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT id, %i AS val FROM %i WHERE day = %s',
				$metric,
				$table,
				$day
			),
			ARRAY_A
		);

		if ( $row ) {
			if ( $is_revenue ) {
				$new = (float) $row['val'] + (float) $delta;
				$wpdb->query(
					$wpdb->prepare(
						'UPDATE %i SET %i = %f WHERE id = %d',
						$table,
						$metric,
						$new,
						(int) $row['id']
					)
				);
			} else {
				$new = (int) $row['val'] + (int) $delta;
				$wpdb->query(
					$wpdb->prepare(
						'UPDATE %i SET %i = %d WHERE id = %d',
						$table,
						$metric,
						$new,
						(int) $row['id']
					)
				);
			}
		} elseif ( $is_revenue ) {
			$wpdb->query(
				$wpdb->prepare(
					'INSERT INTO %i (day, %i) VALUES (%s, %f)',
					$table,
					$metric,
					$day,
					(float) $delta
				)
			);
		} else {
			$wpdb->query(
				$wpdb->prepare(
					'INSERT INTO %i (day, %i) VALUES (%s, %d)',
					$table,
					$metric,
					$day,
					(int) $delta
				)
			);
		}
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
	}

	/**
	 * Per-option-set report rows, joined with the set title and with derived
	 * conversion ratios (CTR and add-to-cart rate).
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public function table() {
		global $wpdb;

		$table = self::table_name();

		if ( ! self::table_exists( $table ) ) {
			return array();
		}

		// Table name via prepare()'s %i identifier placeholder (WP 6.2+); columns
		// are literal. Direct read from a custom analytics table.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT set_id, impressions, clicks, add_to_cart, orders, revenue FROM %i ORDER BY revenue DESC, orders DESC',
				$table
			),
			ARRAY_A
		);

		if ( empty( $rows ) || ! is_array( $rows ) ) {
			return array();
		}

		$out = array();
		foreach ( $rows as $row ) {
			$impressions = (int) $row['impressions'];
			$clicks      = (int) $row['clicks'];
			$atc         = (int) $row['add_to_cart'];

			$ctr      = $impressions > 0 ? round( ( $clicks / $impressions ) * 100, 2 ) : 0.0;
			$atc_rate = $impressions > 0 ? round( ( $atc / $impressions ) * 100, 2 ) : 0.0;

			$out[] = array(
				'set_id'      => (int) $row['set_id'],
				'title'       => get_the_title( (int) $row['set_id'] ),
				'impressions' => $impressions,
				'clicks'      => $clicks,
				'add_to_cart' => $atc,
				'orders'      => (int) $row['orders'],
				'revenue'     => (float) $row['revenue'],
				'ctr'         => $ctr,
				'atc_rate'    => $atc_rate,
			);
		}

		return $out;
	}

	/**
	 * Per-day report rows, optionally constrained to a date range.
	 *
	 * The optional $search accepts an inclusive range token in the form
	 * `YYYY-MM-DD..YYYY-MM-DD` (or a single `YYYY-MM-DD`). Anything else
	 * is ignored and the full series is returned.
	 *
	 * @param string $search Optional date-range token.
	 * @return array<int,array<string,mixed>>
	 */
	public function daily( string $search = '' ) {
		global $wpdb;

		$table = self::daily_table_name();

		if ( ! self::table_exists( $table ) ) {
			return array();
		}

		$from = '';
		$to   = '';

		$search = trim( $search );
		if ( '' !== $search ) {
			if ( false !== strpos( $search, '..' ) ) {
				list( $a, $b ) = array_pad( explode( '..', $search, 2 ), 2, '' );
				$from          = self::sanitize_date( $a );
				$to            = self::sanitize_date( $b );
			} else {
				$from = self::sanitize_date( $search );
				$to   = $from;
			}
		}

		// Table name via prepare()'s %i identifier placeholder (WP 6.2+); columns
		// are literal. Direct read from a custom analytics table.
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( '' !== $from && '' !== $to ) {
			$rows = $wpdb->get_results(
				$wpdb->prepare(
					'SELECT day, impressions, clicks, add_to_cart, orders, revenue FROM %i WHERE day BETWEEN %s AND %s ORDER BY day ASC',
					$table,
					$from,
					$to
				),
				ARRAY_A
			);
		} else {
			$rows = $wpdb->get_results(
				$wpdb->prepare(
					'SELECT day, impressions, clicks, add_to_cart, orders, revenue FROM %i ORDER BY day ASC',
					$table
				),
				ARRAY_A
			);
		}
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

		if ( empty( $rows ) || ! is_array( $rows ) ) {
			return array();
		}

		$out = array();
		foreach ( $rows as $row ) {
			$out[] = array(
				'day'         => (string) $row['day'],
				'impressions' => (int) $row['impressions'],
				'clicks'      => (int) $row['clicks'],
				'add_to_cart' => (int) $row['add_to_cart'],
				'orders'      => (int) $row['orders'],
				'revenue'     => (float) $row['revenue'],
			);
		}

		return $out;
	}

	/**
	 * Normalize a candidate date string to Y-m-d or empty.
	 *
	 * @param string $value Raw token segment.
	 * @return string
	 */
	private static function sanitize_date( $value ) {
		$value = trim( (string) $value );
		if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) {
			return $value;
		}
		return '';
	}
}
