/**
 * Builder screen — a premium, visual product-options editor. A top bar
 * (title, view switch, status, save) sits above a centered product stage
 * where fields are built and previewed in place. Field creation happens in a
 * centered command-style picker; field settings live in a docked drawer.
 * Everything is scoped to a BuilderProvider for the route id.
 *
 * @package
 */

import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	ArrowLeft,
	Eye,
	Pencil,
	Palette,
	Target,
	AlertTriangle,
} from 'lucide-react';
import {
	BuilderProvider,
	useBuilder,
	hasAssignment,
} from '../store/BuilderContext';
import { useToast } from '../store/ToastContext';
import { navigate } from '../app/router';
import { errorMessage } from '../api/client';
import { Modal, SkeletonBuilder } from '../components';
import { useBuilderUI } from './builder/store/builderUi';
import { useGlobalStyle } from './builder/store/globalStyle';
import Canvas from './builder/canvas/Canvas';
import AssignmentModal from './builder/AssignmentModal';
import FieldPicker from './builder/picker/FieldPicker';
import SettingsDrawer from './builder/settings/SettingsDrawer';
import GlobalStylePanel from './builder/settings/GlobalStylePanel';

/**
 * The builder body (consumes BuilderContext).
 *
 * @return {JSX.Element} The editor.
 */
function Editor() {
	const builder = useBuilder();
	const { notify } = useToast();
	const { view, setView, closeSettings } = useBuilderUI();
	const openStyle = useGlobalStyle( ( s ) => s.openPanel );
	const loadStyle = useGlobalStyle( ( s ) => s.load );
	const [ showAssign, setShowAssign ] = useState( false );
	const [ showPublishWarn, setShowPublishWarn ] = useState( false );

	// Load the saved global style once so the canvas reflects it immediately.
	useEffect( () => {
		loadStyle();
	}, [ loadStyle ] );

	/** Open the Global Style panel, closing the field drawer so they don't stack. */
	const onOpenStyle = () => {
		closeSettings();
		builder.dispatch( { type: 'SELECT', id: null } );
		openStyle();
	};

	if ( builder.loading ) {
		return <SkeletonBuilder />;
	}

	if ( builder.loadError ) {
		return (
			<div className="optset-builder__loading">
				<p className="optset-error">{ builder.loadError }</p>
				<button
					type="button"
					className="optset-btn optset-btn--ghost"
					onClick={ () => navigate( '/sets' ) }
				>
					{ __(
						'Back to option sets',
						'option-set-builder'
					) }
				</button>
			</div>
		);
	}

	/**
	 * Persist the set and surface a toast.
	 *
	 * @param {Object} [overrides] Optional save overrides (e.g. { status }).
	 * @return {Promise<void>} Resolves after save.
	 */
	const persist = async ( overrides ) => {
		try {
			const id = await builder.save( overrides );
			notify(
				__(
					'Option set saved.',
					'option-set-builder'
				),
				'success'
			);
			if ( builder.id === 'new' && id ) {
				navigate( `/set/${ id }` );
			}
		} catch ( e ) {
			notify( errorMessage( e ), 'error' );
		}
	};

	/**
	 * Save — but block publishing a set that targets no products. Drafts may
	 * always be saved.
	 *
	 * @return {Promise<void>} Resolves after save (or after showing the guard).
	 */
	const onSave = async () => {
		if (
			builder.status === 'publish' &&
			! hasAssignment( builder.assignment )
		) {
			setShowPublishWarn( true );
			return;
		}
		await persist();
	};

	/** Resolve the publish guard by saving as a Draft instead. */
	const onSaveAsDraft = async () => {
		setShowPublishWarn( false );
		builder.dispatch( {
			type: 'SET_META',
			patch: { status: 'draft' },
		} );
		await persist( { status: 'draft' } );
	};

	const isPublished = builder.status === 'publish';

	return (
		<div className="optset-builder">
			<header className="optset-builder__topbar">
				<button
					type="button"
					className="optset-icon-btn"
					aria-label={ __(
						'Back',
						'option-set-builder'
					) }
					onClick={ () => navigate( '/sets' ) }
				>
					<ArrowLeft size={ 18 } />
				</button>

				<input
					type="text"
					className="optset-builder__title-input"
					value={ builder.title }
					placeholder={ __(
						'Untitled option set',
						'option-set-builder'
					) }
					onChange={ ( e ) =>
						builder.dispatch( {
							type: 'SET_META',
							patch: { title: e.target.value },
						} )
					}
				/>

				<div className="optset-builder__topbar-right">
					<div className="optset-segmented" role="tablist">
						<button
							type="button"
							role="tab"
							aria-selected={ view === 'build' }
							className={ view === 'build' ? 'is-active' : '' }
							onClick={ () => setView( 'build' ) }
						>
							<Pencil size={ 14 } />
							{ __(
								'Build',
								'option-set-builder'
							) }
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={ view === 'preview' }
							className={ view === 'preview' ? 'is-active' : '' }
							onClick={ () => setView( 'preview' ) }
						>
							<Eye size={ 14 } />
							{ __(
								'Preview',
								'option-set-builder'
							) }
						</button>
					</div>

					<label
						className="optset-status-toggle"
						htmlFor="optset-status-toggle"
					>
						<span className="optset-switch">
							<input
								id="optset-status-toggle"
								type="checkbox"
								className="optset-switch__input"
								checked={ isPublished }
								onChange={ ( e ) =>
									builder.dispatch( {
										type: 'SET_META',
										patch: {
											status: e.target.checked
												? 'publish'
												: 'draft',
										},
									} )
								}
							/>
							<span
								className="optset-switch__track"
								aria-hidden="true"
							/>
						</span>
						<span>
							{ isPublished
								? __(
										'Published',
										'option-set-builder'
								  )
								: __(
										'Draft',
										'option-set-builder'
								  ) }
						</span>
					</label>

					<button
						type="button"
						className="optset-btn optset-btn--ghost"
						onClick={ () => setShowAssign( true ) }
					>
						<Target size={ 15 } />
						{ __(
							'Assignment',
							'option-set-builder'
						) }
					</button>

					<button
						type="button"
						className="optset-btn optset-btn--ghost"
						onClick={ onOpenStyle }
					>
						<Palette size={ 15 } />
						{ __(
							'Global Style',
							'option-set-builder'
						) }
					</button>

					<button
						type="button"
						className="optset-btn optset-btn--primary"
						disabled={ builder.saving }
						onClick={ onSave }
					>
						{ builder.saving
							? __(
									'Saving…',
									'option-set-builder'
							  )
							: __(
									'Save',
									'option-set-builder'
							  ) }
					</button>
				</div>
			</header>

			<div className="optset-builder__stage-wrap">
				<Canvas />
			</div>

			<FieldPicker />
			<SettingsDrawer />
			<GlobalStylePanel />

			{ showAssign && (
				<AssignmentModal onClose={ () => setShowAssign( false ) } />
			) }

			{ showPublishWarn && (
				<Modal
					size="sm"
					title={ __(
						'Assignment required',
						'option-set-builder'
					) }
					onClose={ () => setShowPublishWarn( false ) }
					footer={
						<>
							<button
								type="button"
								className="optset-btn optset-btn--ghost"
								onClick={ onSaveAsDraft }
							>
								{ __(
									'Save as Draft',
									'option-set-builder'
								) }
							</button>
							<button
								type="button"
								className="optset-btn optset-btn--primary"
								onClick={ () => {
									setShowPublishWarn( false );
									setShowAssign( true );
								} }
							>
								<Target size={ 15 } />
								{ __(
									'Assign products',
									'option-set-builder'
								) }
							</button>
						</>
					}
				>
					<div className="optset-publish-warn">
						<span
							className="optset-publish-warn__icon"
							aria-hidden="true"
						>
							<AlertTriangle size={ 22 } />
						</span>
						<p className="optset-publish-warn__msg">
							{ __(
								"Please select at least one product to continue. To save without selecting any products, choose the 'Draft' status instead.",
								'option-set-builder'
							) }
						</p>
					</div>
				</Modal>
			) }
		</div>
	);
}

/**
 * Builder.
 *
 * @param {Object} props       Component props.
 * @param {string} props.setId Route id ("new" allowed).
 * @return {JSX.Element} The screen.
 */
export default function Builder( { setId } ) {
	return (
		<BuilderProvider setId={ setId || 'new' }>
			<Editor />
		</BuilderProvider>
	);
}
