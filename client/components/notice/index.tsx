/**
 * External dependencies
 */

import React, { useEffect } from 'react';
import classnames from 'classnames';
import { localize } from 'i18n-calypso';
import Gridicon from 'calypso/components/gridicon';

/**
 * Style dependencies
 */
import './style.scss';

/**
 * Module constants
 */
const GRIDICONS_WITH_DROP = [
	'add',
	'cross-circle',
	'ellipsis-circle',
	'help',
	'info',
	'notice',
	'pause',
	'play',
	'spam',
];

/**
 * Constants
 */
enum Status {
	Error = 'is-error',
	Info = 'is-info',
	Success = 'is-success',
	Warning = 'is-warning',
	Plain = 'is-plain',
}

export interface Props {
	className: string;
	duration: number;
	icon?: string;
	isCompact?: boolean;
	isLoading?: boolean;
	onDismissClick: () => void;
	showDismiss?: boolean;
	status: Status;
	text?: string | React.ReactNode;
	translate: ( x: string ) => string;
	children: React.ReactNode;
}

const getIcon = ( status: Status ): string => {
	let icon;

	switch ( status ) {
		case Status.Info:
			icon = 'info';
			break;
		case Status.Success:
			icon = 'checkmark';
			break;
		case Status.Error:
			icon = 'notice';
			break;
		case Status.Warning:
			icon = 'notice';
			break;
		default:
			icon = 'info';
			break;
	}

	return icon;
};

const Notice = ( props: Props ) => {
	const {
		className,
		duration,
		icon,
		isCompact,
		isLoading,
		onDismissClick,
		showDismiss,
		status,
		text,
		translate,
		children,
	} = props;

	let dismissTimeout: () => void;

	useEffect( () => {
		if ( dismissTimeout ) {
			clearTimeout( dismissTimeout );
		}

		if ( duration > 0 ) {
			dismissTimeout = setTimeout( onDismissClick, duration );
		}

		return () => {
			if ( dismissTimeout ) {
				clearTimeout( dismissTimeout );
			}
		};
	}, [ duration ] );

	// showDismiss = ! isCompact, // by default, show on normal notices, don't show on compact ones

	const classes = classnames( 'notice', status, className, {
		'is-compact': isCompact,
		'is-loading': isLoading,
		'is-dismissable': showDismiss,
		test: true,
	} );

	const iconName = icon || getIcon( status );
	const iconNeedsDrop = GRIDICONS_WITH_DROP.includes( iconName );

	return (
		<div className={ classes }>
			<span className="notice__icon-wrapper">
				{ iconNeedsDrop && <span className="notice__icon-wrapper-drop" /> }
				<Gridicon className="notice__icon" icon={ iconName } size={ 24 } />
			</span>
			<span className="notice__content">
				<span className="notice__text">{ text ? text : children }</span>
			</span>
			{ text ? children : null }
			{ showDismiss && (
				<button
					className="notice__dismiss"
					onClick={ onDismissClick }
					aria-label={ translate( 'Dismiss' ) }
				>
					<Gridicon icon="cross" size={ 24 } />
				</button>
			) }
		</div>
	);
};

export default localize( Notice );
