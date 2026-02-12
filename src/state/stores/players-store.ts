import { kmClient } from '@/services/km-client';
import type { PlayersState } from '@/state/schemas';

export type { PlayersState };

const initialState: PlayersState = {
	players: {}
};

/**
 * Domain: Players Registry
 *
 * Global store for all players data - the central registry of who's playing.
 * Synced across all clients.
 *
 * Use this store for:
 * - Player profiles (name, avatar, team)
 * - Player scores/stats
 * - Any players data that needs to be synced globally
 *
 *
 * @see playersActions for state mutations
 * @see localPlayerActions.setPlayerName for player registration
 */
export const playersStore = kmClient.store<PlayersState>(
	'players-registry',
	initialState
);
