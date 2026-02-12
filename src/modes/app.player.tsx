import { AvatarPreview } from '@/components/avatar-preview';
import { CountdownOverlay } from '@/components/countdown-overlay';
import { PlayerMenu } from '@/components/menu';
import { withKmProviders } from '@/components/with-km-providers';
import { withModeGuard } from '@/components/with-mode-guard';
import { useAvatarGeneration } from '@/hooks/useAvatarGeneration';
import { useGlobalController } from '@/hooks/useGlobalController';
import { useMeta } from '@/hooks/useMeta';
import { PlayerLayout } from '@/layouts/player';
import { kmClient } from '@/services/km-client';
import { localPlayerActions } from '@/state/actions/local-player-actions';
import { gameSessionStore } from '@/state/stores/game-session-store';
import { localPlayerStore } from '@/state/stores/local-player-store';
import { playersStore } from '@/state/stores/players-store';
import { BattleView } from '@/views/battle-view';
import { CreateProfileView } from '@/views/create-profile-view';
import { GameLobbyView } from '@/views/game-lobby-view';
import { useSnapshot } from '@kokimoki/app';
import * as React from 'react';

const App: React.FC = () => {
	useMeta();
	useGlobalController();

	const { name, currentView } = useSnapshot(localPlayerStore.proxy);
	const { started, countdownStartTimestamp } = useSnapshot(
		gameSessionStore.proxy
	);
	const playerData = useSnapshot(playersStore.proxy).players[kmClient.id];
	const { status: avatarStatus, avatarUrl, generate } = useAvatarGeneration();

	// Trigger avatar generation once after profile creation
	const { avatarPrompt, avatarJobId } = useSnapshot(localPlayerStore.proxy);
	React.useEffect(() => {
		if (avatarPrompt && !avatarUrl && !avatarJobId && avatarStatus === 'idle') {
			generate(avatarPrompt);
		}
	}, [avatarPrompt, avatarUrl, avatarJobId, avatarStatus, generate]);

	React.useEffect(() => {
		if (started) {
			localPlayerActions.setCurrentView('battle');
		} else {
			localPlayerActions.setCurrentView('lobby');
		}
	}, [started]);

	// Determine if we're in countdown phase
	const isCountdown = countdownStartTimestamp > 0 && !started;

	if (!name) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header />
				<PlayerLayout.Main>
					<CreateProfileView />
				</PlayerLayout.Main>
			</PlayerLayout.Root>
		);
	}

	// During countdown phase, show countdown overlay over lobby
	if (isCountdown) {
		return (
			<div className="bg-arena-bg relative h-dvh overflow-hidden">
				<CountdownOverlay />
			</div>
		);
	}

	if (!started) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header>
					<PlayerMenu />
				</PlayerLayout.Header>

				<PlayerLayout.Main>
					<GameLobbyView />
				</PlayerLayout.Main>

				<PlayerLayout.Footer>
					<div className="flex items-center gap-3">
						<AvatarPreview
							avatarUrl={avatarUrl}
							status={avatarStatus}
							color={playerData?.color || '#6b7280'}
							name={name}
							size="sm"
						/>
						<span className="font-semibold text-slate-100">{name}</span>
					</div>
				</PlayerLayout.Footer>
			</PlayerLayout.Root>
		);
	}

	return (
		<div className="bg-arena-bg h-dvh overflow-hidden">
			{currentView === 'battle' && <BattleView />}
		</div>
	);
};

export default withKmProviders(withModeGuard(App, 'player'));
