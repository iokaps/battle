import { kmClient } from '@/services/km-client';
import { gameWorldStore } from '@/state/stores/game-world-store';
import { cn } from '@/utils/cn';
import {
	ATTACK_COOLDOWN_MS,
	EMOTE_ICONS,
	RANGED_ATTACK_COOLDOWN_MS,
	SHIELD_COOLDOWN_MS
} from '@/utils/gameConstants';
import { Crosshair, Shield, Sword } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

interface ActionButtonsProps {
	/** Called when attack button is tapped */
	onAttack: () => void;
	/** Called when ranged attack button is tapped */
	onRangedAttack: () => void;
	/** Called when shield state changes (press/release) */
	onShieldChange: (active: boolean) => void;
	/** Called when an emote is triggered */
	onEmote: (type: string) => void;
	className?: string;
}

/** Trigger haptic feedback on supported devices */
function haptic(style: 'light' | 'heavy' = 'light') {
	try {
		if ('vibrate' in navigator) {
			navigator.vibrate(style === 'heavy' ? [30, 10, 30] : 15);
		}
	} catch {
		// ignore
	}
}

/**
 * Two large action buttons for the player battle view.
 * Attack (sword) = tap to activate with SVG cooldown ring,
 * Shield = hold to activate with pulse glow.
 * Dark neon theme with haptic feedback.
 */
export function ActionButtons({
	onAttack,
	onRangedAttack,
	onShieldChange,
	onEmote,
	className
}: ActionButtonsProps) {
	const { t } = useTranslation();
	const [shieldActive, setShieldActive] = React.useState(false);
	const [attackFlash, setAttackFlash] = React.useState(false);
	const [rangedFlash, setRangedFlash] = React.useState(false);
	const [cooldownProgress, setCooldownProgress] = React.useState(0);
	const [rangedCooldownProgress, setRangedCooldownProgress] = React.useState(0);
	const [shieldCooldownProgress, setShieldCooldownProgress] = React.useState(0);
	const [showEmotes, setShowEmotes] = React.useState(false);
	const cooldownRafRef = React.useRef<number | null>(null);
	const rangedCooldownRafRef = React.useRef<number | null>(null);
	const shieldCooldownRafRef = React.useRef<number | null>(null);
	const shieldOnCooldownRef = React.useRef(false);

	// Track cooldown via rAF for smooth ring animation
	const startCooldownAnim = React.useCallback(() => {
		const startTime = performance.now();
		const animate = () => {
			const elapsed = performance.now() - startTime;
			const progress = Math.min(elapsed / ATTACK_COOLDOWN_MS, 1);
			setCooldownProgress(progress);
			if (progress < 1) {
				cooldownRafRef.current = requestAnimationFrame(animate);
			}
		};
		if (cooldownRafRef.current) cancelAnimationFrame(cooldownRafRef.current);
		cooldownRafRef.current = requestAnimationFrame(animate);
	}, []);

	const startRangedCooldownAnim = React.useCallback(() => {
		const startTime = performance.now();
		const animate = () => {
			const elapsed = performance.now() - startTime;
			const progress = Math.min(elapsed / RANGED_ATTACK_COOLDOWN_MS, 1);
			setRangedCooldownProgress(progress);
			if (progress < 1) {
				rangedCooldownRafRef.current = requestAnimationFrame(animate);
			}
		};
		if (rangedCooldownRafRef.current)
			cancelAnimationFrame(rangedCooldownRafRef.current);
		rangedCooldownRafRef.current = requestAnimationFrame(animate);
	}, []);

	React.useEffect(() => {
		return () => {
			if (cooldownRafRef.current) cancelAnimationFrame(cooldownRafRef.current);
			if (rangedCooldownRafRef.current)
				cancelAnimationFrame(rangedCooldownRafRef.current);
			if (shieldCooldownRafRef.current)
				cancelAnimationFrame(shieldCooldownRafRef.current);
		};
	}, []);

	// Poll shield broken state and animate cooldown ring
	React.useEffect(() => {
		let rafId: number;
		const check = () => {
			const myWorld = gameWorldStore.proxy.players[kmClient.id];
			if (myWorld && myWorld.shieldBrokenTime > 0) {
				const elapsed = Date.now() - myWorld.shieldBrokenTime;
				if (elapsed < SHIELD_COOLDOWN_MS) {
					const prog = elapsed / SHIELD_COOLDOWN_MS;
					setShieldCooldownProgress(prog);
					if (!shieldOnCooldownRef.current) {
						// Shield just broke — force release
						shieldOnCooldownRef.current = true;
						setShieldActive(false);
						onShieldChange(false);
					}
				} else {
					setShieldCooldownProgress(0);
					shieldOnCooldownRef.current = false;
				}
			} else {
				setShieldCooldownProgress(0);
				shieldOnCooldownRef.current = false;
			}
			rafId = requestAnimationFrame(check);
		};
		rafId = requestAnimationFrame(check);
		return () => cancelAnimationFrame(rafId);
	}, [onShieldChange]);

	const handleAttackStart = React.useCallback(
		(e: React.TouchEvent | React.MouseEvent) => {
			e.preventDefault();
			const myWorld = gameWorldStore.proxy.players[kmClient.id];
			if (myWorld) {
				const serverNow = Date.now();
				if (serverNow - myWorld.lastAttackTime < ATTACK_COOLDOWN_MS) return;
			}
			setAttackFlash(true);
			haptic('heavy');
			onAttack();
			startCooldownAnim();
			setTimeout(() => setAttackFlash(false), 150);
		},
		[onAttack, startCooldownAnim]
	);

	const handleRangedStart = React.useCallback(
		(e: React.TouchEvent | React.MouseEvent) => {
			e.preventDefault();
			const myWorld = gameWorldStore.proxy.players[kmClient.id];
			if (myWorld) {
				const serverNow = Date.now();
				if (
					serverNow - myWorld.lastRangedAttackTime <
					RANGED_ATTACK_COOLDOWN_MS
				)
					return;
			}
			setRangedFlash(true);
			haptic('heavy');
			onRangedAttack();
			startRangedCooldownAnim();
			setTimeout(() => setRangedFlash(false), 150);
		},
		[onRangedAttack, startRangedCooldownAnim]
	);

	const handleEmoteTap = React.useCallback(
		(type: string) => {
			haptic('light');
			onEmote(type);
			setShowEmotes(false);
		},
		[onEmote]
	);

	const handleShieldStart = React.useCallback(
		(e: React.TouchEvent | React.MouseEvent) => {
			e.preventDefault();
			// Block shield during cooldown
			if (shieldOnCooldownRef.current) return;
			setShieldActive(true);
			haptic('light');
			onShieldChange(true);
		},
		[onShieldChange]
	);

	const handleShieldEnd = React.useCallback(
		(e: React.TouchEvent | React.MouseEvent) => {
			e.preventDefault();
			setShieldActive(false);
			onShieldChange(false);
		},
		[onShieldChange]
	);

	// SVG cooldown ring parameters
	const ringRadius = 38;
	const circumference = 2 * Math.PI * ringRadius;
	const dashOffset = circumference * (1 - cooldownProgress);

	// Ranged cooldown ring
	const rangedRingRadius = 28;
	const rangedCircumference = 2 * Math.PI * rangedRingRadius;
	const rangedDashOffset = rangedCircumference * (1 - rangedCooldownProgress);
	const isRangedOnCooldown =
		rangedCooldownProgress > 0 && rangedCooldownProgress < 1;

	// Shield cooldown ring
	const shieldRingRadius = 28;
	const shieldCircumference = 2 * Math.PI * shieldRingRadius;
	const shieldDashOffset = shieldCircumference * (1 - shieldCooldownProgress);
	const isShieldOnCooldown =
		shieldCooldownProgress > 0 && shieldCooldownProgress < 1;

	return (
		<div className={cn('flex flex-col items-end gap-2', className)}>
			{/* Emote quick-select */}
			{showEmotes && (
				<div className="glass-panel animate-fade-in flex gap-2 rounded-xl px-2 py-1.5">
					{Object.entries(EMOTE_ICONS).map(([type, icon]) => (
						<button
							key={type}
							type="button"
							className="flex h-10 w-10 items-center justify-center rounded-full text-xl transition-transform active:scale-90"
							onClick={() => handleEmoteTap(type)}
						>
							{icon}
						</button>
					))}
				</div>
			)}

			<div className="flex items-center gap-3">
				{/* Emote toggle */}
				<button
					type="button"
					className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-800/80 text-lg"
					onClick={() => setShowEmotes(!showEmotes)}
				>
					💬
				</button>

				{/* Ranged attack button */}
				<div className="relative">
					<button
						type="button"
						className={cn(
							'relative flex h-14 w-14 items-center justify-center rounded-full border-2 text-white shadow-lg transition-all',
							isRangedOnCooldown
								? 'border-slate-700 bg-slate-900/80 opacity-60'
								: rangedFlash
									? 'scale-95 border-purple-400 bg-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.6)]'
									: 'border-slate-600 bg-slate-800/80 hover:border-purple-400/50'
						)}
						style={{ touchAction: 'none' }}
						onTouchStart={handleRangedStart}
						onMouseDown={handleRangedStart}
					>
						<Crosshair
							className={cn(
								'h-6 w-6 transition-colors',
								isRangedOnCooldown
									? 'text-slate-500'
									: rangedFlash
										? 'text-purple-300'
										: 'text-slate-300'
							)}
						/>
						<span className="sr-only">{t('ui:rangedButton')}</span>
					</button>

					{/* Ranged cooldown ring */}
					{isRangedOnCooldown && (
						<svg
							className="pointer-events-none absolute -inset-1 -rotate-90"
							viewBox="0 0 64 64"
						>
							<circle
								cx="32"
								cy="32"
								r={rangedRingRadius}
								fill="none"
								stroke="rgba(168, 85, 247, 0.15)"
								strokeWidth="3"
							/>
							<circle
								cx="32"
								cy="32"
								r={rangedRingRadius}
								fill="none"
								stroke="#a855f7"
								strokeWidth="3"
								strokeDasharray={rangedCircumference}
								strokeDashoffset={rangedDashOffset}
								strokeLinecap="round"
								style={{
									filter: 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.6))'
								}}
							/>
						</svg>
					)}
				</div>

				{/* Shield button with cooldown ring */}
				<div className="relative">
					<button
						type="button"
						className={cn(
							'relative flex h-16 w-16 items-center justify-center rounded-full border-2 text-white shadow-lg transition-all',
							isShieldOnCooldown
								? 'border-slate-700 bg-slate-900/80 opacity-60'
								: shieldActive
									? 'border-neon-cyan bg-neon-cyan/30 scale-95 shadow-[0_0_20px_rgba(34,211,238,0.5)]'
									: 'hover:border-neon-cyan/50 border-slate-600 bg-slate-800/80'
						)}
						style={{
							touchAction: 'none',
							['--glow-color' as string]: 'rgba(34, 211, 238, 0.4)'
						}}
						onTouchStart={handleShieldStart}
						onTouchEnd={handleShieldEnd}
						onTouchCancel={handleShieldEnd}
						onMouseDown={handleShieldStart}
						onMouseUp={handleShieldEnd}
						onMouseLeave={handleShieldEnd}
					>
						<Shield
							className={cn(
								'h-7 w-7 transition-colors',
								isShieldOnCooldown
									? 'text-slate-500'
									: shieldActive
										? 'text-neon-cyan'
										: 'text-slate-300'
							)}
						/>
						{shieldActive && !isShieldOnCooldown && (
							<div className="animate-pulse-glow absolute inset-0 rounded-full" />
						)}
						<span className="sr-only">{t('ui:shieldButton')}</span>
					</button>

					{/* SVG shield cooldown ring */}
					{isShieldOnCooldown && (
						<svg
							className="pointer-events-none absolute -inset-1 -rotate-90"
							viewBox="0 0 72 72"
						>
							<circle
								cx="36"
								cy="36"
								r={shieldRingRadius}
								fill="none"
								stroke="rgba(34, 211, 238, 0.15)"
								strokeWidth="3"
							/>
							<circle
								cx="36"
								cy="36"
								r={shieldRingRadius}
								fill="none"
								stroke="#22d3ee"
								strokeWidth="3"
								strokeDasharray={shieldCircumference}
								strokeDashoffset={shieldDashOffset}
								strokeLinecap="round"
								style={{
									filter: 'drop-shadow(0 0 4px rgba(34, 211, 238, 0.6))'
								}}
							/>
						</svg>
					)}
				</div>

				{/* Attack button with cooldown ring */}
				<div className="relative">
					<button
						type="button"
						className={cn(
							'relative flex h-20 w-20 items-center justify-center rounded-full border-2 text-white shadow-lg transition-all',
							attackFlash
								? 'border-neon-amber bg-neon-amber/30 scale-95 shadow-[0_0_25px_rgba(251,191,36,0.6)]'
								: 'hover:border-neon-amber/50 border-slate-600 bg-slate-800/80'
						)}
						style={{ touchAction: 'none' }}
						onTouchStart={handleAttackStart}
						onMouseDown={handleAttackStart}
					>
						<Sword
							className={cn(
								'h-9 w-9 transition-colors',
								attackFlash ? 'text-neon-amber' : 'text-slate-300'
							)}
						/>
						<span className="sr-only">{t('ui:attackButton')}</span>
					</button>

					{/* SVG cooldown ring overlay */}
					{cooldownProgress > 0 && cooldownProgress < 1 && (
						<svg
							className="pointer-events-none absolute -inset-1 -rotate-90"
							viewBox="0 0 84 84"
						>
							<circle
								cx="42"
								cy="42"
								r={ringRadius}
								fill="none"
								stroke="rgba(251, 191, 36, 0.2)"
								strokeWidth="3"
							/>
							<circle
								cx="42"
								cy="42"
								r={ringRadius}
								fill="none"
								stroke="#fbbf24"
								strokeWidth="3"
								strokeDasharray={circumference}
								strokeDashoffset={dashOffset}
								strokeLinecap="round"
								style={{
									filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.6))'
								}}
							/>
						</svg>
					)}
				</div>
			</div>
		</div>
	);
}
