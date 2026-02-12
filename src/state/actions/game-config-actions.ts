import { kmClient } from '@/services/km-client';
import { gameConfigStore } from '../stores/game-config-store';

/**
 * Actions for game config mutations.
 *
 * Typically used by host to configure game parameters and presenter display preferences.
 */
export const gameConfigActions = {
	/** Set game language */
	async setLanguage(lang: string) {
		await kmClient.transact([kmClient.metaStore], ([metaState]) => {
			metaState.lang = lang;
		});
	},

	/** Set game title */
	async setTitle(title: string) {
		await kmClient.transact([kmClient.metaStore], ([metaState]) => {
			metaState.title = title;
			metaState.ogTitle = title;
		});
	},

	/** Change game duration in minutes */
	async changeGameDuration(duration: number) {
		await kmClient.transact([gameConfigStore], ([gameConfigState]) => {
			gameConfigState.gameDuration = duration;
		});
	},

	/** Toggle QR code visibility for presenter screen */
	async togglePresenterQr() {
		await kmClient.transact([gameConfigStore], ([gameConfigState]) => {
			gameConfigState.showPresenterQr = !gameConfigState.showPresenterQr;
		});
	}
};
