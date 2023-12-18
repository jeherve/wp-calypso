import { PLAN_PREMIUM } from '@automattic/calypso-products';
import { usePlans } from '@automattic/data-stores/src/plans';
import { useHasEnTranslation } from '@automattic/i18n-utils';
import { useTranslate, TranslateResult } from 'i18n-calypso';
import { NAVIGATOR_PATHS } from '../constants';
import type { ScreenName } from '../types';

export type UseScreenOptions = {
	isNewSite?: boolean;
	shouldUnlockGlobalStyles?: boolean;
};

export type Screen = {
	name: string;
	title: string;
	description: TranslateResult;
	continueLabel: string;
	/** The label for going back from the next screen */
	backLabel?: string;
	initialPath: string;
	previousScreen?: Screen | null;
	nextScreen?: Screen | null;
};

const useScreen = ( screenName: ScreenName, options: UseScreenOptions = {} ): Screen => {
	const translate = useTranslate();
	const hasEnTranslation = useHasEnTranslation();
	const plans = usePlans();
	const screens: Record< ScreenName, Screen > = {
		main: {
			name: 'main',
			title: hasEnTranslation( 'Select patterns' )
				? translate( 'Select patterns' )
				: translate( 'Select your patterns' ),
			description: translate( 'Create your homepage from our library of patterns.' )
				? translate( 'Create your homepage from our library of patterns.' )
				: translate(
						'Create your homepage by first adding patterns and then choosing a color palette and font style.'
				  ),
			continueLabel: hasEnTranslation( 'Select styles' )
				? translate( 'Select styles' )
				: translate( 'Pick your styles' ),
			backLabel: hasEnTranslation( 'patterns' ) ? translate( 'patterns' ) : undefined,
			initialPath: NAVIGATOR_PATHS.MAIN_HEADER,
		},
		styles: {
			name: 'styles',
			title: hasEnTranslation( 'Select styles' )
				? translate( 'Select styles' )
				: translate( 'Pick your styles' ),
			description: hasEnTranslation(
				'Add style to your page with our expertly curated color palettes and font pairings.'
			)
				? translate(
						'Add style to your page with our expertly curated color palettes and font pairings.'
				  )
				: translate(
						'Create your homepage by first adding patterns and then choosing a color palette and font style.'
				  ),
			continueLabel: translate( 'Select pages' ),
			backLabel: hasEnTranslation( 'styles' ) ? translate( 'styles' ) : undefined,
			initialPath: NAVIGATOR_PATHS.STYLES_COLORS,
		},
		pages: {
			name: 'pages',
			title: translate( 'Add more pages' ),
			description: translate(
				"We've pre-selected common pages for your site. You can add more pages or unselect the current ones.{{br/}}{{br/}}Page content can be edited later, in the Site Editor.",
				{
					components: {
						br: <br />,
					},
				}
			),
			continueLabel: translate( 'Save and continue' ),
			backLabel: translate( 'pages' ),
			initialPath: NAVIGATOR_PATHS.PAGES,
		},
		upsell: {
			name: 'upsell',
			title: translate( 'Premium styles' ),
			description: hasEnTranslation(
				"You've chosen premium styles which are exclusive to the %(premiumPlanName)s plan or higher."
			)
				? translate(
						"You've chosen premium styles which are exclusive to the %(premiumPlanName)s plan or higher.",
						{ args: { premiumPlanName: plans?.data?.[ PLAN_PREMIUM ]?.productNameShort || '' } }
				  )
				: translate(
						"You've chosen premium styles which are exclusive to the Premium plan or higher."
				  ),
			continueLabel: translate( 'Continue' ),
			backLabel: hasEnTranslation( 'premium styles' ) ? translate( 'premium styles' ) : undefined,
			initialPath: NAVIGATOR_PATHS.UPSELL,
		},
		activation: {
			name: 'activation',
			title: translate( 'Activate this theme' ),
			description: translate( 'Activating this theme will result in the following changes.' ),
			continueLabel: translate( 'Activate' ),
			initialPath: NAVIGATOR_PATHS.ACTIVATION,
		},
		confirmation: {
			name: 'confirmation',
			title: translate( 'Great job!' ),
			description: translate( 'Time to add some content and bring your site to life!' ),
			continueLabel: translate( 'Start adding content' ),
			initialPath: NAVIGATOR_PATHS.CONFIRMATION,
		},
	};

	const previousScreens = {
		main: null,
		styles: screens.main,
		pages: screens.styles,
		upsell: screens.pages,
		activation: options.shouldUnlockGlobalStyles ? screens.upsell : screens.pages,
		confirmation: options.shouldUnlockGlobalStyles ? screens.upsell : screens.pages,
	};

	const nextScreens = {
		main: screens.styles,
		styles: screens.pages,
		pages: ( () => {
			if ( options.shouldUnlockGlobalStyles ) {
				return screens.upsell;
			}

			return options.isNewSite ? screens.confirmation : screens.activation;
		} )(),
		upsell: options.isNewSite ? screens.confirmation : screens.activation,
		activation: null,
		confirmation: null,
	};

	return {
		...screens[ screenName ],
		previousScreen: previousScreens[ screenName ],
		nextScreen: nextScreens[ screenName ],
	};
};

export default useScreen;
