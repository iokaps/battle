import { CountdownOverlay } from '@/components/countdown-overlay';
import {
	withModeGuard,
	type ModeGuardProps
} from '@/components/with-mode-guard';
import { useGlobalController } from '@/hooks/useGlobalController';
import { useMeta } from '@/hooks/useMeta';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { gameConfigStore } from '@/state/stores/game-config-store';
import { gameSessionStore } from '@/state/stores/game-session-store';
import { cn } from '@/utils/cn';
import { BattleArenaView } from '@/views/battle-arena-view';
import { ConnectionsView } from '@/views/connections-view';
import { useSnapshot } from '@kokimoki/app';
import { KmQrCode } from '@kokimoki/react-components';

function App({ clientContext }: ModeGuardProps<'presenter'>) {
	useMeta();
	useGlobalController();

	const { showPresenterQr } = useSnapshot(gameConfigStore.proxy);
	const { started, countdownStartTimestamp } = useSnapshot(
		gameSessionStore.proxy
	);

	const playerLink = kmClient.generateLink(clientContext.playerCode, {
		mode: 'player'
	});

	const isCountdown = countdownStartTimestamp > 0 && !started;

	// Show countdown overlay during countdown phase
	if (isCountdown) {
		return (
			<div className="bg-arena-bg relative h-dvh w-full overflow-hidden">
				<CountdownOverlay />
			</div>
		);
	}

	// Show battle arena when game is started
	if (started) {
		return <BattleArenaView />;
	}

	return (
		<HostPresenterLayout.Root>
			<HostPresenterLayout.Header />

			<HostPresenterLayout.Main>
				<ConnectionsView>
					<KmQrCode
						data={playerLink}
						size={200}
						className={cn({ invisible: !showPresenterQr })}
					/>
				</ConnectionsView>
			</HostPresenterLayout.Main>
		</HostPresenterLayout.Root>
	);
}

export default withModeGuard(App, 'presenter');
