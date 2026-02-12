import { kmClient } from '@/services/km-client';
import { gameSessionStore } from '../stores/game-session-store';

/**
 * Actions for game runtime state mutations.
 *
 * Controls game lifecycle. Uses `kmClient.serverTimestamp()`
 * for synchronized time across all clients.
 */
export const gameSessionActions = {
	/** Start the countdown phase (host presses "Start"). Battle begins after countdown. */
	async startGame() {
		await kmClient.transact([gameSessionStore], ([gameSessionState]) => {
			gameSessionState.countdownStartTimestamp = kmClient.serverTimestamp();
			gameSessionState.started = false;
		});
	},

	/** Begin the actual battle (called by controller after countdown finishes) */
	async startBattle() {
		await kmClient.transact([gameSessionStore], ([gameSessionState]) => {
			gameSessionState.started = true;
			gameSessionState.startTimestamp = kmClient.serverTimestamp();
		});
	},

	/** Stop the game and reset timestamp */
	async stopGame() {
		await kmClient.transact([gameSessionStore], ([gameSessionState]) => {
			gameSessionState.started = false;
			gameSessionState.startTimestamp = 0;
			gameSessionState.countdownStartTimestamp = 0;
		});
	}
};
