/**
 * Compact circular gauge used in the option table (Cart Rate / Conversion).
 * Percentage label sits beside the ring, mirroring the reference layout.
 *
 * @package
 */

const SIZE = 38;
const STROKE = 4;
const R = ( SIZE - STROKE ) / 2;
const C = 2 * Math.PI * R;

/**
 * Ring.
 *
 * @param {Object} props          Component props.
 * @param {number} props.value    Percentage 0–100.
 * @param {string} props.tone     blue|purple|green|pink.
 * @param {string} [props.suffix] Trailing unit (default "%").
 * @return {JSX.Element} The gauge.
 */
export default function Ring( { value, tone, suffix = '%' } ) {
	const pct = Math.max( 0, Math.min( 100, Number( value ) || 0 ) );
	const dash = ( pct / 100 ) * C;

	return (
		<span className="optset-an-ring">
			<svg
				viewBox={ `0 0 ${ SIZE } ${ SIZE }` }
				className="optset-an-ring__svg"
				aria-hidden="true"
			>
				<circle
					cx={ SIZE / 2 }
					cy={ SIZE / 2 }
					r={ R }
					fill="none"
					strokeWidth={ STROKE }
					className="optset-an-ring__track"
				/>
				<circle
					cx={ SIZE / 2 }
					cy={ SIZE / 2 }
					r={ R }
					fill="none"
					strokeWidth={ STROKE }
					strokeLinecap="round"
					strokeDasharray={ `${ dash } ${ C - dash }` }
					transform={ `rotate(-90 ${ SIZE / 2 } ${ SIZE / 2 })` }
					className={ `optset-an-ring__bar optset-an-ring__bar--${ tone }` }
				/>
			</svg>
			<span className="optset-an-ring__label">
				{ pct }
				{ suffix }
			</span>
		</span>
	);
}
