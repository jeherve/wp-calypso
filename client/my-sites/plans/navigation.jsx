import { isMobile } from '@automattic/viewport';
import { localize } from 'i18n-calypso';
import PropTypes from 'prop-types';
import { Component } from 'react';
import { connect } from 'react-redux';
import SectionNav from 'calypso/components/section-nav';
import NavItem from 'calypso/components/section-nav/item';
import NavTabs from 'calypso/components/section-nav/tabs';
import { sectionify } from 'calypso/lib/route';
import CalypsoShoppingCartProvider from 'calypso/my-sites/checkout/calypso-shopping-cart-provider';
import PopoverCart from 'calypso/my-sites/checkout/cart/popover-cart';
import isSiteOnFreePlan from 'calypso/state/selectors/is-site-on-free-plan';
import isAtomicSite from 'calypso/state/selectors/is-site-wpcom-atomic';
import { getSite, isJetpackSite } from 'calypso/state/sites/selectors';
import { getSelectedSiteId } from 'calypso/state/ui/selectors';

class PlansNavigation extends Component {
	static propTypes = {
		isJetpack: PropTypes.bool,
		path: PropTypes.string.isRequired,
		shouldShowMyPlan: PropTypes.bool,
		site: PropTypes.object,
	};

	state = {
		cartVisible: false,
	};

	getSectionTitle( path ) {
		switch ( path ) {
			case '/plans/my-plan':
				return 'My Plan';

			case '/plans':
			case '/plans/monthly':
			case '/plans/yearly':
				return 'Plans';

			default:
				return path.split( '?' )[ 0 ].replace( /\//g, ' ' );
		}
	}

	render() {
		const { site, shouldShowMyPlan, translate } = this.props;
		const path = sectionify( this.props.path );
		const sectionTitle = this.getSectionTitle( path );
		const hasPinnedItems = isMobile() && site;

		return (
			site && (
				<SectionNav
					hasPinnedItems={ hasPinnedItems }
					selectedText={ sectionTitle }
					onMobileNavPanelOpen={ this.onMobileNavPanelOpen }
				>
					<NavTabs label="Section" selectedText={ sectionTitle }>
						{ shouldShowMyPlan && (
							<NavItem
								path={ `/plans/my-plan/${ site.slug }` }
								selected={ path === '/plans/my-plan' }
							>
								{ translate( 'My Plan' ) }
							</NavItem>
						) }
						<NavItem
							path={ `/plans/${ site.slug }` }
							selected={
								path === '/plans' || path === '/plans/monthly' || path === '/plans/yearly'
							}
						>
							{ translate( 'Plans' ) }
						</NavItem>
					</NavTabs>
					<CartToggleButton
						site={ this.props.site }
						toggleCartVisibility={ this.toggleCartVisibility }
						cartVisible={ this.state.cartVisible }
						path={ this.props.path }
					/>
				</SectionNav>
			)
		);
	}

	toggleCartVisibility = () => {
		this.setState( { cartVisible: ! this.state.cartVisible } );
	};

	onMobileNavPanelOpen = () => {
		this.setState( { cartVisible: false } );
	};
}

function CartToggleButton( {
	site,
	toggleCartVisibility,
	cartVisible,
	path,
	closeSectionNavMobilePanel,
} ) {
	if ( ! site ) {
		return null;
	}

	const onToggle = () => {
		closeSectionNavMobilePanel();
		toggleCartVisibility();
	};

	return (
		<CalypsoShoppingCartProvider>
			<PopoverCart
				selectedSite={ site }
				onToggle={ onToggle }
				pinned={ isMobile() }
				visible={ cartVisible }
				path={ path }
			/>
		</CalypsoShoppingCartProvider>
	);
}

export default connect( ( state ) => {
	const siteId = getSelectedSiteId( state );
	const site = getSite( state, siteId );
	const isJetpack = isJetpackSite( state, siteId );
	const isOnFreePlan = isSiteOnFreePlan( state, siteId );
	const isAtomic = isAtomicSite( state, siteId );
	return {
		isJetpack,
		shouldShowMyPlan: ! isOnFreePlan || ( isJetpack && ! isAtomic ),
		site,
	};
} )( localize( PlansNavigation ) );
