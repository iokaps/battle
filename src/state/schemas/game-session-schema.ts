import { z } from '@kokimoki/kit';

/**
 * Schema for game session store
 */
export const gameSessionStoreSchema = z.object({
	started: z.boolean(),
	startTimestamp: z.number(),
	/** Connection ID of the current global controller */
	controllerConnectionId: z.string()
});

export type GameSessionState = z.infer<typeof gameSessionStoreSchema>;
