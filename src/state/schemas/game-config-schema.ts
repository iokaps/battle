import { z } from '@kokimoki/kit';

/**
 * Schema for game configuration store
 */
export const gameConfigStoreSchema = z.object({
	/** Duration of the game in minutes */
	gameDuration: z.number(),
	/** Whether to display QR code on presenter screen */
	showPresenterQr: z.boolean(),
	/** Team mode: 'ffa' = free-for-all, 'teams' = 2-team mode */
	teamMode: z.enum(['ffa', 'teams']),
	/** Whether the arena shrinks over time */
	shrinkingArena: z.boolean()
});

export type GameConfigState = z.infer<typeof gameConfigStoreSchema>;
