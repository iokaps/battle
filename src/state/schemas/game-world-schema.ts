import { z } from '@kokimoki/kit';

/**
 * Schema for a single player's world state (authoritative, written by controller)
 */
export const worldPlayerSchema = z.object({
	/** X position in arena */
	x: z.number(),
	/** Y position in arena */
	y: z.number(),
	/** Current health points */
	hp: z.number(),
	/** Maximum health points */
	maxHp: z.number(),
	/** Whether the player is currently shielding */
	shielding: z.boolean(),
	/** Server timestamp of last attack */
	lastAttackTime: z.number(),
	/** Player display name */
	name: z.string(),
	/** Assigned color hex */
	color: z.string(),
	/** CDN URL of AI-generated avatar (empty string if not yet generated) */
	avatarUrl: z.string(),
	/** Whether the player is alive */
	alive: z.boolean(),
	/** Number of kills */
	kills: z.number(),
	/** Direction the player is facing in radians */
	facingAngle: z.number(),
	/** Knockback velocity X component */
	knockbackVx: z.number(),
	/** Knockback velocity Y component */
	knockbackVy: z.number(),
	/** Server timestamp when shield was broken (0 = shield available) */
	shieldBrokenTime: z.number(),
	/** Team ID: 0 = no team (FFA), 1 = team 1, 2 = team 2 */
	teamId: z.number(),
	/** Current consecutive kill streak */
	currentStreak: z.number(),
	/** Server timestamp of last kill (for streak timeout) */
	lastKillTime: z.number(),
	/** Total damage dealt this game */
	damageDealt: z.number(),
	/** Total damage blocked by shield this game */
	damageBlocked: z.number(),
	/** Server timestamp of death (0 if alive) */
	deathTime: z.number(),
	/** Server timestamp when damage boost expires (0 = no boost) */
	damageBoostUntil: z.number(),
	/** Server timestamp of last ranged attack */
	lastRangedAttackTime: z.number()
});

/** Schema for a projectile in flight */
export const projectileSchema = z.object({
	/** Unique projectile ID */
	id: z.string(),
	/** Client ID of the player who fired it */
	ownerId: z.string(),
	/** Current X position */
	x: z.number(),
	/** Current Y position */
	y: z.number(),
	/** Velocity X */
	vx: z.number(),
	/** Velocity Y */
	vy: z.number(),
	/** Server timestamp when fired */
	createdAt: z.number()
});

/** Schema for a power-up item on the arena */
export const powerUpSchema = z.object({
	/** Unique power-up ID */
	id: z.string(),
	/** X position */
	x: z.number(),
	/** Y position */
	y: z.number(),
	/** Type of power-up */
	type: z.enum(['health', 'damage', 'shield']),
	/** Server timestamp when spawned */
	spawnedAt: z.number()
});

/** Schema for an emote broadcast */
export const emoteSchema = z.object({
	/** Unique emote ID */
	id: z.string(),
	/** Client ID of the player who emoted */
	playerId: z.string(),
	/** Emote type key */
	type: z.enum(['thumbsup', 'fist', 'laugh', 'skull']),
	/** Server timestamp */
	timestamp: z.number()
});

/** Schema for a streak announcement */
export const streakSchema = z.object({
	/** Unique streak ID */
	id: z.string(),
	/** Client ID of the player */
	playerId: z.string(),
	/** Player name */
	playerName: z.string(),
	/** Streak count */
	count: z.number(),
	/** Server timestamp */
	timestamp: z.number()
});

/** Schema for a presenter commentary entry */
export const commentarySchema = z.object({
	/** Unique commentary ID */
	id: z.string(),
	/** Commentary text */
	text: z.string(),
	/** Server timestamp */
	timestamp: z.number()
});

/** Schema for a kill feed entry */
export const killFeedEntrySchema = z.object({
	/** Unique kill feed entry ID */
	id: z.string(),
	/** Client ID of the killer */
	killerId: z.string(),
	/** Display name of the killer */
	killerName: z.string(),
	/** Client ID of the victim */
	victimId: z.string(),
	/** Display name of the victim */
	victimName: z.string(),
	/** Server timestamp */
	timestamp: z.number()
});

/**
 * Schema for the game world store (authoritative state, written only by global controller)
 */
export const gameWorldStoreSchema = z.object({
	/** All player world states, keyed by client ID */
	players: z.record(z.string(), worldPlayerSchema),
	/** Arena dimensions */
	arena: z.object({
		width: z.number(),
		height: z.number()
	}),
	/** Current arena radius for shrinking circle (0 = disabled) */
	arenaRadius: z.number(),
	/** Center of shrinking circle X */
	arenaCenterX: z.number(),
	/** Center of shrinking circle Y */
	arenaCenterY: z.number(),
	/** Current physics tick number */
	tick: z.number(),
	/** Whether the game has ended */
	gameOver: z.boolean(),
	/** Client ID of the winner (empty string if none yet) */
	winnerId: z.string(),
	/** Winning team ID (0 = no team win) */
	winnerTeamId: z.number(),
	/** Kill feed entries: recent eliminations */
	killFeed: z.record(z.string(), killFeedEntrySchema),
	/** Active projectiles */
	projectiles: z.record(z.string(), projectileSchema),
	/** Active power-ups on the arena */
	powerUps: z.record(z.string(), powerUpSchema),
	/** Recent emotes for display */
	emotes: z.record(z.string(), emoteSchema),
	/** Recent streak announcements */
	streaks: z.record(z.string(), streakSchema),
	/** Presenter commentary ticker */
	commentary: z.record(z.string(), commentarySchema)
});

export type WorldPlayer = z.infer<typeof worldPlayerSchema>;
export type GameWorldState = z.infer<typeof gameWorldStoreSchema>;
export type Projectile = z.infer<typeof projectileSchema>;
export type PowerUp = z.infer<typeof powerUpSchema>;
export type Emote = z.infer<typeof emoteSchema>;
export type Streak = z.infer<typeof streakSchema>;
export type Commentary = z.infer<typeof commentarySchema>;
export type KillFeedEntry = z.infer<typeof killFeedEntrySchema>;

/**
 * Local (in-memory) version of game world state that uses arrays
 * instead of records for collections. Used for physics processing.
 * Converted to/from the record-based GameWorldState at sync boundaries.
 */
export type LocalGameWorldState = Omit<
	GameWorldState,
	'killFeed' | 'projectiles' | 'powerUps' | 'emotes' | 'streaks' | 'commentary'
> & {
	killFeed: KillFeedEntry[];
	projectiles: Projectile[];
	powerUps: PowerUp[];
	emotes: Emote[];
	streaks: Streak[];
	commentary: Commentary[];
};
