import { z } from '@kokimoki/kit';

/**
 * Schema for game configuration store
 */
export const gameConfigStoreSchema = z.object({
	/** Duration of the game in minutes */
	gameDuration: z.number(),
	/** Whether to display QR code on presenter screen */
	showPresenterQr: z.boolean()
});

export type GameConfigState = z.infer<typeof gameConfigStoreSchema>;
