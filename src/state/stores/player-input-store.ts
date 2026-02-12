import { kmClient } from '@/services/km-client';
import type { PlayerInputState } from '@/state/schemas';

export type { PlayerInputState };

const initialState: PlayerInputState = {
	inputs: {}
};

/**
 * Domain: Player Inputs
 *
 * Global store for all player inputs - joystick direction and button states.
 * Each player writes their own input entry; the global controller reads all inputs
 * to process the game physics.
 *
 * Synced across all clients. Players write on input change (throttled ~10-15/sec).
 *
 * @see playerInputActions for mutations
 */
export const playerInputStore = kmClient.store<PlayerInputState>(
	'player-inputs',
	initialState
);
