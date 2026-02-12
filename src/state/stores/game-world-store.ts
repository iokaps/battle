import { kmClient } from '@/services/km-client';
import type { GameWorldState } from '@/state/schemas';
import { ARENA_HEIGHT, ARENA_WIDTH } from '@/utils/gameConstants';

export type { GameWorldState };

const initialState: GameWorldState = {
	players: {},
	arena: {
		width: ARENA_WIDTH,
		height: ARENA_HEIGHT
	},
	arenaRadius: 0,
	arenaCenterX: ARENA_WIDTH / 2,
	arenaCenterY: ARENA_HEIGHT / 2,
	tick: 0,
	gameOver: false,
	winnerId: '',
	winnerTeamId: 0,
	killFeed: {},
	projectiles: {},
	powerUps: {},
	emotes: {},
	streaks: {},
	commentary: {}
};

/**
 * Domain: Game World
 *
 * Global store for the authoritative game world state.
 * Only the global controller writes to this store.
 * All clients (presenter, players, host) read from it to render the arena.
 *
 * Contains all player positions, health, status, arena dimensions,
 * and game-over state.
 *
 * @see gameWorldActions for mutations (controller-only)
 */
export const gameWorldStore = kmClient.store<GameWorldState>(
	'game-world',
	initialState
);
