import { MAX_PARTICLES } from '@/utils/gameConstants';

export interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	size: number;
	color: string;
	alpha: number;
}

/** Client-only particle pool for visual effects. Capped at MAX_PARTICLES. */
class ParticleSystem {
	particles: Particle[] = [];

	/** Emit a burst of particles at a position */
	emit(
		x: number,
		y: number,
		count: number,
		color: string,
		options?: {
			speed?: number;
			sizeRange?: [number, number];
			lifeRange?: [number, number];
			angle?: number;
			spread?: number;
		}
	) {
		const speed = options?.speed ?? 3;
		const sizeRange = options?.sizeRange ?? [2, 5];
		const lifeRange = options?.lifeRange ?? [20, 40];
		const baseAngle = options?.angle ?? 0;
		const spread = options?.spread ?? Math.PI * 2;

		for (let i = 0; i < count; i++) {
			if (this.particles.length >= MAX_PARTICLES) break;

			const angle = baseAngle + (Math.random() - 0.5) * spread;
			const spd = speed * (0.5 + Math.random() * 0.5);
			const life = lifeRange[0] + Math.random() * (lifeRange[1] - lifeRange[0]);

			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * spd,
				vy: Math.sin(angle) * spd,
				life,
				maxLife: life,
				size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
				color,
				alpha: 1
			});
		}
	}

	/** Hit impact particles (red burst) */
	emitHit(x: number, y: number, color = '#f87171') {
		this.emit(x, y, 8, color, {
			speed: 4,
			sizeRange: [2, 4],
			lifeRange: [15, 25]
		});
	}

	/** Kill explosion particles */
	emitKillExplosion(x: number, y: number, color: string) {
		this.emit(x, y, 20, color, {
			speed: 5,
			sizeRange: [3, 7],
			lifeRange: [25, 45]
		});
		this.emit(x, y, 10, '#fbbf24', {
			speed: 3,
			sizeRange: [1, 3],
			lifeRange: [15, 30]
		});
	}

	/** Power-up pickup sparkle */
	emitPickup(x: number, y: number, color: string) {
		this.emit(x, y, 12, color, {
			speed: 2,
			sizeRange: [2, 5],
			lifeRange: [20, 35]
		});
	}

	/** Shield break shatter */
	emitShieldBreak(x: number, y: number) {
		this.emit(x, y, 15, '#22d3ee', {
			speed: 4,
			sizeRange: [2, 5],
			lifeRange: [20, 35]
		});
	}

	/** Projectile trail */
	emitProjectileTrail(x: number, y: number) {
		if (this.particles.length >= MAX_PARTICLES - 10) return; // reserve space
		this.emit(x, y, 1, '#a855f7', {
			speed: 0.5,
			sizeRange: [1, 3],
			lifeRange: [8, 15]
		});
	}

	/** Update all particles (call once per frame) */
	update() {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.x += p.vx;
			p.y += p.vy;
			p.vx *= 0.96;
			p.vy *= 0.96;
			p.life -= 1;
			p.alpha = Math.max(0, p.life / p.maxLife);

			if (p.life <= 0) {
				// Swap with last and pop for O(1) removal
				this.particles[i] = this.particles[this.particles.length - 1];
				this.particles.pop();
			}
		}
	}

	/** Render all particles to a canvas context */
	render(
		ctx: CanvasRenderingContext2D,
		offsetX: number,
		offsetY: number,
		scale: number
	) {
		for (const p of this.particles) {
			const sx = offsetX + p.x * scale;
			const sy = offsetY + p.y * scale;
			const size = p.size * scale;

			ctx.globalAlpha = p.alpha;
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(sx, sy, size, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	/** Clear all particles */
	clear() {
		this.particles = [];
	}
}

/** Singleton particle system instance */
export const particleSystem = new ParticleSystem();
