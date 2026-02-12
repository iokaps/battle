import { ActionButtons } from '@/components/action-buttons';
import { AvatarPreview } from '@/components/avatar-preview';
import { JoystickControl } from '@/components/joystick-control';
import { useAvatarGeneration } from '@/hooks/useAvatarGeneration';
import { kmClient } from '@/services/km-client';
import { playerInputActions } from '@/state/actions/player-input-actions';
import { gameWorldStore } from '@/state/stores/game-world-store';
import { playersStore } from '@/state/stores/players-store';
import { cn } from '@/utils/cn';
import { useSnapshot } from '@kokimoki/app';
import { Crown, Eye, Skull } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Battle view for the player mode.
 * Dark neon themed with glass panel header, damage flash,
 * eliminated state with glitch effect, and improved controls.
 */
export function BattleView() {
	const { t } = useTranslation();
	const worldSnap = useSnapshot(gameWorldStore.proxy);
	const playerData = useSnapshot(playersStore.proxy).players[kmClient.id];
	const { status: avatarStatus, avatarUrl } = useAvatarGeneration();

	const myWorld = worldSnap.players[kmClient.id];

	// Damage flash effect
	const [damageFlash, setDamageFlash] = React.useState(false);
	const prevHpRef = React.useRef(myWorld?.hp ?? 100);
	React.useEffect(() => {
		const currentHp = myWorld?.hp ?? 100;
		if (currentHp < prevHpRef.current) {
			setDamageFlash(true);
			// haptic feedback on taking damage
			try {
				if ('vibrate' in navigator) navigator.vibrate(40);
			} catch {
				/* ignore */
			}
			setTimeout(() => setDamageFlash(false), 200);
		}
		prevHpRef.current = currentHp;
	}, [myWorld?.hp]);

	// Track current input state with refs for throttling
	const inputRef = React.useRef({
		dx: 0,
		dy: 0,
		attack: false,
		shield: false,
		rangedAttack: false,
		emote: ''
	});
	const lastSentRef = React.useRef(0);
	const lastSentValRef = React.useRef({ dx: 0, dy: 0, shield: false });
	const rafRef = React.useRef<number | null>(null);

	// Throttle sending inputs at ~10fps. Skip if nothing changed (reduces
	// network traffic — each send is a server-ACK round-trip transact).
	const sendInput = React.useCallback(() => {
		const now = Date.now();
		if (now - lastSentRef.current < 100) return;

		const { dx, dy, attack, shield, rangedAttack, emote } = inputRef.current;

		// Skip redundant sends when nothing changed and no attack
		const prev = lastSentValRef.current;
		if (
			!attack &&
			!rangedAttack &&
			!emote &&
			dx === prev.dx &&
			dy === prev.dy &&
			shield === prev.shield
		) {
			return;
		}

		lastSentRef.current = now;
		lastSentValRef.current = { dx, dy, shield };

		playerInputActions
			.updateInput(dx, dy, attack, shield, rangedAttack, emote)
			.catch(() => {
				/* connection lost — silently skip until reconnected */
			});

		if (attack) {
			inputRef.current.attack = false;
		}
		if (rangedAttack) {
			inputRef.current.rangedAttack = false;
		}
		if (emote) {
			inputRef.current.emote = '';
		}
	}, []);

	// Input loop via requestAnimationFrame
	React.useEffect(() => {
		const loop = () => {
			sendInput();
			rafRef.current = requestAnimationFrame(loop);
		};
		rafRef.current = requestAnimationFrame(loop);

		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			playerInputActions.clearInput().catch(() => {
				/* ignore disconnect errors on cleanup */
			});
		};
	}, [sendInput]);

	const handleMove = React.useCallback((dx: number, dy: number) => {
		inputRef.current.dx = dx;
		inputRef.current.dy = dy;
	}, []);

	const handleAttack = React.useCallback(() => {
		inputRef.current.attack = true;
	}, []);

	const handleRangedAttack = React.useCallback(() => {
		inputRef.current.rangedAttack = true;
	}, []);

	const handleShieldChange = React.useCallback((active: boolean) => {
		inputRef.current.shield = active;
	}, []);

	const handleEmote = React.useCallback((type: string) => {
		inputRef.current.emote = type;
	}, []);

	const isAlive = myWorld?.alive ?? false;
	const hp = myWorld?.hp ?? 0;
	const maxHp = myWorld?.maxHp ?? 100;
	const kills = myWorld?.kills ?? 0;
	const color = playerData?.color || '#6b7280';
	const name = playerData?.name || '';
	const hpRatio = maxHp > 0 ? hp / maxHp : 0;

	return (
		<div
			className={cn(
				'bg-arena-bg flex h-full flex-col',
				damageFlash && 'animate-shake'
			)}
			style={{ touchAction: 'none' }}
		>
			{/* Damage flash overlay */}
			{damageFlash && (
				<div className="bg-neon-red/15 pointer-events-none absolute inset-0 z-30" />
			)}

			{/* Header: avatar + name + HP + kills */}
			<div className="glass-panel z-10 mx-2 mt-2 flex items-center gap-3 rounded-xl px-4 py-2">
				<AvatarPreview
					avatarUrl={avatarUrl}
					status={avatarStatus}
					color={color}
					name={name}
					size="sm"
				/>
				<div className="flex-1">
					<div className="flex items-center justify-between">
						<span className="text-sm font-semibold text-slate-100">{name}</span>
						<div className="text-neon-amber flex items-center gap-1 text-xs">
							<Skull className="h-3 w-3" />
							<span className="font-mono">{kills}</span>
						</div>
					</div>
					{/* Custom HP bar */}
					<div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-800">
						<div
							className="h-full rounded-full transition-all duration-200"
							style={{
								width: `${hpRatio * 100}%`,
								backgroundColor:
									hpRatio > 0.5
										? '#4ade80'
										: hpRatio > 0.25
											? '#fbbf24'
											: '#f87171',
								boxShadow:
									hpRatio <= 0.25
										? '0 0 8px rgba(248, 113, 113, 0.6)'
										: undefined
							}}
						/>
					</div>
				</div>
			</div>

			{/* Main area: status */}
			<div className="flex flex-1 items-center justify-center px-4">
				{worldSnap.gameOver ? (
					<div className="animate-fade-in-up text-center">
						<Crown className="text-neon-amber mx-auto mb-3 h-12 w-12" />
						<h2 className="font-display text-3xl font-bold text-slate-100">
							{worldSnap.winnerId === kmClient.id
								? t('ui:victoryTitle')
								: t('ui:defeatTitle')}
						</h2>
						<p className="mt-2 text-slate-400">{t('ui:gameOverMessage')}</p>
					</div>
				) : !isAlive ? (
					<div className="animate-fade-in text-center">
						<Skull className="text-neon-red mx-auto mb-3 h-10 w-10" />
						<h2 className="font-display text-neon-red text-2xl font-bold">
							{t('ui:eliminatedTitle')}
						</h2>
						<div className="mt-3 flex items-center justify-center gap-2 text-slate-400">
							<Eye className="h-4 w-4" />
							<span className="text-sm">{t('ui:spectating')}</span>
						</div>
					</div>
				) : (
					<p className="font-display text-xs tracking-widest text-slate-600 uppercase">
						{t('ui:battleInProgress')}
					</p>
				)}
			</div>

			{/* Footer: joystick + action buttons */}
			{isAlive && !worldSnap.gameOver && (
				<div className="pb-safe z-10 flex items-end justify-between px-4 py-3">
					<JoystickControl onMove={handleMove} size={130} />
					<ActionButtons
						onAttack={handleAttack}
						onRangedAttack={handleRangedAttack}
						onShieldChange={handleShieldChange}
						onEmote={handleEmote}
					/>
				</div>
			)}

			{/* Emote buttons for eliminated spectators */}
			{!isAlive && !worldSnap.gameOver && (
				<div className="pb-safe z-10 flex items-center justify-center gap-3 px-4 py-3">
					{(['thumbsup', 'fist', 'laugh', 'skull'] as const).map((type) => (
						<button
							key={type}
							type="button"
							className="glass-panel flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-transform active:scale-90"
							onClick={() => handleEmote(type)}
						>
							{type === 'thumbsup' && '\ud83d\udc4d'}
							{type === 'fist' && '\ud83d\udc4a'}
							{type === 'laugh' && '\ud83d\ude02'}
							{type === 'skull' && '\ud83d\udc80'}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
