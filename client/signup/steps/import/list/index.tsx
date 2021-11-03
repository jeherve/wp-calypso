import { Button } from '@automattic/components';
import { Title } from '@automattic/onboarding';
import { useI18n } from '@wordpress/react-i18n';
import ActionCard from 'calypso/components/action-card';
import ImporterLogo from 'calypso/my-sites/importer/importer-logo';
import { GoToStep } from '../types';
import type * as React from 'react';
import './style.scss';

/* eslint-disable wpcalypso/jsx-classname-namespace */

interface Props {
	goToStep: GoToStep;
}

const ListStep: React.FunctionComponent< Props > = ( props ) => {
	const { __ } = useI18n();
	const { goToStep } = props;

	const onButtonClick = ( platform: string ): void => {
		goToStep( `ready?platform=${ platform }` );
	};

	return (
		<>
			<div className={ 'import-layout list__wrapper' }>
				<div className={ 'import-layout__column' }>
					<div className="import__heading">
						<Title>{ __( 'Import your content from another platform' ) }</Title>

						<img alt="" src="/calypso/images/importer/onboarding.svg" />
					</div>
				</div>
				<div className={ 'import-layout__column' }>
					<div className={ 'list__importers list__importers-primary' }>
						<ImporterLogo icon={ 'wordpress' } />
						<ActionCard
							classNames={ 'list__importer-action' }
							headerText={ 'WordPress' }
							mainText={ 'www.wordpress.org' }
							buttonIcon={ 'chevron-right' }
							buttonOnClick={ () => onButtonClick( 'wordpress' ) }
						/>
						<ImporterLogo icon={ 'blogger-alt' } />
						<ActionCard
							classNames={ 'list__importer-action' }
							headerText={ 'Blogger' }
							mainText={ 'www.blogger.com' }
							buttonIcon={ 'chevron-right' }
							buttonOnClick={ () => onButtonClick( 'blogger' ) }
						/>
						<ImporterLogo icon={ 'medium' } />
						<ActionCard
							classNames={ 'list__importer-action' }
							headerText={ 'Medium' }
							mainText={ 'www.medium.com' }
							buttonIcon={ 'chevron-right' }
							buttonOnClick={ () => onButtonClick( 'medium' ) }
						/>
						<ImporterLogo icon={ 'squarespace' } />
						<ActionCard
							classNames={ 'list__importer-action' }
							headerText={ 'Squarespace' }
							mainText={ 'www.squarespace.com' }
							buttonIcon={ 'chevron-right' }
							buttonOnClick={ () => onButtonClick( 'squarespace' ) }
						/>
						<ImporterLogo icon={ 'wix' } />
						<ActionCard
							classNames={ 'list__importer-action' }
							headerText={ 'Wix' }
							mainText={ 'www.wix.com' }
							buttonIcon={ 'chevron-right' }
							buttonOnClick={ () => onButtonClick( 'wix' ) }
						/>
					</div>

					<div className={ 'list__importers list__importers-secondary' }>
						<h3>Other platforms</h3>
						<ul>
							<li>
								<Button borderless={ true } onClick={ () => onButtonClick( 'blogroll' ) }>
									Blogroll
								</Button>
							</li>
							<li>
								<Button borderless={ true } onClick={ () => onButtonClick( 'ghost' ) }>
									Ghost
								</Button>
							</li>
							<li>
								<Button borderless={ true } onClick={ () => onButtonClick( 'tumblr' ) }>
									Tumblr
								</Button>
							</li>
							<li>
								<Button borderless={ true } onClick={ () => onButtonClick( 'livejournal' ) }>
									LiveJournal
								</Button>
							</li>
							<li>
								<Button borderless={ true } onClick={ () => onButtonClick( 'movabletype' ) }>
									Movable Type & TypePad
								</Button>
							</li>
							<li>
								<Button borderless={ true } onClick={ () => onButtonClick( 'xanga' ) }>
									Xanga
								</Button>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</>
	);
};

export default ListStep;
