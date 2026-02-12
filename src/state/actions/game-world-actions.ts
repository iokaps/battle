import { kmClient } from '@/services/km-client';
import type {
	LocalGameWorldState,
	Projectile,
	WorldPlayer
} from '@/state/schemas';
import { gameConfigStore } from '@/state/stores/game-config-store';
import { playersStore } from '@/state/stores/players-store';
import {
	ARENA_HEIGHT,
	ARENA_MIN_RADIUS,
	ARENA_SHRINK_DAMAGE,
	ARENA_SHRINK_RATE,
	ARENA_SHRINK_START_MS,
	ARENA_WIDTH,
	ATTACK_ARC_DEGREES,
	ATTACK_COOLDOWN_MS,
	ATTACK_DAMAGE,
	ATTACK_RANGE,
	COMMENTARY_MAX,
	DEAD_ZONE,
	EMOTE_DISPLAY_DURATION_MS,
	EMOTE_MAX,
	KILL_FEED_MAX,
	KNOCKBACK_FORCE,
	KNOCKBACK_FRICTION,
	PLAYER_COLLISION_RADIUS,
	PLAYER_MAX_HP,
	PLAYER_RADIUS,
	PLAYER_SPEED,
	POWER_UP_DAMAGE_BOOST_MS,
	POWER_UP_DAMAGE_MULTIPLIER,
	POWER_UP_HEALTH_AMOUNT,
	POWER_UP_MAX_ON_FIELD,
	POWER_UP_RADIUS,
	POWER_UP_SPAWN_INTERVAL_MS,
	PROJECTILE_LIFETIME_MS,
	PROJECTILE_RADIUS,
	PROJECTILE_SPEED,
	RANGED_ATTACK_COOLDOWN_MS,
	RANGED_ATTACK_DAMAGE,
	SHIELD_COOLDOWN_MS,
	SHIELD_SPEED_PENALTY,
	SPAWN_MARGIN,
	STREAK_ANNOUNCE_THRESHOLD,
	STREAK_TIMEOUT_MS
} from '@/utils/gameConstants';
import { gameWorldStore } from '../stores/game-world-store';
import { playerInputStore } from '../stores/player-input-store';

/** Convert degrees to radians */
const degToRad = (deg: number) => (deg * Math.PI) / 180;

/** Half attack arc in radians */
const ATTACK_HALF_ARC = degToRad(ATTACK_ARC_DEGREES / 2);

/** Counter for unique projectile IDs */
let _projectileIdCounter = 0;
/** Counter for unique power-up IDs */
let _powerUpIdCounter = 0;
/** Counter for unique emote IDs */
let _emoteIdCounter = 0;
/** Counter for unique streak IDs */
let _streakIdCounter = 0;
/** Counter for unique commentary IDs */
let _commentaryIdCounter = 0;
/** Counter for unique kill-feed IDs */
let _killFeedIdCounter = 0;
/** Timestamp of last power-up spawn */
let _lastPowerUpSpawn = 0;
/** Game start timestamp (for shrink timing) */
let _gameStartTime = 0;

/**
 * Check if a target is within the attacker's directional cone.
 */
function isInAttackCone(
	attackerX: number,
	attackerY: number,
	facingAngle: number,
	targetX: number,
	targetY: number
): boolean {
	const dx = targetX - attackerX;
	const dy = targetY - attackerY;
	const angleToTarget = Math.atan2(dy, dx);

	let diff = angleToTarget - facingAngle;
	while (diff > Math.PI) diff -= 2 * Math.PI;
	while (diff < -Math.PI) diff += 2 * Math.PI;

	return Math.abs(diff) <= ATTACK_HALF_ARC;
}

/**
 * Resolve collision between two player circles.
 */
function resolveCollision(
	a: WorldPlayer,
	b: WorldPlayer,
	minDist: number
): void {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const dist = Math.sqrt(dx * dx + dy * dy);
	if (dist === 0 || dist >= minDist) return;

	const overlap = (minDist - dist) / 2;
	const nx = dx / dist;
	const ny = dy / dist;

	a.x -= nx * overlap;
	a.y -= ny * overlap;
	b.x += nx * overlap;
	b.y += ny * overlap;
}

/** Generate a random spawn position inside the arena */
function randomSpawnPos(): { x: number; y: number } {
	return {
		x: SPAWN_MARGIN + Math.random() * (ARENA_WIDTH - 2 * SPAWN_MARGIN),
		y: SPAWN_MARGIN + Math.random() * (ARENA_HEIGHT - 2 * SPAWN_MARGIN)
	};
}

/** Power-up type rotation */
const POWER_UP_TYPES = ['health', 'damage', 'shield'] as const;

/** Convert an array of objects with `id` to a record keyed by id */
function arrayToRecord<T extends { id: string }>(arr: T[]): Record<string, T> {
	const record: Record<string, T> = {};
	for (const item of arr) {
		record[item.id] = item;
	}
	return record;
}

// ─── In-memory authoritative world state ───
let _localWorld: LocalGameWorldState | null = null;

/**
 * Actions for game world mutations.
 * These are called exclusively by the global controller.
 */
export const gameWorldActions = {
	/** Get the in-memory authoritative world state (controller only) */
	getLocalWorld(): LocalGameWorldState | null {
		return _localWorld;
	},

	/** Hydrate local world from the store proxy (used when a new controller takes over) */
	hydrateFromStore() {
		const proxy = gameWorldStore.proxy;
		_localWorld = {
			arena: { width: proxy.arena.width, height: proxy.arena.height },
			arenaRadius: proxy.arenaRadius,
			arenaCenterX: proxy.arenaCenterX,
			arenaCenterY: proxy.arenaCenterY,
			tick: proxy.tick,
			gameOver: proxy.gameOver,
			winnerId: proxy.winnerId,
			winnerTeamId: proxy.winnerTeamId,
			killFeed: Object.values(proxy.killFeed).map((e) => ({ ...e })),
			projectiles: Object.values(proxy.projectiles).map((p) => ({ ...p })),
			powerUps: Object.values(proxy.powerUps).map((p) => ({ ...p })),
			emotes: Object.values(proxy.emotes).map((e) => ({ ...e })),
			streaks: Object.values(proxy.streaks).map((s) => ({ ...s })),
			commentary: Object.values(proxy.commentary).map((c) => ({ ...c })),
			players: {}
		};
		for (const [id, p] of Object.entries(proxy.players)) {
			_localWorld.players[id] = {
				x: p.x,
				y: p.y,
				hp: p.hp,
				maxHp: p.maxHp,
				shielding: p.shielding,
				lastAttackTime: p.lastAttackTime,
				name: p.name,
				color: p.color,
				avatarUrl: p.avatarUrl,
				alive: p.alive,
				kills: p.kills,
				facingAngle: p.facingAngle,
				knockbackVx: p.knockbackVx,
				knockbackVy: p.knockbackVy,
				shieldBrokenTime: p.shieldBrokenTime,
				teamId: p.teamId,
				currentStreak: p.currentStreak,
				lastKillTime: p.lastKillTime,
				damageDealt: p.damageDealt,
				damageBlocked: p.damageBlocked,
				deathTime: p.deathTime,
				damageBoostUntil: p.damageBoostUntil,
				lastRangedAttackTime: p.lastRangedAttackTime
			};
		}
	},

	/**
	 * Initialize the world state with all registered players.
	 * Spawns players in a circle around the center of the arena.
	 * Handles team assignment if team mode is enabled.
	 */
	async initializeWorld() {
		const players = playersStore.proxy.players;
		const playerIds = Object.keys(players);
		const config = gameConfigStore.proxy;
		const isTeamMode = config.teamMode === 'teams';

		const centerX = ARENA_WIDTH / 2;
		const centerY = ARENA_HEIGHT / 2;
		const spawnRadius = Math.min(ARENA_WIDTH, ARENA_HEIGHT) / 2 - SPAWN_MARGIN;

		// Auto-balance teams
		const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

		const worldPlayers: Record<string, WorldPlayer> = {};
		shuffled.forEach((id, index) => {
			const angle = (2 * Math.PI * index) / playerIds.length;
			const x = centerX + spawnRadius * Math.cos(angle);
			const y = centerY + spawnRadius * Math.sin(angle);
			const player = players[id];

			worldPlayers[id] = {
				x,
				y,
				hp: PLAYER_MAX_HP,
				maxHp: PLAYER_MAX_HP,
				shielding: false,
				lastAttackTime: 0,
				name: player?.name || 'Unknown',
				color: player?.color || '#6b7280',
				avatarUrl: player?.avatarUrl || '',
				alive: true,
				kills: 0,
				facingAngle: Math.atan2(-Math.sin(angle), -Math.cos(angle)),
				knockbackVx: 0,
				knockbackVy: 0,
				shieldBrokenTime: 0,
				teamId: isTeamMode ? (index % 2) + 1 : 0,
				currentStreak: 0,
				lastKillTime: 0,
				damageDealt: 0,
				damageBlocked: 0,
				deathTime: 0,
				damageBoostUntil: 0,
				lastRangedAttackTime: 0
			};
		});

		// Determine initial arena radius for shrinking mode
		const shrinkEnabled = config.shrinkingArena;
		const initialRadius = shrinkEnabled
			? Math.max(ARENA_WIDTH, ARENA_HEIGHT)
			: 0;

		_localWorld = {
			arena: { width: ARENA_WIDTH, height: ARENA_HEIGHT },
			arenaRadius: initialRadius,
			arenaCenterX: centerX,
			arenaCenterY: centerY,
			tick: 0,
			gameOver: false,
			winnerId: '',
			winnerTeamId: 0,
			killFeed: [],
			projectiles: [],
			powerUps: [],
			emotes: [],
			streaks: [],
			commentary: [],
			players: worldPlayers
		};

		_projectileIdCounter = 0;
		_powerUpIdCounter = 0;
		_emoteIdCounter = 0;
		_streakIdCounter = 0;
		_commentaryIdCounter = 0;
		_killFeedIdCounter = 0;
		_lastPowerUpSpawn = 0;
		_gameStartTime = kmClient.serverTimestamp();

		// Sync initial state to the store
		await kmClient.transact([gameWorldStore], ([ws]) => {
			Object.assign(ws, {
				arena: { width: ARENA_WIDTH, height: ARENA_HEIGHT },
				arenaRadius: initialRadius,
				arenaCenterX: centerX,
				arenaCenterY: centerY,
				tick: 0,
				gameOver: false,
				winnerId: '',
				winnerTeamId: 0,
				killFeed: {},
				projectiles: {},
				powerUps: {},
				emotes: {},
				streaks: {},
				commentary: {},
				players: worldPlayers
			});
		});
	},

	/**
	 * Process one physics tick on in-memory state (synchronous, no network).
	 */
	processTickLocal(serverTime: number) {
		if (!_localWorld) return;

		const inputs = playerInputStore.proxy.inputs;
		const config = gameConfigStore.proxy;
		const worldState = _localWorld;
		const worldPlayers = worldState.players;
		const isTeamMode = config.teamMode === 'teams';
		worldState.tick += 1;

		// ──── Phase 1: Movement + facing ────
		for (const [id, player] of Object.entries(worldPlayers)) {
			if (!player.alive) continue;

			const input = inputs[id];
			if (!input) continue;

			// Update shield state (blocked during cooldown)
			const shieldOnCooldown =
				player.shieldBrokenTime > 0 &&
				serverTime - player.shieldBrokenTime < SHIELD_COOLDOWN_MS;
			player.shielding = input.shield && !shieldOnCooldown;

			// Apply joystick movement with dead zone
			const dx = input.dx;
			const dy = input.dy;
			const magnitude = Math.sqrt(dx * dx + dy * dy);

			if (magnitude > DEAD_ZONE) {
				const normalizedDx = dx / magnitude;
				const normalizedDy = dy / magnitude;
				const speed = input.shield
					? PLAYER_SPEED * SHIELD_SPEED_PENALTY
					: PLAYER_SPEED;

				const scaledMag = (magnitude - DEAD_ZONE) / (1 - DEAD_ZONE);
				const appliedSpeed = speed * Math.min(scaledMag, 1);

				player.x += normalizedDx * appliedSpeed;
				player.y += normalizedDy * appliedSpeed;

				player.facingAngle = Math.atan2(normalizedDy, normalizedDx);
			}

			// Apply knockback velocity
			if (
				Math.abs(player.knockbackVx) > 0.1 ||
				Math.abs(player.knockbackVy) > 0.1
			) {
				player.x += player.knockbackVx;
				player.y += player.knockbackVy;
				player.knockbackVx *= KNOCKBACK_FRICTION;
				player.knockbackVy *= KNOCKBACK_FRICTION;
			} else {
				player.knockbackVx = 0;
				player.knockbackVy = 0;
			}

			// Clamp to arena bounds
			player.x = Math.max(
				PLAYER_RADIUS,
				Math.min(worldState.arena.width - PLAYER_RADIUS, player.x)
			);
			player.y = Math.max(
				PLAYER_RADIUS,
				Math.min(worldState.arena.height - PLAYER_RADIUS, player.y)
			);
		}

		// ──── Phase 2: Player-to-player collision ────
		const aliveIds = Object.entries(worldPlayers)
			.filter(([, p]) => p.alive)
			.map(([id]) => id);

		for (let i = 0; i < aliveIds.length; i++) {
			for (let j = i + 1; j < aliveIds.length; j++) {
				const a = worldPlayers[aliveIds[i]];
				const b = worldPlayers[aliveIds[j]];
				resolveCollision(a, b, PLAYER_COLLISION_RADIUS);
			}
		}

		// Re-clamp after collision resolution
		for (const id of aliveIds) {
			const p = worldPlayers[id];
			p.x = Math.max(
				PLAYER_RADIUS,
				Math.min(worldState.arena.width - PLAYER_RADIUS, p.x)
			);
			p.y = Math.max(
				PLAYER_RADIUS,
				Math.min(worldState.arena.height - PLAYER_RADIUS, p.y)
			);
		}

		// ──── Phase 3: Melee attacks ────
		for (const [id, player] of Object.entries(worldPlayers)) {
			if (!player.alive) continue;

			const input = inputs[id];
			if (!input) continue;

			if (input.attack && !input.shield) {
				const cooldownReady =
					serverTime - player.lastAttackTime > ATTACK_COOLDOWN_MS;
				if (cooldownReady) {
					player.lastAttackTime = serverTime;

					// Damage multiplier from power-up
					const hasDmgBoost =
						player.damageBoostUntil > 0 && serverTime < player.damageBoostUntil;
					const dmgMult = hasDmgBoost ? POWER_UP_DAMAGE_MULTIPLIER : 1;

					for (const [targetId, target] of Object.entries(worldPlayers)) {
						if (targetId === id || !target.alive) continue;
						// Skip teammates
						if (
							isTeamMode &&
							player.teamId > 0 &&
							player.teamId === target.teamId
						)
							continue;

						const distX = target.x - player.x;
						const distY = target.y - player.y;
						const dist = Math.sqrt(distX * distX + distY * distY);

						if (dist > ATTACK_RANGE) continue;

						if (
							!isInAttackCone(
								player.x,
								player.y,
								player.facingAngle,
								target.x,
								target.y
							)
						)
							continue;

						const actualDmg = Math.round(ATTACK_DAMAGE * dmgMult);

						// Shield blocks damage but breaks on hit
						if (target.shielding) {
							target.shielding = false;
							target.shieldBrokenTime = serverTime;
							target.damageBlocked += actualDmg;
						} else {
							target.hp -= actualDmg;
							player.damageDealt += actualDmg;
						}

						// Apply knockback
						const kbMult = target.shieldBrokenTime === serverTime ? 0.3 : 1;
						const kbAngle = Math.atan2(distY, distX);
						target.knockbackVx += Math.cos(kbAngle) * KNOCKBACK_FORCE * kbMult;
						target.knockbackVy += Math.sin(kbAngle) * KNOCKBACK_FORCE * kbMult;

						// Check for kill
						if (target.hp <= 0) {
							this._handleKill(id, player, targetId, target, serverTime);
						}
					}
				}
			}

			// ── Ranged attack ──
			if (input.rangedAttack && !input.shield) {
				const rangedReady =
					serverTime - player.lastRangedAttackTime > RANGED_ATTACK_COOLDOWN_MS;
				if (rangedReady) {
					player.lastRangedAttackTime = serverTime;
					_projectileIdCounter++;
					const proj: Projectile = {
						id: `p${_projectileIdCounter}`,
						ownerId: id,
						x:
							player.x +
							Math.cos(player.facingAngle) *
								(PLAYER_RADIUS + PROJECTILE_RADIUS),
						y:
							player.y +
							Math.sin(player.facingAngle) *
								(PLAYER_RADIUS + PROJECTILE_RADIUS),
						vx: Math.cos(player.facingAngle) * PROJECTILE_SPEED,
						vy: Math.sin(player.facingAngle) * PROJECTILE_SPEED,
						createdAt: serverTime
					};
					worldState.projectiles.push(proj);
				}
			}

			// ── Emote handling ──
			if (input.emote && input.emote !== '') {
				// Check if this emote is already in recent emotes
				const alreadyEmoted = worldState.emotes.some(
					(e) =>
						e.playerId === id &&
						e.type === input.emote &&
						serverTime - e.timestamp < 1000
				);
				if (!alreadyEmoted) {
					_emoteIdCounter++;
					worldState.emotes.push({
						id: `em${_emoteIdCounter}`,
						playerId: id,
						type: input.emote as 'thumbsup' | 'fist' | 'laugh' | 'skull',
						timestamp: serverTime
					});
					if (worldState.emotes.length > EMOTE_MAX) {
						worldState.emotes = worldState.emotes.slice(-EMOTE_MAX);
					}
				}
			}
		}

		// ──── Phase 3b: Projectile movement + collision ────
		const aliveProjectiles: Projectile[] = [];
		for (const proj of worldState.projectiles) {
			// Move projectile
			proj.x += proj.vx;
			proj.y += proj.vy;

			// Check lifetime
			if (serverTime - proj.createdAt > PROJECTILE_LIFETIME_MS) continue;

			// Check bounds
			if (
				proj.x < 0 ||
				proj.x > worldState.arena.width ||
				proj.y < 0 ||
				proj.y > worldState.arena.height
			)
				continue;

			// Check collision with players
			let hit = false;
			for (const [targetId, target] of Object.entries(worldPlayers)) {
				if (targetId === proj.ownerId || !target.alive) continue;
				// Skip teammates
				const owner = worldPlayers[proj.ownerId];
				if (
					isTeamMode &&
					owner &&
					owner.teamId > 0 &&
					owner.teamId === target.teamId
				)
					continue;

				const dx = target.x - proj.x;
				const dy = target.y - proj.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < PLAYER_RADIUS + PROJECTILE_RADIUS) {
					// Hit!
					const hasDmgBoost =
						owner &&
						owner.damageBoostUntil > 0 &&
						serverTime < owner.damageBoostUntil;
					const dmgMult = hasDmgBoost ? POWER_UP_DAMAGE_MULTIPLIER : 1;
					const actualDmg = Math.round(RANGED_ATTACK_DAMAGE * dmgMult);

					if (target.shielding) {
						target.shielding = false;
						target.shieldBrokenTime = serverTime;
						target.damageBlocked += actualDmg;
					} else {
						target.hp -= actualDmg;
						if (owner) owner.damageDealt += actualDmg;
					}

					// Knockback
					const kbMult = target.shieldBrokenTime === serverTime ? 0.3 : 1;
					const kbAngle = Math.atan2(dy, dx);
					target.knockbackVx +=
						Math.cos(kbAngle) * KNOCKBACK_FORCE * 0.6 * kbMult;
					target.knockbackVy +=
						Math.sin(kbAngle) * KNOCKBACK_FORCE * 0.6 * kbMult;

					if (target.hp <= 0 && owner) {
						this._handleKill(proj.ownerId, owner, targetId, target, serverTime);
					}

					hit = true;
					break;
				}
			}
			if (!hit) {
				aliveProjectiles.push(proj);
			}
		}
		worldState.projectiles = aliveProjectiles;

		// ──── Phase 4: Power-up spawning + pickup ────
		if (
			worldState.powerUps.length < POWER_UP_MAX_ON_FIELD &&
			serverTime - _lastPowerUpSpawn > POWER_UP_SPAWN_INTERVAL_MS
		) {
			_lastPowerUpSpawn = serverTime;
			_powerUpIdCounter++;
			const pos = randomSpawnPos();
			const type = POWER_UP_TYPES[_powerUpIdCounter % POWER_UP_TYPES.length];
			worldState.powerUps.push({
				id: `pu${_powerUpIdCounter}`,
				x: pos.x,
				y: pos.y,
				type,
				spawnedAt: serverTime
			});
		}

		// Check player pickup
		const remainingPowerUps = worldState.powerUps.filter((pu) => {
			for (const [, player] of Object.entries(worldPlayers)) {
				if (!player.alive) continue;
				const dx = player.x - pu.x;
				const dy = player.y - pu.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < PLAYER_RADIUS + POWER_UP_RADIUS) {
					// Picked up!
					switch (pu.type) {
						case 'health':
							player.hp = Math.min(
								player.maxHp,
								player.hp + POWER_UP_HEALTH_AMOUNT
							);
							break;
						case 'damage':
							player.damageBoostUntil = serverTime + POWER_UP_DAMAGE_BOOST_MS;
							break;
						case 'shield':
							player.shieldBrokenTime = 0; // reset shield cooldown
							break;
					}
					return false; // remove this power-up
				}
			}
			return true;
		});
		worldState.powerUps = remainingPowerUps;

		// ──── Phase 5: Shrinking arena ────
		if (config.shrinkingArena && worldState.arenaRadius > 0) {
			const elapsed = serverTime - _gameStartTime;
			if (elapsed > ARENA_SHRINK_START_MS) {
				worldState.arenaRadius = Math.max(
					ARENA_MIN_RADIUS,
					worldState.arenaRadius - ARENA_SHRINK_RATE
				);

				// Damage players outside the circle
				for (const [, player] of Object.entries(worldPlayers)) {
					if (!player.alive) continue;
					const dx = player.x - worldState.arenaCenterX;
					const dy = player.y - worldState.arenaCenterY;
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist > worldState.arenaRadius) {
						player.hp -= ARENA_SHRINK_DAMAGE;
						if (player.hp <= 0) {
							player.hp = 0;
							player.alive = false;
							player.deathTime = serverTime;
						}
					}
				}
			}
		}

		// ──── Phase 6: Streak timeout ────
		for (const [, player] of Object.entries(worldPlayers)) {
			if (
				player.currentStreak > 0 &&
				player.lastKillTime > 0 &&
				serverTime - player.lastKillTime > STREAK_TIMEOUT_MS
			) {
				player.currentStreak = 0;
			}
		}

		// ──── Phase 7: Clean up old emotes ────
		worldState.emotes = worldState.emotes.filter(
			(e) => serverTime - e.timestamp < EMOTE_DISPLAY_DURATION_MS
		);

		// ──── Phase 8: Game-end condition ────
		const alivePlayers = Object.entries(worldPlayers).filter(
			([, p]) => p.alive
		);

		if (isTeamMode) {
			// Team mode: check if all alive players are on the same team
			const aliveTeams = new Set(alivePlayers.map(([, p]) => p.teamId));
			if (
				aliveTeams.size <= 1 &&
				alivePlayers.length > 0 &&
				Object.keys(worldPlayers).length > 1
			) {
				worldState.gameOver = true;
				worldState.winnerTeamId = alivePlayers[0]?.[1].teamId ?? 0;
			} else if (
				alivePlayers.length === 0 &&
				Object.keys(worldPlayers).length > 1
			) {
				worldState.gameOver = true;
			}
		} else {
			// FFA mode
			if (alivePlayers.length <= 1 && Object.keys(worldPlayers).length > 1) {
				worldState.gameOver = true;
				if (alivePlayers.length === 1) {
					worldState.winnerId = alivePlayers[0][0];
				}
			}
		}
	},

	/** Internal: handle a kill, update streaks, kill feed, commentary */
	_handleKill(
		killerId: string,
		killer: WorldPlayer,
		victimId: string,
		victim: WorldPlayer,
		serverTime: number
	) {
		const worldState = _localWorld!;
		victim.hp = 0;
		victim.alive = false;
		victim.deathTime = serverTime;
		killer.kills += 1;
		killer.currentStreak += 1;
		killer.lastKillTime = serverTime;

		// Kill feed
		_killFeedIdCounter++;
		const feedEntry = {
			id: `kf${_killFeedIdCounter}`,
			killerId,
			killerName: killer.name,
			victimId,
			victimName: victim.name,
			timestamp: serverTime
		};
		worldState.killFeed = [feedEntry, ...worldState.killFeed].slice(
			0,
			KILL_FEED_MAX
		);

		// Streak announcement
		if (killer.currentStreak >= STREAK_ANNOUNCE_THRESHOLD) {
			_streakIdCounter++;
			worldState.streaks.push({
				id: `st${_streakIdCounter}`,
				playerId: killerId,
				playerName: killer.name,
				count: killer.currentStreak,
				timestamp: serverTime
			});
			if (worldState.streaks.length > 5) {
				worldState.streaks = worldState.streaks.slice(-5);
			}
		}

		// Commentary
		const commentaryTexts: string[] = [];
		if (killer.currentStreak === 3) {
			commentaryTexts.push(`${killer.name} is on a KILLING SPREE!`);
		} else if (killer.currentStreak === 5) {
			commentaryTexts.push(`${killer.name} is UNSTOPPABLE!`);
		} else if (killer.currentStreak >= 7) {
			commentaryTexts.push(
				`${killer.name} is GODLIKE! ${killer.currentStreak} kills!`
			);
		}

		// First blood detection
		const totalKills = Object.values(worldState.players).reduce(
			(s, p) => s + p.kills,
			0
		);
		if (totalKills === 1) {
			commentaryTexts.push(`${killer.name} draws FIRST BLOOD!`);
		}

		for (const text of commentaryTexts) {
			_commentaryIdCounter++;
			worldState.commentary.push({
				id: `co${_commentaryIdCounter}`,
				text,
				timestamp: serverTime
			});
			if (worldState.commentary.length > COMMENTARY_MAX) {
				worldState.commentary = worldState.commentary.slice(-COMMENTARY_MAX);
			}
		}
	},

	/**
	 * Sync in-memory world state to the Kokimoki store (fire-and-forget).
	 */
	syncToStore() {
		if (!_localWorld) return;
		const local = _localWorld;

		kmClient
			.transact([gameWorldStore], ([ws]) => {
				ws.tick = local.tick;
				ws.gameOver = local.gameOver;
				ws.winnerId = local.winnerId;
				ws.winnerTeamId = local.winnerTeamId;
				ws.killFeed = arrayToRecord(local.killFeed);
				ws.arena = local.arena;
				ws.arenaRadius = local.arenaRadius;
				ws.arenaCenterX = local.arenaCenterX;
				ws.arenaCenterY = local.arenaCenterY;
				ws.projectiles = arrayToRecord(local.projectiles);
				ws.powerUps = arrayToRecord(local.powerUps);
				ws.emotes = arrayToRecord(local.emotes);
				ws.streaks = arrayToRecord(local.streaks);
				ws.commentary = arrayToRecord(local.commentary);

				// Sync each player's state
				const localIds = new Set(Object.keys(local.players));
				for (const [id, lp] of Object.entries(local.players)) {
					if (!ws.players[id]) {
						ws.players[id] = { ...lp };
					} else {
						const wp = ws.players[id];
						wp.x = lp.x;
						wp.y = lp.y;
						wp.hp = lp.hp;
						wp.alive = lp.alive;
						wp.shielding = lp.shielding;
						wp.kills = lp.kills;
						wp.facingAngle = lp.facingAngle;
						wp.knockbackVx = lp.knockbackVx;
						wp.knockbackVy = lp.knockbackVy;
						wp.lastAttackTime = lp.lastAttackTime;
						wp.shieldBrokenTime = lp.shieldBrokenTime;
						wp.teamId = lp.teamId;
						wp.currentStreak = lp.currentStreak;
						wp.lastKillTime = lp.lastKillTime;
						wp.damageDealt = lp.damageDealt;
						wp.damageBlocked = lp.damageBlocked;
						wp.deathTime = lp.deathTime;
						wp.damageBoostUntil = lp.damageBoostUntil;
						wp.lastRangedAttackTime = lp.lastRangedAttackTime;
					}
				}
				// Remove players no longer in local state
				for (const id of Object.keys(ws.players)) {
					if (!localIds.has(id)) {
						delete ws.players[id];
					}
				}
			})
			.catch(() => {
				/* swallow sync errors — next sync will catch up */
			});
	},

	/** Reset the game world (local + store) */
	async resetWorld() {
		_localWorld = null;
		await kmClient.transact([gameWorldStore], ([ws]) => {
			ws.players = {};
			ws.tick = 0;
			ws.gameOver = false;
			ws.winnerId = '';
			ws.winnerTeamId = 0;
			ws.killFeed = {};
			ws.projectiles = {};
			ws.powerUps = {};
			ws.emotes = {};
			ws.streaks = {};
			ws.commentary = {};
			ws.arenaRadius = 0;
		});
	}
};
