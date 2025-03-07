/**
 * @jest-environment jsdom
 */
import config from '@automattic/calypso-config';
import { PLAN_MIGRATION_TRIAL_MONTHLY } from '@automattic/calypso-products';
import { isCurrentUserLoggedIn } from '@automattic/data-stores/src/user/selectors';
import { waitFor } from '@testing-library/react';
import nock from 'nock';
import { HOSTING_INTENT_MIGRATE } from 'calypso/data/hosting/use-add-hosting-trial-mutation';
import { useIsSiteAdmin } from 'calypso/landing/stepper/hooks/use-is-site-admin';
import { triggerGuidesForStep } from 'calypso/lib/guides/trigger-guides-for-step';
import { addQueryArgs } from '../../../../lib/url';
import { HOW_TO_MIGRATE_OPTIONS } from '../../constants';
import { goToCheckout } from '../../utils/checkout';
import { STEPS } from '../internals/steps';
import siteMigrationFlow from '../site-migration-flow';
import { getAssertionConditionResult, getFlowLocation, renderFlow } from './helpers';
// we need to save the original object for later to not affect tests from other files
const originalLocation = window.location;

jest.mock( '../../utils/checkout' );
jest.mock( '@automattic/data-stores/src/user/selectors' );
jest.mock( 'calypso/landing/stepper/hooks/use-is-site-admin' );
jest.mock( 'calypso/lib/guides/trigger-guides-for-step', () => ( {
	triggerGuidesForStep: jest.fn(),
} ) );

describe( 'Site Migration Flow', () => {
	beforeAll( () => {
		Object.defineProperty( window, 'location', {
			value: { ...originalLocation, assign: jest.fn() },
		} );
	} );

	afterAll( () => {
		Object.defineProperty( window, 'location', originalLocation );
	} );

	beforeEach( () => {
		( window.location.assign as jest.Mock ).mockClear();
		( isCurrentUserLoggedIn as jest.Mock ).mockReturnValue( true );
		( useIsSiteAdmin as jest.Mock ).mockReturnValue( {
			isAdmin: true,
		} );

		const apiBaseUrl = 'https://public-api.wordpress.com';
		const testSettingsEndpoint = '/rest/v1.4/sites/example.wordpress.com/settings';
		nock( apiBaseUrl ).get( testSettingsEndpoint ).reply( 200, {} );
		nock( apiBaseUrl ).post( testSettingsEndpoint ).reply( 200, {} );
		nock( apiBaseUrl ).post( '/wpcom/v2/guides/trigger' ).reply( 200, {} );
	} );

	afterEach( () => {
		// Restore the original implementation after each test
		jest.restoreAllMocks();
	} );

	describe( 'useAssertConditions', () => {
		it( 'redirects the user to home when there is not siteSlug and SiteID', () => {
			const { runUseAssertionCondition } = renderFlow( siteMigrationFlow );

			runUseAssertionCondition( {
				currentStep: STEPS.SITE_MIGRATION_IDENTIFY.slug,
				currentURL: `/setup/${ STEPS.SITE_MIGRATION_IDENTIFY.slug }?siteSlug=&siteId=`,
			} );

			expect( window.location.assign ).toHaveBeenCalledWith( '/' );
		} );

		it( 'redirects the user to the start page when the user is not the site admin', () => {
			const { runUseAssertionCondition } = renderFlow( siteMigrationFlow );
			( useIsSiteAdmin as jest.Mock ).mockReturnValue( { isAdmin: false } );

			runUseAssertionCondition( {
				currentStep: STEPS.SITE_MIGRATION_IDENTIFY.slug,
			} );

			expect( window.location.assign ).toHaveBeenCalledWith( '/start' );
		} );

		it( 'renders the step with success', () => {
			const { runUseAssertionCondition } = renderFlow( siteMigrationFlow );

			runUseAssertionCondition( {
				currentStep: STEPS.SITE_MIGRATION_IDENTIFY.slug,
			} );

			expect( getAssertionConditionResult() ).toEqual( { state: 'success' } );
		} );
	} );

	describe( 'navigation', () => {
		beforeEach( () => {
			nock( 'https://public-api.wordpress.com' )
				.post( '/wpcom/v2/guides/trigger', {
					flow: 'site-migration',
					step: 'site-migration-identify',
				} )
				.reply( 200, { success: true } );

			nock( 'https://public-api.wordpress.com' )
				.post( '/wpcom/v2/guides/trigger', {
					flow: 'site-migration',
					step: 'site-migration-import-or-migrate',
				} )
				.reply( 200, { success: true } );

			nock( 'https://public-api.wordpress.com' )
				.post( '/wpcom/v2/guides/trigger', {
					flow: 'site-migration',
					step: 'site-migration-upgrade-plan',
				} )
				.reply( 200, { success: true } );

			nock( 'https://public-api.wordpress.com' )
				.post( '/wpcom/v2/guides/trigger', {
					flow: 'site-migration',
					step: 'site-migration-assign-trial-plan',
				} )
				.reply( 200, { success: true } );
		} );

		it( 'redirects the user to the migrate or import page when the platform is wordpress', async () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_IDENTIFY.slug,
				dependencies: {
					action: 'continue',
					platform: 'wordpress',
					from: 'https://site-to-be-migrated.com',
				},
			} );

			await waitFor( () => {
				expect( getFlowLocation() ).toEqual( {
					path: `/${ STEPS.SITE_MIGRATION_IMPORT_OR_MIGRATE.slug }?from=https%3A%2F%2Fsite-to-be-migrated.com&siteSlug=example.wordpress.com`,
					state: null,
				} );
			} );
		} );

		it( 'redirects the user to the import content flow when was not possible to indentify the platform', async () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );
			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_IDENTIFY.slug,
				dependencies: {
					action: 'continue',
					platform: 'unknown',
					from: 'https://example-to-be-migrated.com',
				},
			} );

			await waitFor( () => {
				expect( window.location.assign ).toHaveBeenCalledWith(
					addQueryArgs(
						{
							siteSlug: 'example.wordpress.com',
							from: 'https://example-to-be-migrated.com',
							origin: 'site-migration-identify',
							backToFlow: '/site-migration/site-migration-identify',
						},
						'/setup/site-setup/importList'
					)
				);
			} );
		} );

		it( 'redirects the user to the import content flow when the user skip the plaform identification', async () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );
			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_IDENTIFY.slug,
				dependencies: {
					action: 'skip_platform_identification',
				},
			} );

			await waitFor( () => {
				expect( window.location.assign ).toHaveBeenCalledWith(
					addQueryArgs(
						{
							siteSlug: 'example.wordpress.com',
							origin: 'site-migration-identify',
							backToFlow: '/site-migration/site-migration-identify',
						},
						'/setup/site-setup/importList'
					)
				);
			} );
		} );

		it( 'migrate redirects from the import-from page to how-to-migrate page', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_IMPORT_OR_MIGRATE.slug,
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_HOW_TO_MIGRATE.slug }`,
				state: {
					siteSlug: 'example.wordpress.com',
				},
			} );
		} );

		it( 'migrate redirects from the how-to-migrate (myself) page page to instructions page', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_HOW_TO_MIGRATE.slug,
				dependencies: {
					destination: 'migrate',
					how: 'myself',
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_INSTRUCTIONS.slug }`,
				state: {
					siteSlug: 'example.wordpress.com',
				},
			} );
		} );

		it( 'migrate redirects from the how-to-migrate (do it for me) page to assisted migration page', () => {
			config.disable( 'automated-migration/collect-credentials' );
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_HOW_TO_MIGRATE.slug,
				dependencies: {
					destination: 'migrate',
					how: HOW_TO_MIGRATE_OPTIONS.DO_IT_FOR_ME,
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_ASSISTED_MIGRATION.slug }`,
				state: {
					siteSlug: 'example.wordpress.com',
				},
			} );
			config.enable( 'automated-migration/collect-credentials' );
		} );

		it( 'migrate redirects from the how-to-migrate (do it for me) page to credential collection step', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_HOW_TO_MIGRATE.slug,
				dependencies: {
					destination: 'migrate',
					how: HOW_TO_MIGRATE_OPTIONS.DO_IT_FOR_ME,
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_CREDENTIALS.slug }?siteSlug=example.wordpress.com`,
				state: null,
			} );
		} );

		it( 'migrate redirects from the how-to-migrate (upgrade needed) page to site-migration-upgrade-plan step', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_HOW_TO_MIGRATE.slug,
				dependencies: {
					destination: 'upgrade',
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug }?siteSlug=example.wordpress.com&destination=upgrade`,
				state: null,
			} );
		} );

		it( 'redirects the user to the checkout page with the correct destination params', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentURL: `/setup/${ STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug }?siteSlug=example.wordpress.com&from=https://site-to-be-migrated.com`,
				currentStep: STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug,
				dependencies: {
					goToCheckout: true,
					plan: PLAN_MIGRATION_TRIAL_MONTHLY,
					sendIntentWhenCreatingTrial: true,
				},
				cancelDestination: `/setup/site-migration/${ STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug }?siteSlug=example.wordpress.com&from=https://site-to-be-migrated.com`,
			} );

			expect( goToCheckout ).toHaveBeenCalledWith( {
				destination: `/setup/site-migration/${ STEPS.SITE_MIGRATION_INSTRUCTIONS.slug }?siteSlug=example.wordpress.com&from=https%3A%2F%2Fsite-to-be-migrated.com`,
				extraQueryParams: { hosting_intent: HOSTING_INTENT_MIGRATE },
				flowName: 'site-migration',
				siteSlug: 'example.wordpress.com',
				stepName: STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug,
				cancelDestination: `/setup/site-migration/${ STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug }?siteSlug=example.wordpress.com&from=https%3A%2F%2Fsite-to-be-migrated.com`,
				plan: PLAN_MIGRATION_TRIAL_MONTHLY,
			} );
		} );

		it( 'redirects the user to the checkout page with the credentials step as success destination', () => {
			config.enable( 'automated-migration/collect-credentials' );
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentURL: `/setup/${ STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug }?siteSlug=example.wordpress.com&from=https://site-to-be-migrated.com&how=${ HOW_TO_MIGRATE_OPTIONS.DO_IT_FOR_ME }`,
				currentStep: STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug,
				dependencies: {
					goToCheckout: true,
					plan: PLAN_MIGRATION_TRIAL_MONTHLY,
					sendIntentWhenCreatingTrial: true,
				},
				cancelDestination: `/setup/site-migration/${ STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug }?siteSlug=example.wordpress.com&from=https://site-to-be-migrated.com&how=${ HOW_TO_MIGRATE_OPTIONS.DO_IT_FOR_ME }`,
			} );

			expect( goToCheckout ).toHaveBeenCalledWith( {
				destination: `/setup/site-migration/${ STEPS.SITE_MIGRATION_CREDENTIALS.slug }?siteSlug=example.wordpress.com&from=https%3A%2F%2Fsite-to-be-migrated.com`,
				extraQueryParams: { hosting_intent: HOSTING_INTENT_MIGRATE },
				flowName: 'site-migration',
				siteSlug: 'example.wordpress.com',
				stepName: STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug,
				cancelDestination: `/setup/site-migration/${ STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug }?siteSlug=example.wordpress.com&from=https%3A%2F%2Fsite-to-be-migrated.com&how=${ HOW_TO_MIGRATE_OPTIONS.DO_IT_FOR_ME }`,
				plan: PLAN_MIGRATION_TRIAL_MONTHLY,
			} );
			config.disable( 'automated-migration/collect-credentials' );
		} );

		it( 'redirects back to the credentials step when failing to create the ticket', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_ASSISTED_MIGRATION.slug,
				dependencies: {
					hasError: 'ticket-creation',
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_CREDENTIALS.slug }?siteSlug=example.wordpress.com&error=ticket-creation`,
				state: null,
			} );
		} );

		it( 'skipping the credentials step redirects the user to the instructions page', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_CREDENTIALS.slug,
				dependencies: {
					action: 'skip',
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_ASSISTED_MIGRATION.slug }?siteSlug=example.wordpress.com`,
				state: null,
			} );
		} );

		it( 'redirects the user to the instructions page when the user submits the credentials step', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_CREDENTIALS.slug,
				dependencies: {},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_ASSISTED_MIGRATION.slug }?siteSlug=example.wordpress.com&preventTicketCreation=true`,
				state: null,
			} );
		} );

		it( 'upgrade redirects from the import-from page to site-migration-how-to-migrate page', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_IMPORT_OR_MIGRATE.slug,
				dependencies: {
					destination: 'upgrade',
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: '/site-migration-how-to-migrate',
				state: { siteSlug: 'example.wordpress.com' },
			} );
		} );

		it( 'redirects the user to the calypso import page when they come from there', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_IMPORT_OR_MIGRATE.slug,
				currentURL: `/setup/site-migration/${ STEPS.SITE_MIGRATION_IMPORT_OR_MIGRATE.slug }?ref=calypso-importer&siteSlug=site-to-be-migrated.com`,
				dependencies: {
					destination: 'import',
				},
			} );

			expect( window.location.assign ).toHaveBeenCalledWith(
				'/import/site-to-be-migrated.com?engine=wordpress&ref=site-migration'
			);
		} );

		it( 'uses the siteId param fallback', async () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentURL: `/setup/${ STEPS.SITE_MIGRATION_IDENTIFY.slug }?siteSlug=example.wordpress.com&siteId=123`,
				currentStep: STEPS.SITE_MIGRATION_IDENTIFY.slug,
				dependencies: {
					action: 'continue',
					platform: 'wordpress',
					from: 'https://site-to-be-migrated.com',
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_IMPORT_OR_MIGRATE.slug }?from=https%3A%2F%2Fsite-to-be-migrated.com&siteSlug=example.wordpress.com&siteId=123`,
				state: null,
			} );
		} );

		it( 'redirects from site-migration-assign-trial-plan step to bundleTransfer step', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_ASSIGN_TRIAL_PLAN.slug,
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_INSTRUCTIONS.slug }`,
				state: { siteSlug: 'example.wordpress.com' },
			} );
		} );

		it( 'redirects from site-migration-credentials step to site-migration-assisted-migration step skipping ticket creation', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_CREDENTIALS.slug,
				dependencies: {
					action: 'continue',
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_ASSISTED_MIGRATION.slug }?siteSlug=example.wordpress.com&preventTicketCreation=true`,
				state: null,
			} );
		} );

		it( 'redirects from site-migration-credentials step to site-migration-assisted-migration creating the ticket', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentStep: STEPS.SITE_MIGRATION_CREDENTIALS.slug,
				dependencies: {
					action: 'skip',
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_ASSISTED_MIGRATION.slug }?siteSlug=example.wordpress.com`,
				state: null,
			} );
		} );

		it( 'redirects from site-migration-credentials step to site-migration-already-wpcom step when the user is already on WPCOM', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentURL: `/setup/${ STEPS.SITE_MIGRATION_CREDENTIALS.slug }?siteSlug=example.wordpress.com`,
				currentStep: STEPS.SITE_MIGRATION_CREDENTIALS.slug,
				dependencies: {
					action: 'already-wpcom',
					from: 'https://site-to-be-migrated.com',
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_ALREADY_WPCOM.slug }?from=https%3A%2F%2Fsite-to-be-migrated.com&siteSlug=example.wordpress.com`,
				state: null,
			} );
		} );

		it( 'redirects from site-migration-credentials step to site-migration-other-platform-detected-import step when the site platform is not wordpress', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentURL: `/setup/${ STEPS.SITE_MIGRATION_CREDENTIALS.slug }?siteSlug=example.wordpress.com`,
				currentStep: STEPS.SITE_MIGRATION_CREDENTIALS.slug,
				dependencies: {
					action: 'site-is-not-using-wordpress',
					platform: 'squarespace',
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_OTHER_PLATFORM_DETECTED_IMPORT.slug }?siteSlug=example.wordpress.com&platform=squarespace`,
				state: null,
			} );
		} );

		it( 'redirects from site-migration-other-platform-detected-import step to the importer flow', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentURL: `/setup/${ STEPS.SITE_MIGRATION_OTHER_PLATFORM_DETECTED_IMPORT.slug }?siteSlug=example.wordpress.com&siteId=123&from=oldsite.com`,
				currentStep: STEPS.SITE_MIGRATION_OTHER_PLATFORM_DETECTED_IMPORT.slug,
				dependencies: {
					action: 'import',
					platform: 'squarespace',
				},
			} );

			expect( window.location.assign ).toHaveBeenCalledWith(
				addQueryArgs(
					{
						siteSlug: 'example.wordpress.com',
						from: 'oldsite.com',
						backToFlow: `site-migration/${ STEPS.SITE_MIGRATION_OTHER_PLATFORM_DETECTED_IMPORT.slug }`,
						siteId: 123,
						ref: 'site-migration',
					},
					'/setup/site-setup/importerSquarespace'
				)
			);
		} );

		it( 'redirects from site-migration-other-platform-detected-import step to the assisted migration step when the user skips the import', () => {
			const { runUseStepNavigationSubmit } = renderFlow( siteMigrationFlow );

			runUseStepNavigationSubmit( {
				currentURL: `/setup/${ STEPS.SITE_MIGRATION_OTHER_PLATFORM_DETECTED_IMPORT.slug }?siteSlug=example.wordpress.com&siteId=123&from=oldsite.com`,
				currentStep: STEPS.SITE_MIGRATION_OTHER_PLATFORM_DETECTED_IMPORT.slug,
				dependencies: {
					action: 'skip',
				},
			} );

			expect( getFlowLocation() ).toEqual( {
				path: addQueryArgs(
					{ siteId: 123, from: 'oldsite.com', siteSlug: 'example.wordpress.com' },
					`/${ STEPS.SITE_MIGRATION_ASSISTED_MIGRATION.slug }`
				),
				state: null,
			} );
		} );

		it( 'calls triggerGuidesForStep when navigating site migration identify', async () => {
			const flowName = 'site-migration';
			const currentStep = STEPS.SITE_MIGRATION_IDENTIFY.slug;

			triggerGuidesForStep( flowName, currentStep );

			expect( triggerGuidesForStep ).toHaveBeenCalledWith( flowName, currentStep );
		} );

		it( 'calls triggerGuidesForStep when navigating to the import or migrate step', async () => {
			const flowName = 'site-migration';
			const currentStep = STEPS.SITE_MIGRATION_IMPORT_OR_MIGRATE.slug;

			triggerGuidesForStep( flowName, currentStep );

			expect( triggerGuidesForStep ).toHaveBeenCalledWith( flowName, currentStep );
		} );

		it( 'calls triggerGuidesForStep when navigating site migration upgrade plan', async () => {
			const flowName = 'site-migration';
			const currentStep = STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug;

			triggerGuidesForStep( flowName, currentStep );

			expect( triggerGuidesForStep ).toHaveBeenCalledWith( flowName, currentStep );
		} );

		it( 'calls triggerGuidesForStep when navigating site migration assign trial plan', async () => {
			const flowName = 'site-migration';
			const currentStep = STEPS.SITE_MIGRATION_ASSIGN_TRIAL_PLAN.slug;

			triggerGuidesForStep( flowName, currentStep );

			expect( triggerGuidesForStep ).toHaveBeenCalledWith( flowName, currentStep );
		} );
	} );

	describe( 'goBack', () => {
		it( 'redirect the user back to the identify step from how to migrate', async () => {
			const { runUseStepNavigationGoBack } = renderFlow( siteMigrationFlow );

			runUseStepNavigationGoBack( {
				currentStep: STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug,
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_HOW_TO_MIGRATE.slug }?siteSlug=example.wordpress.com`,
				state: null,
			} );
		} );

		it( 'redirects the user back the calypso import page when they come from there', async () => {
			const { runUseStepNavigationGoBack } = renderFlow( siteMigrationFlow );

			runUseStepNavigationGoBack( {
				currentStep: STEPS.SITE_MIGRATION_IMPORT_OR_MIGRATE.slug,
				currentURL: `/setup/site-migration/${ STEPS.SITE_MIGRATION_IMPORT_OR_MIGRATE.slug }?ref=calypso-importer&siteSlug=site-to-be-migrated.com`,
			} );

			expect( window.location.assign ).toHaveBeenCalledWith(
				`/import/site-to-be-migrated.com?ref=site-migration`
			);
		} );

		it( 'redirects the user back to the internal import list selection from migrate or import screen when they come from', async () => {
			const { runUseStepNavigationGoBack } = renderFlow( siteMigrationFlow );

			runUseStepNavigationGoBack( {
				currentStep: STEPS.SITE_MIGRATION_UPGRADE_PLAN.slug,
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_HOW_TO_MIGRATE.slug }?siteSlug=example.wordpress.com`,
				state: null,
			} );
		} );

		it( 'redirects the user to the goal step when going back from the identify step', async () => {
			const { runUseStepNavigationGoBack } = renderFlow( siteMigrationFlow );

			runUseStepNavigationGoBack( {
				currentStep: STEPS.SITE_MIGRATION_IDENTIFY.slug,
			} );

			expect( window.location.assign ).toHaveBeenCalledWith(
				'/setup/site-setup/goals?siteSlug=example.wordpress.com'
			);
		} );

		it( 'redirects the user to the how-to-migrate step when going back from the credentials step', async () => {
			const { runUseStepNavigationGoBack } = renderFlow( siteMigrationFlow );

			runUseStepNavigationGoBack( {
				currentStep: STEPS.SITE_MIGRATION_CREDENTIALS.slug,
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_HOW_TO_MIGRATE.slug }?siteSlug=example.wordpress.com`,
				state: null,
			} );
		} );

		it( 'redirects the user to the other platform detected import step when going back from the credentials step', async () => {
			const { runUseStepNavigationGoBack } = renderFlow( siteMigrationFlow );

			runUseStepNavigationGoBack( {
				currentStep: STEPS.SITE_MIGRATION_OTHER_PLATFORM_DETECTED_IMPORT.slug,
			} );

			expect( getFlowLocation() ).toEqual( {
				path: `/${ STEPS.SITE_MIGRATION_CREDENTIALS.slug }?siteSlug=example.wordpress.com`,
				state: null,
			} );
		} );
	} );
} );
