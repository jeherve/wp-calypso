/**
 * External dependencies
 */
import React, { createRef } from 'react';
import ReactDom from 'react-dom';
import PropTypes from 'prop-types';
import { localize } from 'i18n-calypso';
import debugModule from 'debug';
import deterministicStringify from 'fast-json-stable-stringify';

/**
 * Internal dependencies
 */
import AsyncLoad from 'calypso/components/async-load';
import Gridicon from 'calypso/components/gridicon';
import Popover from 'calypso/components/popover';
import PopoverMenuItem from 'calypso/components/popover/menu-item';
import UserItem from 'calypso/components/user';
import InfiniteList from 'calypso/components/infinite-list';
import { hasTouch } from 'calypso/lib/touch-detect';

/**
 * Module variables
 */
const debug = debugModule( 'calypso:author-selector' );

class AuthorSwitcherShell extends React.Component {
	static propTypes = {
		users: PropTypes.array,
		fetchingUsers: PropTypes.bool,
		numUsersFetched: PropTypes.number,
		totalUsers: PropTypes.number,
		usersCurrentOffset: PropTypes.number,
		allowSingleUser: PropTypes.bool,
		popoverPosition: PropTypes.string,
		ignoreContext: PropTypes.shape( { getDOMNode: PropTypes.func } ),
		transformAuthor: PropTypes.func,
	};

	state = {
		showAuthorMenu: false,
	};

	authorSelectorSearchRef = createRef();
	authorSelectorToggleRef = createRef();
	authorSelectorChevronRef = createRef();

	UNSAFE_componentWillReceiveProps( nextProps ) {
		if (
			! nextProps.fetchOptions.siteId ||
			nextProps.fetchOptions.siteId !== this.props.fetchOptions.siteId
		) {
			this.props.updateSearch( false );
		}
	}

	componentDidUpdate( prevProps, prevState ) {
		if ( ! this.state.showAuthorMenu ) {
			return;
		}

		if ( ! prevState.showAuthorMenu && this.props.users.length > 10 && ! hasTouch() ) {
			setTimeout( () => this.authorSelectorSearchRef.current?.focus?.(), 0 );
		}
	}

	render() {
		const { users, fetchOptions, fetchingUsers } = this.props;
		const { number, offset, ...otherFetchOptions } = fetchOptions;
		const infiniteListKey = deterministicStringify( otherFetchOptions );

		if ( ! this.userCanSelectAuthor() ) {
			return <span>{ this.props.children }</span>;
		}

		return (
			<>
				<span
					className="author-selector__author-toggle"
					onClick={ this.toggleShowAuthor }
					onKeyDown={ this.toggleShowAuthor }
					role="button"
					tabIndex={ -1 }
					ref={ this.authorSelectorToggleRef }
				>
					{ this.props.children }
					<Gridicon ref={ this.authorSelectorChevronRef } icon="chevron-down" size={ 18 } />
				</span>
				<Popover
					isVisible={ this.state.showAuthorMenu }
					onClose={ this.onClose }
					position={ this.props.popoverPosition }
					context={ this.authorSelectorChevronRef.current }
					onKeyDown={ this.onKeyDown }
					className="author-selector__popover popover"
					ignoreContext={ this.props.ignoreContext }
				>
					{ ( fetchOptions.search || users.length > 10 ) && (
						<AsyncLoad
							require="@automattic/search"
							compact
							onSearch={ this.onSearch }
							placeholder={ this.props.translate( 'Find Author…', { context: 'search label' } ) }
							delaySearch={ true }
							ref={ this.authorSelectorSearchRef }
						/>
					) }
					{ ! users.length && fetchOptions.search && ! fetchingUsers ? (
						this.noUsersFound()
					) : (
						<InfiniteList
							key={ infiniteListKey }
							items={ users }
							className="author-selector__infinite-list"
							ref={ this.setListContext }
							context={ this.state.listContext }
							fetchingNextPage={ this.props.fetchingNextPage }
							guessedItemHeight={ 42 }
							lastPage={ ! this.props.hasNextPage }
							fetchNextPage={ this.props.fetchNextPage }
							getItemRef={ this.getAuthorItemGUID }
							renderLoadingPlaceholders={ this.renderLoadingAuthors }
							renderItem={ this.renderAuthor }
						/>
					) }
				</Popover>
			</>
		);
	}

	setListContext = ( infiniteListInstance ) => {
		this.setState( {
			listContext: ReactDom.findDOMNode( infiniteListInstance ),
		} );
	};

	userCanSelectAuthor() {
		const { users, fetchOptions, allowSingleUser } = this.props;

		if ( fetchOptions.search ) {
			return true;
		}

		// no user choice
		if ( ! users || ! users.length || ( ! allowSingleUser && users.length === 1 ) ) {
			return false;
		}

		return true;
	}

	toggleShowAuthor = () => {
		this.setState( {
			showAuthorMenu: ! this.state.showAuthorMenu,
		} );
	};

	onClose = ( event ) => {
		const toggleElement = ReactDom.findDOMNode( this.authorSelectorToggleRef.current );

		if ( event && toggleElement.contains( event.target ) ) {
			// let toggleShowAuthor() handle this case
			return;
		}
		this.setState( {
			showAuthorMenu: false,
		} );
		this.props.updateSearch( false );
	};

	renderAuthor = ( rawAuthor ) => {
		const { transformAuthor } = this.props;
		const author = transformAuthor ? transformAuthor( rawAuthor ) : rawAuthor;
		const authorGUID = this.getAuthorItemGUID( author );

		return (
			<PopoverMenuItem
				className="author-selector__menu-item"
				onClick={ this.selectAuthor.bind( this, author ) }
				focusOnHover={ false }
				key={ authorGUID }
				tabIndex="-1"
			>
				<UserItem user={ author } />
			</PopoverMenuItem>
		);
	};

	noUsersFound() {
		return (
			<div className="author-selector__no-users">
				{ this.props.translate( 'No matching users found.' ) }
			</div>
		);
	}

	selectAuthor = ( author ) => {
		debug( 'assign author:', author );
		if ( this.props.onSelect ) {
			this.props.onSelect( author );
		}
		this.setState( {
			showAuthorMenu: false,
		} );
		this.props.updateSearch( false );
	};

	getAuthorItemGUID = ( author ) => {
		return 'author-item-' + author.ID;
	};

	renderLoadingAuthors = () => {
		return (
			<PopoverMenuItem disabled={ true } key="author-item-placeholder">
				<UserItem />
			</PopoverMenuItem>
		);
	};

	onSearch = ( searchTerm ) => {
		this.props.updateSearch( searchTerm );
	};
}

export default localize( AuthorSwitcherShell );
