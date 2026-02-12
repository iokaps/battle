import { TimeCountdown } from '@/components/time-countdown';
import { useServerTimer } from '@/hooks/useServerTime';
import { kmClient } from '@/services/km-client';
import { gameConfigStore } from '@/state/stores/game-config-store';
import { gameSessionStore } from '@/state/stores/game-session-store';
import { useSnapshot } from '@kokimoki/app';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';

/**
 * Example view demonstrating how to display game state with countdown timer.
 * Shows usage of server timer and game configuration for synchronized time display.
 * Modify or replace with your own implementation.
 */
export function GameStateView() {
	const { t } = useTranslation();
	const { started, startTimestamp } = useSnapshot(gameSessionStore.proxy);
	const { gameDuration } = useSnapshot(gameConfigStore.proxy);
	const serverTime = useServerTimer();

	const isHost = kmClient.clientContext.mode === 'host';

	// Calculate remaining time (countdown)
	const elapsed = serverTime - startTimestamp;
	const durationMs = gameDuration * 60 * 1000;
	const remaining = Math.max(0, durationMs - elapsed);

	return (
		<>
			<article className="prose">
				{started && (
					<TimeCountdown
						className={`mb-8 inline-block font-sans font-extrabold ${isHost ? 'text-6xl' : ''}`}
						ms={remaining}
					/>
				)}

				<Markdown>
					{isHost ? t('ui:sharedStateMd') : t('ui:sharedStatePlayerMd')}
				</Markdown>
			</article>
		</>
	);
}
