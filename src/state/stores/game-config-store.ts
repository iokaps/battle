import { kmClient } from '@/services/km-client';
import type { GameConfigState } from '@/state/schemas';

export type { GameConfigState };

const initialState: GameConfigState = {
	gameDuration: 10,
	showPresenterQr: true
};

/**
 * Domain: Game Configuration
 *
 * Global store for game configuration - parameters that define HOW the game plays
 * and host-level settings that affect all clients.
 * Synced across all clients. Typically modified by host before or during game.
 *
 * Use this store for:
 * - Game duration, round count
 * - Game settings/options changed by host
 * - Team configurations
 * - Dynamic questions/content for the game
 * - Pesenter display preferences (QR visibility, etc.)
 * - Any settings that affect dynamic game configuration and need to be synced globally
 *
 * Note: This is different from static `config` from `src/config/schema.ts` which is read-only and set at app build time. Game config store state is dynamic and can change during game.
 *
 * @see gameConfigActions for mutations
 */

export const gameConfigStore = kmClient.store<GameConfigState>(
	'game-config',
	initialState
);
