/**
 * Assignment screen — choose where an option set applies (all / specific
 * products / category / tag / brand / none), with async pickers, an
 * exclude list, and a resolved product-link preview.
 *
 * @package
 */

import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import * as api from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useToast } from '../store/ToastContext';
import { navigate } from '../app/router';
import { Panel, Field, AsyncSelect, SkeletonForm } from '../components';

/** Scope radio definitions. */
const SCOPES = [
	{
		value: 'all',
		label: __( 'All products', 'option-set-builder' ),
	},
	{
		value: 'products',
		label: __(
			'Specific products',
			'option-set-builder'
		),
	},
	{
		value: 'category',
		label: __(
			'Product category',
			'option-set-builder'
		),
	},
	{
		value: 'tag',
		label: __( 'Product tag', 'option-set-builder' ),
	},
	{
		value: 'brand',
		label: __( 'Product brand', 'option-set-builder' ),
	},
	{
		value: 'none',
		label: __(
			'None (disabled)',
			'option-set-builder'
		),
	},
];

/**
 * Assignment.
 *
 * @param {Object} props       Component props.
 * @param {string} props.setId Route set id.
 * @return {JSX.Element} The screen.
 */
export default function Assignment( { setId } ) {
	const { notify } = useToast();
	const [ status, setStatus ] = useState( 'loading' );
	const [ error, setError ] = useState( '' );
	const [ scope, setScope ] = useState( 'none' );
	const [ include, setInclude ] = useState( [] );
	const [ exclude, setExclude ] = useState( [] );
	const [ link, setLink ] = useState( {
		published: false,
		productLink: '',
	} );
	const [ saving, setSaving ] = useState( false );

	const numericId = parseInt( setId, 10 );
	const isNew = ! numericId || setId === 'new';

	useEffect( () => {
		if ( isNew ) {
			setStatus( 'ready' );
			return undefined;
		}
		let cancelled = false;
		api.getAssignment( numericId )
			.then( ( res ) => {
				if ( cancelled ) {
					return;
				}
				const a = res.assignment || {};
				setScope( a.scope || 'none' );
				setInclude( res.include || [] );
				setExclude( res.exclude || [] );
				setStatus( 'ready' );
			} )
			.catch( ( e ) => {
				if ( cancelled ) {
					return;
				}
				setError( errorMessage( e ) );
				setStatus( 'error' );
			} );
		return () => {
			cancelled = true;
		};
	}, [ numericId, isNew ] );

	// Refresh the resolved product link whenever the assignment changes.
	useEffect( () => {
		if ( isNew || status !== 'ready' ) {
			return;
		}
		api.productLink( numericId, {
			scope,
			include: include.map( ( i ) => i.id ),
			exclude: exclude.map( ( i ) => i.id ),
		} )
			.then( ( res ) =>
				setLink( {
					published: res.published,
					productLink: res.productLink,
				} )
			)
			.catch( () => setLink( { published: false, productLink: '' } ) );
	}, [ scope, include, exclude, numericId, isNew, status ] );

	const termKind =
		scope === 'category' || scope === 'tag' || scope === 'brand'
			? scope
			: null;

	/**
	 * Persist the assignment.
	 *
	 * @return {Promise<void>} Resolves after save.
	 */
	const onSave = async () => {
		setSaving( true );
		try {
			await api.saveAssignment( {
				set_id: numericId,
				scope,
				include: include.map( ( i ) => i.id ),
				exclude: exclude.map( ( i ) => i.id ),
				product_image: JSON.stringify( [] ),
			} );
			notify(
				__(
					'Assignment saved.',
					'option-set-builder'
				),
				'success'
			);
		} catch ( e ) {
			notify( errorMessage( e ), 'error' );
		} finally {
			setSaving( false );
		}
	};

	if ( isNew ) {
		return (
			<Panel
				title={ __(
					'Assignment',
					'option-set-builder'
				) }
			>
				<p className="optset-hint">
					{ __(
						'Save the option set first, then assign it to products.',
						'option-set-builder'
					) }
				</p>
				<button
					type="button"
					className="optset-btn optset-btn--ghost"
					onClick={ () => navigate( `/set/${ setId }` ) }
				>
					{ __(
						'Back to builder',
						'option-set-builder'
					) }
				</button>
			</Panel>
		);
	}

	return (
		<div className="optset-assignment">
			<header className="optset-screen-head">
				<div>
					<h1 className="optset-screen-title">
						{ __(
							'Assignment',
							'option-set-builder'
						) }
					</h1>
					<p className="optset-screen-sub">
						{ __(
							'Decide which products show this option set.',
							'option-set-builder'
						) }
					</p>
				</div>
				<div className="optset-screen-head__actions">
					<a
						className="optset-btn optset-btn--ghost"
						href={ `#/set/${ setId }` }
					>
						{ __(
							'Back to builder',
							'option-set-builder'
						) }
					</a>
					<button
						type="button"
						className="optset-btn optset-btn--primary"
						disabled={ saving || status !== 'ready' }
						onClick={ onSave }
					>
						{ saving
							? __(
									'Saving…',
									'option-set-builder'
							  )
							: __(
									'Save assignment',
									'option-set-builder'
							  ) }
					</button>
				</div>
			</header>

			{ status === 'loading' && (
				<Panel>
					<SkeletonForm fields={ 4 } />
				</Panel>
			) }
			{ status === 'error' && (
				<Panel>
					<p className="optset-error">{ error }</p>
				</Panel>
			) }

			{ status === 'ready' && (
				<>
					<Panel
						title={ __(
							'Scope',
							'option-set-builder'
						) }
					>
						<div className="optset-radio-grid">
							{ SCOPES.map( ( s ) => (
								<label
									key={ s.value }
									className={ `optset-radio-card${
										scope === s.value ? ' is-active' : ''
									}` }
								>
									<input
										type="radio"
										name="optset-scope"
										value={ s.value }
										checked={ scope === s.value }
										onChange={ () => setScope( s.value ) }
									/>
									<span>{ s.label }</span>
								</label>
							) ) }
						</div>
					</Panel>

					{ scope === 'products' && (
						<Panel
							title={ __(
								'Products',
								'option-set-builder'
							) }
						>
							<Field
								label={ __(
									'Include products',
									'option-set-builder'
								) }
							>
								<AsyncSelect
									value={ include }
									onChange={ setInclude }
									max={ 0 }
									fetcher={ async ( t ) => {
										const r = await api.searchProducts( t );
										return r.items;
									} }
								/>
							</Field>
						</Panel>
					) }

					{ termKind && (
						<Panel
							title={
								SCOPES.find( ( s ) => s.value === scope ).label
							}
						>
							<Field
								label={ __(
									'Terms',
									'option-set-builder'
								) }
							>
								<AsyncSelect
									value={ include }
									onChange={ setInclude }
									fetcher={ async ( t ) => {
										const r = await api.searchTerms(
											termKind,
											t
										);
										return r.items;
									} }
								/>
							</Field>
						</Panel>
					) }

					{ scope !== 'none' && (
						<Panel
							title={ __(
								'Exclusions',
								'option-set-builder'
							) }
						>
							<Field
								label={ __(
									'Exclude products',
									'option-set-builder'
								) }
								help={ __(
									'These products never show this option set.',
									'option-set-builder'
								) }
							>
								<AsyncSelect
									value={ exclude }
									onChange={ setExclude }
									fetcher={ async ( t ) => {
										const r = await api.searchProducts( t );
										return r.items;
									} }
								/>
							</Field>
						</Panel>
					) }

					<Panel
						title={ __(
							'Preview link',
							'option-set-builder'
						) }
					>
						{ ! link.published ? (
							<p className="optset-hint">
								{ __(
									'Publish the option set to preview it on a product.',
									'option-set-builder'
								) }
							</p>
						) : link.productLink ? (
							<a
								href={ link.productLink }
								target="_blank"
								rel="noreferrer"
								className="optset-btn optset-btn--ghost"
							>
								{ __(
									'Open a matching product',
									'option-set-builder'
								) }
							</a>
						) : (
							<p className="optset-hint">
								{ __(
									'No matching published product found yet.',
									'option-set-builder'
								) }
							</p>
						) }
					</Panel>
				</>
			) }
		</div>
	);
}
