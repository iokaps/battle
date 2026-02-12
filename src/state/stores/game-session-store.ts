import { kmClient } from '@/services/km-client';
import type { GameSessionState } from '@/state/schemas';

export type { GameSessionState };

const initialState: GameSessionState = {
	started: false,
	startTimestamp: 0,
	controllerConnectionId: ''
};

/**
 * Domain: Game Session
 *
 * Global store for current game session state - the live status of the ongoing game.
 *
 * Synced across all clients.
 *
 * Use this store for:
 * - Game lifecycle (started, ended)
 * - Current game state (round/phase)
 * - Active timers
 * - Global controller assignment
 * - Any dynamic data that reflects the game progress and needs to be synced globally
 *
 * @see gameSessionActions for state mutations
 */
export const gameSessionStore = kmClient.store<GameSessionState>(
	'game-session',
	initialState
);
