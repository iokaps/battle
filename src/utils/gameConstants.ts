/**
 * Game balance constants for the battle arena
 */

/** Arena dimensions */
export const ARENA_WIDTH = 1000;
export const ARENA_HEIGHT = 700;

/** Player properties */
export const PLAYER_RADIUS = 20;
export const PLAYER_COLLISION_RADIUS = PLAYER_RADIUS * 2; // minimum distance between player centers
export const PLAYER_MAX_HP = 100;
export const PLAYER_SPEED = 2.5; // units per tick (at 20 ticks/sec = same effective speed)
export const SHIELD_SPEED_PENALTY = 0.4; // multiplier when shielding (40% speed)

/** Attack properties */
export const ATTACK_DAMAGE = 15;
export const ATTACK_RANGE = 50; // distance in arena units
export const ATTACK_ARC_DEGREES = 90; // forward cone width in degrees
export const ATTACK_COOLDOWN_MS = 600; // milliseconds between attacks
export const ATTACK_VISUAL_DURATION_MS = 300; // how long attack visual shows on canvas

/** Ranged attack */
export const RANGED_ATTACK_DAMAGE = 20;
export const RANGED_ATTACK_COOLDOWN_MS = 3000; // 3-second cooldown
export const PROJECTILE_SPEED = 6; // units per tick
export const PROJECTILE_RADIUS = 6;
export const PROJECTILE_LIFETIME_MS = 3000; // max time before despawn
export const PROJECTILE_VISUAL_SIZE = 8; // visual radius on canvas

/** Shield */
export const SHIELD_COOLDOWN_MS = 5000; // cooldown after shield absorbs a hit

/** Knockback */
export const KNOCKBACK_FORCE = 12; // initial knockback velocity
export const KNOCKBACK_FRICTION = 0.85; // velocity multiplier per tick (decay) — higher at 20 ticks/sec

/** Countdown */
export const COUNTDOWN_DURATION_MS = 3000; // 3-second pre-game countdown

/** Input */
export const DEAD_ZONE = 0.15; // joystick dead zone threshold

/** Physics tick rate */
export const TICK_INTERVAL_MS = 50; // 20 ticks per second

/** Power-ups */
export const POWER_UP_SPAWN_INTERVAL_MS = 8000; // new power-up every 8s
export const POWER_UP_RADIUS = 12; // pickup collision radius
export const POWER_UP_HEALTH_AMOUNT = 30; // HP restored by health power-up
export const POWER_UP_DAMAGE_BOOST_MS = 5000; // duration of damage boost
export const POWER_UP_DAMAGE_MULTIPLIER = 1.5; // damage multiplier during boost
export const POWER_UP_MAX_ON_FIELD = 3; // max power-ups on arena at once

/** Kill streaks */
export const STREAK_TIMEOUT_MS = 10000; // streak resets if no kill within 10s
export const STREAK_ANNOUNCE_THRESHOLD = 3; // announce at 3+ kills

/** Emotes */
export const EMOTE_DISPLAY_DURATION_MS = 2000; // how long emote shows
export const EMOTE_MAX = 5; // max emotes stored
export const EMOTE_ICONS: Record<string, string> = {
	thumbsup: '👍',
	fist: '👊',
	laugh: '😂',
	skull: '💀'
};

/** Shrinking arena */
export const ARENA_SHRINK_START_MS = 30000; // shrinking starts after 30s
export const ARENA_SHRINK_RATE = 0.3; // radius shrink per tick (arena units)
export const ARENA_MIN_RADIUS = 80; // minimum arena circle radius
export const ARENA_SHRINK_DAMAGE = 2; // damage per tick when outside circle

/** Commentary */
export const COMMENTARY_MAX = 5; // max entries in ticker
export const COMMENTARY_DISPLAY_MS = 5000; // how long each entry shows

/** Team colors */
export const TEAM_COLORS: Record<
	number,
	{ primary: string; glow: string; name: string }
> = {
	1: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)', name: 'Blue' },
	2: { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', name: 'Red' }
};

/** Player color palette (supports up to 20 players) */
export const PLAYER_COLORS = [
	'#ef4444', // red
	'#3b82f6', // blue
	'#22c55e', // green
	'#f59e0b', // amber
	'#8b5cf6', // violet
	'#ec4899', // pink
	'#06b6d4', // cyan
	'#f97316', // orange
	'#14b8a6', // teal
	'#a855f7', // purple
	'#e11d48', // rose
	'#0ea5e9', // sky
	'#84cc16', // lime
	'#d946ef', // fuchsia
	'#64748b', // slate
	'#eab308', // yellow
	'#10b981', // emerald
	'#6366f1', // indigo
	'#f43f5e', // rose-500
	'#059669' // emerald-600
];

/** Kill feed max entries to keep */
export const KILL_FEED_MAX = 5;

/** Spawn margin from arena edges */
export const SPAWN_MARGIN = 50;

/** Post-game stats display delay */
export const STATS_DISPLAY_DELAY_MS = 2000;

/** Particle effects */
export const MAX_PARTICLES = 150;
