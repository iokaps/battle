import { useServerTimer } from '@/hooks/useServerTime';
import { gameSessionStore } from '@/state/stores/game-session-store';
import { COUNTDOWN_DURATION_MS } from '@/utils/gameConstants';
import { useSnapshot } from '@kokimoki/app';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Full-screen countdown overlay that shows 3 → 2 → 1 → GO!
 * Displays during the countdown phase before the battle starts.
 * Uses server time for synchronization across all clients.
 */
export function CountdownOverlay() {
	const { t } = useTranslation();
	const { countdownStartTimestamp, started } = useSnapshot(
		gameSessionStore.proxy
	);
	const serverTime = useServerTimer(100);
	const [display, setDisplay] = React.useState<string | null>(null);
	const [animKey, setAnimKey] = React.useState(0);
	const prevDisplayRef = React.useRef<string | null>(null);

	React.useEffect(() => {
		if (!countdownStartTimestamp || started) {
			setDisplay(null);
			prevDisplayRef.current = null;
			return;
		}

		const elapsed = serverTime - countdownStartTimestamp;
		const remaining = COUNTDOWN_DURATION_MS - elapsed;

		let newDisplay: string | null;
		if (remaining <= 0) {
			newDisplay = t('ui:countdownGo');
		} else if (remaining <= 1000) {
			newDisplay = '1';
		} else if (remaining <= 2000) {
			newDisplay = '2';
		} else {
			newDisplay = '3';
		}

		if (newDisplay !== prevDisplayRef.current) {
			prevDisplayRef.current = newDisplay;
			setDisplay(newDisplay);
			setAnimKey((k) => k + 1);
		}
	}, [countdownStartTimestamp, started, serverTime, t]);

	if (!countdownStartTimestamp || started || !display) return null;

	const isGo = display === t('ui:countdownGo');

	return (
		<div className="bg-arena-bg/90 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
			<div
				key={animKey}
				className="animate-countdown-pop font-display select-none"
			>
				<span
					className={
						isGo
							? 'text-neon-cyan text-8xl font-black tracking-wider drop-shadow-[0_0_40px_rgba(34,211,238,0.8)] md:text-9xl'
							: 'text-neon-amber text-9xl font-black drop-shadow-[0_0_40px_rgba(251,191,36,0.8)] md:text-[12rem]'
					}
				>
					{display}
				</span>
			</div>

			{/* Radial pulse ring */}
			<div
				key={`ring-${animKey}`}
				className="border-neon-cyan/30 pointer-events-none absolute h-64 w-64 animate-ping rounded-full border-2"
			/>
		</div>
	);
}
