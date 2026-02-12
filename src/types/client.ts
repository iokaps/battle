export interface HostClientContext {
	mode: 'host';
	playerCode: string;
	presenterCode: string;
}

export interface PresenterClientContext {
	mode: 'presenter';
	playerCode: string;
}

export interface PlayerClientContext {
	mode: 'player';
}

export type ClientContext =
	| HostClientContext
	| PresenterClientContext
	| PlayerClientContext;
