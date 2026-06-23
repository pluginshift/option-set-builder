/**
 * Left rail section navigation. Each item is a card-style button with an
 * accent icon tile, a label + sublabel, and a chevron that flips when the
 * section is active. Keyboard: native tab order plus Up/Down roving.
 *
 * @package
 */

import { useRef } from '@wordpress/element';
import classNames from 'classnames';
import { SECTIONS } from './config';

/**
 * SettingsNav.
 *
 * @param {Object}   props          Props.
 * @param {string}   props.active   Active section id.
 * @param {Function} props.onSelect (id) => void.
 * @return {JSX.Element} The nav.
 */
export default function SettingsNav( { active, onSelect } ) {
	const refs = useRef( [] );

	/**
	 * Up/Down arrow roving between items.
	 *
	 * @param {KeyboardEvent} e Key event.
	 * @param {number}        i Current index.
	 * @return {void}
	 */
	const onKeyDown = ( e, i ) => {
		let next = null;
		if ( e.key === 'ArrowDown' ) {
			next = ( i + 1 ) % SECTIONS.length;
		} else if ( e.key === 'ArrowUp' ) {
			next = ( i - 1 + SECTIONS.length ) % SECTIONS.length;
		}
		if ( next === null ) {
			return;
		}
		e.preventDefault();
		refs.current[ next ]?.focus();
		onSelect( SECTIONS[ next ].id );
	};

	return (
		<nav className="optset-set-nav" aria-label="Settings sections">
			<ul className="optset-set-nav__list">
				{ SECTIONS.map( ( s, i ) => {
					const isActive = s.id === active;
					return (
						<li key={ s.id }>
							<button
								type="button"
								ref={ ( el ) => ( refs.current[ i ] = el ) }
								className={ classNames( 'optset-set-nav__item', {
									'is-active': isActive,
								} ) }
								aria-current={ isActive ? 'true' : undefined }
								onClick={ () => onSelect( s.id ) }
								onKeyDown={ ( e ) => onKeyDown( e, i ) }
							>
								<span
									className={ classNames(
										'optset-set-tile',
										`optset-set-tile--${
											isActive ? 'violet' : 'neutral'
										}`
									) }
									aria-hidden="true"
								>
									<span
										className={ `dashicons dashicons-${ s.dashicon }` }
									/>
								</span>
								<span className="optset-set-nav__text">
									<span className="optset-set-nav__title">
										{ s.title }
									</span>
									<span className="optset-set-nav__sub">
										{ s.nav }
									</span>
								</span>
								<span
									className={ classNames(
										'dashicons',
										'optset-set-nav__chev',
										isActive
											? 'dashicons-arrow-down-alt2'
											: 'dashicons-arrow-right-alt2'
									) }
									aria-hidden="true"
								/>
							</button>
						</li>
					);
				} ) }
			</ul>
		</nav>
	);
}
