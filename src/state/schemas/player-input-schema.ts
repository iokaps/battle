import { z } from '@kokimoki/kit';

/**
 * Schema for a single player's input state
 */
export const playerInputEntrySchema = z.object({
	/** Horizontal direction (-1 to 1) */
	dx: z.number(),
	/** Vertical direction (-1 to 1) */
	dy: z.number(),
	/** Whether attack button is pressed */
	attack: z.boolean(),
	/** Whether shield button is held */
	shield: z.boolean(),
	/** Whether ranged attack button is pressed */
	rangedAttack: z.boolean(),
	/** Emote to display (empty = none) */
	emote: z.string(),
	/** Server timestamp of last input update */
	timestamp: z.number()
});

/**
 * Schema for player inputs store
 * Record keyed by client ID
 */
export const playerInputStoreSchema = z.object({
	inputs: z.record(z.string(), playerInputEntrySchema)
});

export type PlayerInputEntry = z.infer<typeof playerInputEntrySchema>;
export type PlayerInputState = z.infer<typeof playerInputStoreSchema>;
