import { kmClient } from '@/services/km-client';
import { PLAYER_COLORS } from '@/utils/gameConstants';
import {
	localPlayerStore,
	type LocalPlayerState
} from '../stores/local-player-store';
import { playersStore } from '../stores/players-store';

/**
 * Actions for local player mutations.
 * Handles current player's state changes.
 * Some actions may affect global stores (e.g., player registration).
 *
 * Note: Uses `kmClient.id` to identify current player in global stores.
 */
export const localPlayerActions = {
	/** Change current player's view/navigation state */
	async setCurrentView(view: LocalPlayerState['currentView']) {
		await kmClient.transact([localPlayerStore], ([localPlayerState]) => {
			localPlayerState.currentView = view;
		});
	},

	/**
	 * Set player name and avatar prompt - updates both local store and global players list.
	 * Assigns a unique color from the palette based on current player count.
	 */
	async setPlayerName(name: string, avatarPrompt: string) {
		await kmClient.transact(
			[localPlayerStore, playersStore],
			([localPlayerState, playersState]) => {
				const existingCount = Object.keys(playersState.players).length;
				const color =
					PLAYER_COLORS[existingCount % PLAYER_COLORS.length] || '#6b7280';

				localPlayerState.name = name;
				localPlayerState.avatarPrompt = avatarPrompt;
				playersState.players[kmClient.id] = {
					name,
					color,
					avatarUrl: '',
					avatarJobId: ''
				};
			}
		);
	},

	/** Update avatar job ID in both local and global stores */
	async setAvatarJobId(jobId: string) {
		await kmClient.transact(
			[localPlayerStore, playersStore],
			([localPlayerState, playersState]) => {
				localPlayerState.avatarJobId = jobId;
				if (playersState.players[kmClient.id]) {
					playersState.players[kmClient.id].avatarJobId = jobId;
				}
			}
		);
	},

	/** Set avatar URL in global players store once generation completes */
	async setAvatarUrl(url: string) {
		await kmClient.transact(
			[localPlayerStore, playersStore],
			([localPlayerState, playersState]) => {
				localPlayerState.avatarJobId = '';
				if (playersState.players[kmClient.id]) {
					playersState.players[kmClient.id].avatarUrl = url;
					playersState.players[kmClient.id].avatarJobId = '';
				}
			}
		);
	}
};
