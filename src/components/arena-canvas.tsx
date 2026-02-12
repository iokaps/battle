import { kmClient } from '@/services/km-client';
import { gameWorldStore } from '@/state/stores/game-world-store';
import {
	ATTACK_ARC_DEGREES,
	ATTACK_RANGE,
	ATTACK_VISUAL_DURATION_MS,
	COMMENTARY_DISPLAY_MS,
	EMOTE_DISPLAY_DURATION_MS,
	EMOTE_ICONS,
	PLAYER_RADIUS,
	POWER_UP_RADIUS,
	PROJECTILE_VISUAL_SIZE,
	TEAM_COLORS
} from '@/utils/gameConstants';
import { particleSystem } from '@/utils/particleSystem';
import * as React from 'react';

interface CachedImage {
	img: HTMLImageElement;
	loaded: boolean;
}

const DEG_TO_RAD = Math.PI / 180;
const ATTACK_HALF_ARC_RAD = (ATTACK_ARC_DEGREES / 2) * DEG_TO_RAD;

/**
 * Interpolation smoothing factor.
 * Positions lerp toward the target each frame at this rate — higher = snappier, lower = smoother.
 */
const LERP_SPEED = 12;

/** Neon theme palette */
const THEME = {
	bg: '#0b1120',
	surface: '#151d2e',
	grid: 'rgba(34, 211, 238, 0.06)',
	border: 'rgba(34, 211, 238, 0.25)',
	borderGlow: 'rgba(34, 211, 238, 0.15)',
	shieldColor: '#22d3ee',
	shieldGlow: 'rgba(34, 211, 238, 0.5)',
	attackColor: '#fbbf24',
	attackGlow: 'rgba(251, 191, 36, 0.6)',
	hpHigh: '#4ade80',
	hpMid: '#fbbf24',
	hpLow: '#f87171',
	nameLabel: 'rgba(15, 23, 42, 0.8)',
	nameLabelBorder: 'rgba(255, 255, 255, 0.08)',
	deathRing: 'rgba(248, 113, 113, 0.6)',
	knockbackTrail: 'rgba(248, 113, 113, 0.15)'
};

/**
 * Full-screen Canvas 2D arena renderer for the presenter view.
 * Dark neon aesthetic with directional indicators, attack cone visuals,
 * shield glow, knockback trails, and death ring effects.
 *
 * Performance optimizations:
 * - Static background (gradient + grid + border) cached to offscreen canvas
 * - Exponential lerp interpolation for smooth 60fps movement from ~10 tick/s state
 * - Gradient objects avoided per-frame where possible
 */
export function ArenaCanvas() {
	const canvasRef = React.useRef<HTMLCanvasElement>(null);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const imageCache = React.useRef<Map<string, CachedImage>>(new Map());

	// Smooth interpolated positions (lerped every frame toward target)
	const smoothPositions = React.useRef<
		Record<string, { x: number; y: number }>
	>({});
	// Track death timestamps for death ring effect
	const deathTimestamps = React.useRef<Record<string, number>>({});

	// Cached static background
	const bgCacheRef = React.useRef<{
		canvas: OffscreenCanvas | HTMLCanvasElement;
		width: number;
		height: number;
		arenaW: number;
		arenaH: number;
	} | null>(null);

	// Previous frame timestamp for delta-time
	const lastFrameRef = React.useRef(0);

	// Previous state tracking for particle event detection
	const prevPlayerHp = React.useRef<Record<string, number>>({});
	const prevPlayerAlive = React.useRef<Record<string, boolean>>({});
	const prevPlayerShielding = React.useRef<Record<string, boolean>>({});
	const prevPowerUpIds = React.useRef<Set<string>>(new Set());
	const prevProjectileIds = React.useRef<Set<string>>(new Set());

	// Cache avatar images reactively
	React.useEffect(() => {
		const players = gameWorldStore.proxy.players;
		for (const [, player] of Object.entries(players)) {
			const url = player.avatarUrl;
			if (url && !imageCache.current.has(url)) {
				const img = new Image();
				img.crossOrigin = 'anonymous';
				const entry: CachedImage = { img, loaded: false };
				imageCache.current.set(url, entry);
				img.onload = () => {
					entry.loaded = true;
				};
				img.src = url;
			}
		}
	});

	// Canvas resize
	React.useEffect(() => {
		const handleResize = () => {
			const canvas = canvasRef.current;
			const container = containerRef.current;
			if (!canvas || !container) return;
			const dpr = window.devicePixelRatio || 1;
			const w = container.clientWidth;
			const h = container.clientHeight;
			canvas.width = w * dpr;
			canvas.height = h * dpr;
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
			// Invalidate background cache on resize
			bgCacheRef.current = null;
		};
		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Main render loop — reads raw proxy for smooth animation
	React.useEffect(() => {
		let rafId: number;

		const render = (timestamp: number) => {
			const canvas = canvasRef.current;
			if (!canvas) {
				rafId = requestAnimationFrame(render);
				return;
			}
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				rafId = requestAnimationFrame(render);
				return;
			}

			// Delta time in seconds
			const dt = lastFrameRef.current
				? Math.min((timestamp - lastFrameRef.current) / 1000, 0.1)
				: 1 / 60;
			lastFrameRef.current = timestamp;

			// Read directly from proxy (not snapshot) in rAF for smooth rendering
			const world = gameWorldStore.proxy;
			const arena = world.arena;
			const worldPlayers = world.players;

			const cw = canvas.width;
			const ch = canvas.height;
			const dpr = window.devicePixelRatio || 1;

			// Guard: skip rendering if arena is uninitialized (dimensions are 0)
			if (arena.width <= 0 || arena.height <= 0) {
				rafId = requestAnimationFrame(render);
				return;
			}

			const scaleX = cw / arena.width;
			const scaleY = ch / arena.height;
			const scale = Math.min(scaleX, scaleY);
			const offsetX = (cw - arena.width * scale) / 2;
			const offsetY = (ch - arena.height * scale) / 2;
			const now = performance.now();
			const wallClock = kmClient.serverTimestamp(); // synced server time for comparing against server timestamps

			// ──── Background (cached to offscreen canvas) ────
			const bgCache = bgCacheRef.current;
			if (
				!bgCache ||
				bgCache.width !== cw ||
				bgCache.height !== ch ||
				bgCache.arenaW !== arena.width ||
				bgCache.arenaH !== arena.height
			) {
				// Rebuild static background cache
				const offscreen =
					typeof OffscreenCanvas !== 'undefined'
						? new OffscreenCanvas(cw, ch)
						: (() => {
								const c = document.createElement('canvas');
								c.width = cw;
								c.height = ch;
								return c;
							})();
				const bctx = offscreen.getContext('2d') as
					| CanvasRenderingContext2D
					| OffscreenCanvasRenderingContext2D;
				if (bctx) {
					bctx.scale(dpr, dpr);
					const logW = cw / dpr;
					const logH = ch / dpr;
					const logOffX = offsetX / dpr;
					const logOffY = offsetY / dpr;
					const logAW = (arena.width * scale) / dpr;
					const logAH = (arena.height * scale) / dpr;
					const logScale = scale / dpr;

					// Full bg
					bctx.fillStyle = THEME.bg;
					bctx.fillRect(0, 0, logW, logH);

					// Arena surface gradient
					const grad = bctx.createRadialGradient(
						logW / 2,
						logH / 2,
						0,
						logW / 2,
						logH / 2,
						Math.max(logW, logH) * 0.6
					);
					grad.addColorStop(0, '#1a2332');
					grad.addColorStop(1, THEME.surface);
					bctx.fillStyle = grad;
					bctx.fillRect(logOffX, logOffY, logAW, logAH);

					// Grid — batch all lines in one path
					bctx.strokeStyle = THEME.grid;
					bctx.lineWidth = 1;
					const gridSize = 50;
					bctx.beginPath();
					for (let x = 0; x <= arena.width; x += gridSize) {
						const gx = logOffX + x * logScale;
						bctx.moveTo(gx, logOffY);
						bctx.lineTo(gx, logOffY + logAH);
					}
					for (let y = 0; y <= arena.height; y += gridSize) {
						const gy = logOffY + y * logScale;
						bctx.moveTo(logOffX, gy);
						bctx.lineTo(logOffX + logAW, gy);
					}
					bctx.stroke();

					// Arena border with glow
					bctx.shadowColor = THEME.borderGlow;
					bctx.shadowBlur = 15;
					bctx.strokeStyle = THEME.border;
					bctx.lineWidth = 2;
					bctx.strokeRect(logOffX, logOffY, logAW, logAH);
					bctx.shadowBlur = 0;
				}
				bgCacheRef.current = {
					canvas: offscreen,
					width: cw,
					height: ch,
					arenaW: arena.width,
					arenaH: arena.height
				};
			}
			// Blit cached background
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.drawImage(bgCacheRef.current!.canvas, 0, 0);

			// Scale context for DPR so all subsequent draws use logical coords
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			const lOffX = offsetX / dpr;
			const lOffY = offsetY / dpr;
			const lScale = scale / dpr;

			// ──── Lerp positions toward target ────
			// Exponential lerp: smooth = smooth + (target - smooth) * (1 - e^(-speed * dt))
			const lerpFactor = 1 - Math.exp(-LERP_SPEED * dt);
			for (const [id, player] of Object.entries(worldPlayers)) {
				const sp = smoothPositions.current[id];
				if (!sp) {
					// First time — snap to target
					smoothPositions.current[id] = { x: player.x, y: player.y };
				} else {
					sp.x += (player.x - sp.x) * lerpFactor;
					sp.y += (player.y - sp.y) * lerpFactor;
				}
			}

			// ──── Particle event detection ────
			for (const [id, player] of Object.entries(worldPlayers)) {
				const prevHp = prevPlayerHp.current[id];
				const prevAlive = prevPlayerAlive.current[id];
				const wasShielding = prevPlayerShielding.current[id];

				if (prevHp !== undefined && player.hp < prevHp && player.alive) {
					// Player took damage → hit sparks
					particleSystem.emitHit(player.x, player.y, player.color);
				}
				if (prevAlive === true && !player.alive) {
					// Player died → explosion
					particleSystem.emitKillExplosion(player.x, player.y, player.color);
				}
				if (
					wasShielding === true &&
					!player.shielding &&
					player.alive &&
					player.shieldBrokenTime > 0
				) {
					// Shield broke → shatter
					particleSystem.emitShieldBreak(player.x, player.y);
				}

				prevPlayerHp.current[id] = player.hp;
				prevPlayerAlive.current[id] = player.alive;
				prevPlayerShielding.current[id] = player.shielding;
			}

			// Power-up pickup detection
			const currentPuIds = new Set(
				Object.values(world.powerUps).map((p: { id: string }) => p.id)
			);
			for (const prevId of prevPowerUpIds.current) {
				if (!currentPuIds.has(prevId)) {
					// A power-up was picked up — emit at nearest live player as fallback
					// (we don't know exactly who picked it up, so skip position)
				}
			}
			prevPowerUpIds.current = currentPuIds;

			// Projectile impact detection
			const currentProjIds = new Set(
				Object.values(world.projectiles).map((p: { id: string }) => p.id)
			);
			for (const proj of Object.values(world.projectiles)) {
				// Trail particles for active projectiles
				particleSystem.emitProjectileTrail(proj.x, proj.y);
			}
			prevProjectileIds.current = currentProjIds;

			// Update particle physics
			particleSystem.update();

			// ──── Draw players ────
			for (const [id, player] of Object.entries(worldPlayers)) {
				const sp = smoothPositions.current[id] ?? {
					x: player.x,
					y: player.y
				};

				const sx = lOffX + sp.x * lScale;
				const sy = lOffY + sp.y * lScale;
				const r = PLAYER_RADIUS * lScale;

				// ── Death ring effect ──
				if (!player.alive) {
					if (!deathTimestamps.current[id]) {
						deathTimestamps.current[id] = now;
					}
					const deathElapsed = now - deathTimestamps.current[id];
					if (deathElapsed < 1000) {
						const expansion = (deathElapsed / 1000) * r * 3;
						const ringRadius = Math.max(0, r + expansion);
						const alpha = 1 - deathElapsed / 1000;
						ctx.beginPath();
						ctx.arc(sx, sy, ringRadius, 0, Math.PI * 2);
						ctx.strokeStyle = THEME.deathRing;
						ctx.lineWidth = 2 * lScale;
						ctx.globalAlpha = alpha;
						ctx.stroke();
						ctx.globalAlpha = 1;
					}
					ctx.globalAlpha = 0.25;
				} else {
					delete deathTimestamps.current[id];
				}

				// ── Knockback trail ──
				if (
					player.alive &&
					(Math.abs(player.knockbackVx) > 1 || Math.abs(player.knockbackVy) > 1)
				) {
					const trailX = sx - player.knockbackVx * lScale * 0.5;
					const trailY = sy - player.knockbackVy * lScale * 0.5;
					const trailGrad = ctx.createLinearGradient(trailX, trailY, sx, sy);
					trailGrad.addColorStop(0, 'transparent');
					trailGrad.addColorStop(1, THEME.knockbackTrail);
					ctx.beginPath();
					ctx.moveTo(trailX, trailY);
					ctx.lineTo(sx, sy);
					ctx.strokeStyle = trailGrad;
					ctx.lineWidth = r * 1.5;
					ctx.lineCap = 'round';
					ctx.stroke();
					ctx.lineCap = 'butt';
				}

				// ── Shield effect: pulsating ring ──
				if (player.shielding && player.alive) {
					const pulsePhase = Math.sin(now * 0.005) * 0.3 + 0.7;
					ctx.beginPath();
					ctx.arc(sx, sy, r + 6 * lScale, 0, Math.PI * 2);
					ctx.strokeStyle = THEME.shieldColor;
					ctx.lineWidth = 3 * lScale;
					ctx.shadowColor = THEME.shieldGlow;
					ctx.shadowBlur = 15 * lScale * pulsePhase;
					ctx.globalAlpha = 0.6 + pulsePhase * 0.4;
					ctx.stroke();
					ctx.shadowBlur = 0;
					ctx.globalAlpha = player.alive ? 1 : 0.25;
				}

				// ── Shield break flash effect ──
				if (player.alive && player.shieldBrokenTime > 0 && !player.shielding) {
					const breakElapsed = wallClock - player.shieldBrokenTime;
					if (breakElapsed >= 0 && breakElapsed < 400) {
						const breakAlpha = 1 - breakElapsed / 400;
						const breakRadius =
							r + 6 * lScale + (breakElapsed / 400) * 10 * lScale;
						ctx.beginPath();
						ctx.arc(sx, sy, Math.max(0, breakRadius), 0, Math.PI * 2);
						ctx.strokeStyle = '#f87171';
						ctx.lineWidth = 2 * lScale;
						ctx.globalAlpha = breakAlpha * 0.7;
						ctx.stroke();
						ctx.globalAlpha = player.alive ? 1 : 0.25;
					}
				}

				// ── Avatar or colored circle ──
				const cached = player.avatarUrl
					? imageCache.current.get(player.avatarUrl)
					: null;
				if (cached?.loaded) {
					ctx.save();
					ctx.beginPath();
					ctx.arc(sx, sy, r, 0, Math.PI * 2);
					ctx.clip();
					ctx.drawImage(cached.img, sx - r, sy - r, r * 2, r * 2);
					ctx.restore();

					// Colored border ring
					ctx.beginPath();
					ctx.arc(sx, sy, r, 0, Math.PI * 2);
					ctx.strokeStyle = player.color;
					ctx.lineWidth = 2.5 * lScale;
					ctx.stroke();
				} else {
					// Solid circle fallback (no per-frame gradient)
					ctx.beginPath();
					ctx.arc(sx, sy, r, 0, Math.PI * 2);
					ctx.fillStyle = player.color;
					ctx.fill();

					// Subtle border
					ctx.strokeStyle = 'rgba(255,255,255,0.2)';
					ctx.lineWidth = 1.5 * lScale;
					ctx.stroke();

					// Initial letter
					ctx.fillStyle = '#ffffff';
					ctx.font = `bold ${r}px 'Orbitron', sans-serif`;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText(player.name.charAt(0).toUpperCase(), sx, sy);
				}

				// ── Directional indicator (small triangle showing facing) ──
				if (player.alive) {
					const indicatorDist = r + 4 * lScale;
					const angle = player.facingAngle;
					const tipX = sx + Math.cos(angle) * (indicatorDist + 6 * lScale);
					const tipY = sy + Math.sin(angle) * (indicatorDist + 6 * lScale);
					const baseL_X = sx + Math.cos(angle + 0.5) * indicatorDist;
					const baseL_Y = sy + Math.sin(angle + 0.5) * indicatorDist;
					const baseR_X = sx + Math.cos(angle - 0.5) * indicatorDist;
					const baseR_Y = sy + Math.sin(angle - 0.5) * indicatorDist;

					ctx.beginPath();
					ctx.moveTo(tipX, tipY);
					ctx.lineTo(baseL_X, baseL_Y);
					ctx.lineTo(baseR_X, baseR_Y);
					ctx.closePath();
					ctx.fillStyle = player.color;
					ctx.globalAlpha = 0.8;
					ctx.fill();
					ctx.globalAlpha = player.alive ? 1 : 0.25;
				}

				// ── Attack cone visual ──
				if (player.alive && player.lastAttackTime > 0) {
					const attackElapsed = wallClock - player.lastAttackTime;
					if (attackElapsed >= 0 && attackElapsed < ATTACK_VISUAL_DURATION_MS) {
						const progress = attackElapsed / ATTACK_VISUAL_DURATION_MS;
						const alpha = (1 - progress) * 0.5;
						const coneRadius = ATTACK_RANGE * lScale * (0.5 + progress * 0.5);
						const startAngle = player.facingAngle - ATTACK_HALF_ARC_RAD;
						const endAngle = player.facingAngle + ATTACK_HALF_ARC_RAD;

						// Solid cone fill (avoid per-frame radial gradient)
						ctx.beginPath();
						ctx.moveTo(sx, sy);
						ctx.arc(sx, sy, coneRadius, startAngle, endAngle);
						ctx.closePath();
						ctx.fillStyle = THEME.attackColor;
						ctx.globalAlpha = alpha * 0.5;
						ctx.fill();

						// Cone edge lines
						ctx.beginPath();
						ctx.moveTo(sx, sy);
						ctx.lineTo(
							sx + Math.cos(startAngle) * coneRadius,
							sy + Math.sin(startAngle) * coneRadius
						);
						ctx.moveTo(sx, sy);
						ctx.lineTo(
							sx + Math.cos(endAngle) * coneRadius,
							sy + Math.sin(endAngle) * coneRadius
						);
						ctx.strokeStyle = THEME.attackColor;
						ctx.lineWidth = 1;
						ctx.globalAlpha = alpha;
						ctx.stroke();
						ctx.globalAlpha = player.alive ? 1 : 0.25;
					}
				}

				// ── Name label (pill) ──
				const nameText = player.name;
				ctx.font = `bold ${9 * lScale}px 'Exo 2', sans-serif`;
				ctx.textAlign = 'center';
				const nameWidth = ctx.measureText(nameText).width + 10 * lScale;
				const nameHeight = 14 * lScale;
				const nameX = sx - nameWidth / 2;
				const nameY = sy - r - 16 * lScale;

				ctx.fillStyle = THEME.nameLabel;
				ctx.beginPath();
				const pillR = nameHeight / 2;
				ctx.roundRect(nameX, nameY, nameWidth, nameHeight, pillR);
				ctx.fill();
				ctx.strokeStyle = THEME.nameLabelBorder;
				ctx.lineWidth = 0.5;
				ctx.stroke();

				ctx.fillStyle = '#e2e8f0';
				ctx.textBaseline = 'middle';
				ctx.fillText(nameText, sx, nameY + nameHeight / 2);

				// ── HP bar ──
				if (player.alive) {
					const barWidth = r * 2.5;
					const barHeight = 4 * lScale;
					const barX = sx - barWidth / 2;
					const barY = sy + r + 6 * lScale;
					const hpRatio = player.hp / player.maxHp;

					// Bar background
					ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
					ctx.beginPath();
					ctx.roundRect(barX, barY, barWidth, barHeight, 2);
					ctx.fill();

					// HP fill
					const hpColor =
						hpRatio > 0.5
							? THEME.hpHigh
							: hpRatio > 0.25
								? THEME.hpMid
								: THEME.hpLow;
					ctx.fillStyle = hpColor;
					ctx.beginPath();
					ctx.roundRect(barX, barY, barWidth * hpRatio, barHeight, 2);
					ctx.fill();

					// Glow on low HP
					if (hpRatio <= 0.25) {
						ctx.shadowColor = THEME.hpLow;
						ctx.shadowBlur = 6;
						ctx.fill();
						ctx.shadowBlur = 0;
					}
				}

				ctx.globalAlpha = 1;
			}

			// ──── Projectiles ────
			for (const proj of Object.values(world.projectiles)) {
				const px = lOffX + proj.x * lScale;
				const py = lOffY + proj.y * lScale;
				const pr = PROJECTILE_VISUAL_SIZE * lScale;

				// Glow
				ctx.beginPath();
				ctx.arc(px, py, pr * 1.5, 0, Math.PI * 2);
				ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
				ctx.fill();

				// Core
				ctx.beginPath();
				ctx.arc(px, py, pr, 0, Math.PI * 2);
				ctx.fillStyle = '#a855f7';
				ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
				ctx.shadowBlur = 8 * lScale;
				ctx.fill();
				ctx.shadowBlur = 0;

				// Trail
				const trailX = px - proj.vx * lScale * 2;
				const trailY = py - proj.vy * lScale * 2;
				const trailGrad = ctx.createLinearGradient(trailX, trailY, px, py);
				trailGrad.addColorStop(0, 'transparent');
				trailGrad.addColorStop(1, 'rgba(168, 85, 247, 0.4)');
				ctx.beginPath();
				ctx.moveTo(trailX, trailY);
				ctx.lineTo(px, py);
				ctx.strokeStyle = trailGrad;
				ctx.lineWidth = pr;
				ctx.lineCap = 'round';
				ctx.stroke();
				ctx.lineCap = 'butt';
			}

			// ──── Power-ups ────
			for (const pu of Object.values(world.powerUps)) {
				const px = lOffX + pu.x * lScale;
				const py = lOffY + pu.y * lScale;
				const pr = POWER_UP_RADIUS * lScale;
				const bobOffset = Math.sin(now * 0.004 + pu.x) * 3 * lScale;

				// Glow ring
				const puColor =
					pu.type === 'health'
						? '#4ade80'
						: pu.type === 'damage'
							? '#f59e0b'
							: '#22d3ee';
				const puGlow =
					pu.type === 'health'
						? 'rgba(74, 222, 128, 0.4)'
						: pu.type === 'damage'
							? 'rgba(245, 158, 11, 0.4)'
							: 'rgba(34, 211, 238, 0.4)';
				const puIcon =
					pu.type === 'health' ? '+' : pu.type === 'damage' ? '⚡' : '🛡';

				ctx.beginPath();
				ctx.arc(px, py + bobOffset, pr + 4 * lScale, 0, Math.PI * 2);
				ctx.fillStyle = puGlow;
				ctx.fill();

				ctx.beginPath();
				ctx.arc(px, py + bobOffset, pr, 0, Math.PI * 2);
				ctx.fillStyle = puColor;
				ctx.shadowColor = puGlow;
				ctx.shadowBlur = 10 * lScale;
				ctx.fill();
				ctx.shadowBlur = 0;

				// Icon
				ctx.fillStyle = '#0f172a';
				ctx.font = `bold ${pr * 1.2}px sans-serif`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(puIcon, px, py + bobOffset);
			}

			// ──── Shrinking arena circle ────
			if (world.arenaRadius > 0) {
				const cx = lOffX + world.arenaCenterX * lScale;
				const cy = lOffY + world.arenaCenterY * lScale;
				const ar = world.arenaRadius * lScale;

				// Danger zone outside circle (darkened overlay)
				ctx.save();
				ctx.beginPath();
				// Outer rectangle
				ctx.rect(lOffX, lOffY, arena.width * lScale, arena.height * lScale);
				// Inner circle (counter-clockwise to cut out)
				ctx.arc(cx, cy, ar, 0, Math.PI * 2, true);
				ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
				ctx.fill();
				ctx.restore();

				// Circle border
				ctx.beginPath();
				ctx.arc(cx, cy, ar, 0, Math.PI * 2);
				ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
				ctx.lineWidth = 2 * lScale;
				ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
				ctx.shadowBlur = 10 * lScale;
				ctx.stroke();
				ctx.shadowBlur = 0;
			}

			// ──── Emote bubbles above players ────
			for (const emote of Object.values(world.emotes)) {
				const player = worldPlayers[emote.playerId];
				if (!player) continue;
				const sp = smoothPositions.current[emote.playerId];
				if (!sp) continue;

				const emoteElapsed = wallClock - emote.timestamp;
				if (emoteElapsed < 0 || emoteElapsed > EMOTE_DISPLAY_DURATION_MS)
					continue;

				const sx = lOffX + sp.x * lScale;
				const sy = lOffY + sp.y * lScale;
				const r = PLAYER_RADIUS * lScale;
				const floatUp =
					(emoteElapsed / EMOTE_DISPLAY_DURATION_MS) * 20 * lScale;
				const alpha = 1 - emoteElapsed / EMOTE_DISPLAY_DURATION_MS;

				const icon = EMOTE_ICONS[emote.type] || '❓';

				ctx.globalAlpha = alpha;
				ctx.font = `${16 * lScale}px sans-serif`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(icon, sx, sy - r - 24 * lScale - floatUp);
				ctx.globalAlpha = 1;
			}

			// ──── Streak announcements (center screen) ────
			for (const streak of Object.values(world.streaks)) {
				const streakElapsed = wallClock - streak.timestamp;
				if (streakElapsed < 0 || streakElapsed > 3000) continue;

				const alpha =
					streakElapsed < 500
						? streakElapsed / 500
						: Math.max(0, 1 - (streakElapsed - 2000) / 1000);
				if (alpha <= 0) continue;

				const label =
					streak.count >= 7
						? `🔥 ${streak.playerName} GODLIKE! (${streak.count})`
						: streak.count >= 5
							? `🔥 ${streak.playerName} UNSTOPPABLE! (${streak.count})`
							: `🔥 ${streak.playerName} KILLING SPREE! (${streak.count})`;

				ctx.globalAlpha = alpha;
				ctx.font = `bold ${14 * lScale}px 'Orbitron', sans-serif`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillStyle = '#fbbf24';
				ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
				ctx.shadowBlur = 12;
				ctx.fillText(label, cw / dpr / 2, (ch / dpr) * 0.15);
				ctx.shadowBlur = 0;
				ctx.globalAlpha = 1;
			}

			// ──── Commentary ticker (bottom center) ────
			const activeCommentary = Object.values(world.commentary).filter(
				(c) =>
					wallClock - c.timestamp < COMMENTARY_DISPLAY_MS &&
					wallClock - c.timestamp >= 0
			);
			if (activeCommentary.length > 0) {
				const latest = activeCommentary[activeCommentary.length - 1];
				const commentElapsed = wallClock - latest.timestamp;
				const commentAlpha =
					commentElapsed < 300
						? commentElapsed / 300
						: commentElapsed > COMMENTARY_DISPLAY_MS - 500
							? (COMMENTARY_DISPLAY_MS - commentElapsed) / 500
							: 1;

				if (commentAlpha > 0) {
					ctx.globalAlpha = Math.max(0, commentAlpha);
					ctx.font = `bold ${11 * lScale}px 'Exo 2', sans-serif`;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';

					const textW = ctx.measureText(latest.text).width + 20 * lScale;
					const textH = 22 * lScale;
					const cx2 = cw / dpr / 2;
					const cy2 = (ch / dpr) * 0.88;

					ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
					ctx.beginPath();
					ctx.roundRect(
						cx2 - textW / 2,
						cy2 - textH / 2,
						textW,
						textH,
						textH / 2
					);
					ctx.fill();

					ctx.fillStyle = '#e2e8f0';
					ctx.fillText(latest.text, cx2, cy2);
					ctx.globalAlpha = 1;
				}
			}

			// ──── Render particles ────
			particleSystem.render(ctx, lOffX, lOffY, lScale);

			// ──── Team indicator borders (team mode) ────
			// Team indicators are already rendered per-player via color.
			// But we add a subtle colored ring for team identification
			for (const [id, player] of Object.entries(worldPlayers)) {
				if (!player.alive || player.teamId <= 0) continue;
				const sp = smoothPositions.current[id];
				if (!sp) continue;

				const teamInfo = TEAM_COLORS[player.teamId];
				if (!teamInfo) continue;

				const sx = lOffX + sp.x * lScale;
				const sy = lOffY + sp.y * lScale;
				const r = PLAYER_RADIUS * lScale;

				ctx.beginPath();
				ctx.arc(sx, sy, r + 10 * lScale, 0, Math.PI * 2);
				ctx.strokeStyle = teamInfo.primary;
				ctx.lineWidth = 1.5 * lScale;
				ctx.globalAlpha = 0.4;
				ctx.stroke();
				ctx.globalAlpha = 1;
			}

			// Reset transform before next frame
			ctx.setTransform(1, 0, 0, 1, 0, 0);

			rafId = requestAnimationFrame(render);
		};

		rafId = requestAnimationFrame(render);
		return () => cancelAnimationFrame(rafId);
	}, []);

	return (
		<div ref={containerRef} className="h-full w-full">
			<canvas ref={canvasRef} className="block h-full w-full" />
		</div>
	);
}

/** Lighten a hex color by a given amount (0-100) */
function lightenColor(hex: string, amount: number): string {
	const num = parseInt(hex.replace('#', ''), 16);
	const r = Math.min(255, ((num >> 16) & 0xff) + amount);
	const g = Math.min(255, ((num >> 8) & 0xff) + amount);
	const b = Math.min(255, (num & 0xff) + amount);
	return `rgb(${r},${g},${b})`;
}
