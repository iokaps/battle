import { HostControls } from '@/components/host/host-controls';
import {
	type ModeGuardProps,
	withModeGuard
} from '@/components/with-mode-guard';
import { useGlobalController } from '@/hooks/useGlobalController';
import { useMeta } from '@/hooks/useMeta';
import { usePlayersWithOnlineStatus } from '@/hooks/usePlayersWithOnlineStatus';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { gameSessionActions } from '@/state/actions/game-session-actions';
import { gameSessionStore } from '@/state/stores/game-session-store';
import { gameWorldStore } from '@/state/stores/game-world-store';
import { useSnapshot } from '@kokimoki/app';
import {
	CirclePlay,
	CircleStop,
	Skull,
	SquareArrowOutUpRight
} from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

function App({ clientContext }: ModeGuardProps<'host'>) {
	const { t } = useTranslation();
	useMeta();
	useGlobalController();

	const { started, countdownStartTimestamp } = useSnapshot(
		gameSessionStore.proxy
	);
	const worldSnap = useSnapshot(gameWorldStore.proxy);
	const { players } = usePlayersWithOnlineStatus();
	const [buttonCooldown, setButtonCooldown] = React.useState(true);

	const isActive = started || countdownStartTimestamp > 0;

	React.useEffect(() => {
		setButtonCooldown(true);
		const timeout = setTimeout(() => {
			setButtonCooldown(false);
		}, 1000);

		return () => clearTimeout(timeout);
	}, [isActive]);

	const playerLink = kmClient.generateLink(clientContext.playerCode, {
		mode: 'player'
	});

	const presenterLink = kmClient.generateLink(clientContext.presenterCode, {
		mode: 'presenter',
		playerCode: clientContext.playerCode
	});

	// Sorted world players by kills for battle status
	const sortedWorldPlayers = React.useMemo(
		() =>
			[...Object.entries(worldSnap.players)].sort(
				([, a], [, b]) => b.kills - a.kills
			),
		[worldSnap.players]
	);

	return (
		<HostPresenterLayout.Root>
			<HostPresenterLayout.Header />
			<HostPresenterLayout.Main>
				<div className="space-y-4">
					{/* During gameplay: show player list with HP */}
					{started && (
						<div className="space-y-3">
							<h2 className="font-display text-lg font-bold text-slate-100">
								{t('ui:battleStatus')}
							</h2>
							{sortedWorldPlayers.map(([id, player]) => (
								<div
									key={id}
									className="glass-panel flex items-center gap-3 p-3"
								>
									<div
										className="h-8 w-8 rounded-full border-2"
										style={{
											backgroundColor: player.color,
											borderColor: player.alive
												? player.color
												: 'rgb(71 85 105)',
											opacity: player.alive ? 1 : 0.4
										}}
									/>
									<div className="flex-1">
										<div className="flex items-center justify-between">
											<span className="text-sm font-semibold text-slate-100">
												{player.name}
											</span>
											<span className="flex items-center gap-1 text-xs">
												{player.alive ? (
													<span className="text-neon-green font-mono">
														{player.hp}/{player.maxHp}
													</span>
												) : (
													<span className="text-neon-red flex items-center gap-1">
														<Skull className="h-3 w-3" />
														{t('ui:eliminatedTag')}
													</span>
												)}
											</span>
										</div>
										{/* HP bar */}
										<div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
											<div
												className="h-full rounded-full transition-all duration-200"
												style={{
													width: `${(player.hp / player.maxHp) * 100}%`,
													backgroundColor:
														player.hp / player.maxHp > 0.5
															? '#4ade80'
															: player.hp / player.maxHp > 0.25
																? '#fbbf24'
																: '#f87171'
												}}
											/>
										</div>
									</div>
									{/* Kill count */}
									<span className="text-neon-amber font-mono text-xs">
										{player.kills}
									</span>
								</div>
							))}
							{worldSnap.gameOver && worldSnap.winnerId && (
								<div className="glass-panel border-neon-amber/30 p-3 text-center">
									<span className="font-display text-neon-amber font-bold">
										{t('ui:winnerLabel')}:{' '}
										{worldSnap.players[worldSnap.winnerId]?.name}
									</span>
								</div>
							)}
						</div>
					)}

					{!isActive && <HostControls />}
				</div>
			</HostPresenterLayout.Main>

			<HostPresenterLayout.Footer>
				<div className="inline-flex flex-wrap gap-4">
					{!isActive && (
						<button
							type="button"
							className="km-btn-primary"
							onClick={gameSessionActions.startGame}
							disabled={buttonCooldown || players.length === 0}
						>
							<CirclePlay className="size-5" />
							{t('ui:startBattleWithCount', {
								count: players.length
							})}
						</button>
					)}
					{isActive && (
						<button
							type="button"
							className="km-btn-error"
							onClick={gameSessionActions.stopGame}
							disabled={buttonCooldown}
						>
							<CircleStop className="size-5" />
							{t('ui:stopButton')}
						</button>
					)}

					<a
						href={playerLink}
						target="_blank"
						rel="noreferrer"
						className="km-btn-secondary"
					>
						{t('ui:playerLinkLabel')}
						<SquareArrowOutUpRight className="size-5" />
					</a>

					<a
						href={presenterLink}
						target="_blank"
						rel="noreferrer"
						className="km-btn-secondary"
					>
						{t('ui:presenterLinkLabel')}
						<SquareArrowOutUpRight className="size-5" />
					</a>
				</div>
			</HostPresenterLayout.Footer>
		</HostPresenterLayout.Root>
	);
}

export default withModeGuard(App, 'host');
