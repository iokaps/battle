import { kmClient } from '@/services/km-client';
import { playerInputStore } from '../stores/player-input-store';

/**
 * Actions for player input mutations.
 * Each player writes their own input entry to the shared input store.
 * The global controller reads all inputs to process physics.
 */
export const playerInputActions = {
	/** Update the current player's input state */
	async updateInput(
		dx: number,
		dy: number,
		attack: boolean,
		shield: boolean,
		rangedAttack: boolean = false,
		emote: string = ''
	) {
		await kmClient.transact([playerInputStore], ([inputState]) => {
			inputState.inputs[kmClient.id] = {
				dx,
				dy,
				attack,
				shield,
				rangedAttack,
				emote,
				timestamp: kmClient.serverTimestamp()
			};
		});
	},

	/** Clear the current player's input when leaving the game */
	async clearInput() {
		await kmClient.transact([playerInputStore], ([inputState]) => {
			delete inputState.inputs[kmClient.id];
		});
	}
};
