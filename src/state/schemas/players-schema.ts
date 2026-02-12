import { z } from '@kokimoki/kit';

/**
 * Schema for player entry
 */
export const playerEntrySchema = z.object({
	name: z.string(),
	/** Assigned color hex for arena display */
	color: z.string(),
	/** CDN URL of AI-generated avatar (empty if not yet generated) */
	avatarUrl: z.string(),
	/** Job ID for avatar generation (empty if not generating) */
	avatarJobId: z.string()
});

/**
 * Schema for players registry store
 */
export const playersStoreSchema = z.object({
	players: z.record(z.string(), playerEntrySchema)
});

export type PlayerEntry = z.infer<typeof playerEntrySchema>;
export type PlayersState = z.infer<typeof playersStoreSchema>;
