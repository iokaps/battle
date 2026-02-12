import { AvatarPreview } from '@/components/avatar-preview';
import { usePlayersWithOnlineStatus } from '@/hooks/usePlayersWithOnlineStatus';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';

/**
 * Lobby view showing game instructions and a player avatar gallery grid.
 * Displayed before the host starts the game.
 */
export function GameLobbyView() {
	const { t } = useTranslation();
	const { players } = usePlayersWithOnlineStatus();

	return (
		<div className="space-y-8">
			<article className="prose">
				<Markdown>{t('ui:gameLobbyMd')}</Markdown>
			</article>

			{/* Player gallery */}
			{players.length > 0 && (
				<div className="space-y-3">
					<h3 className="font-display text-sm font-semibold tracking-wider text-slate-400 uppercase">
						{t('ui:players')} ({players.length})
					</h3>
					<div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
						{players.map((player) => (
							<div
								key={player.id}
								className="glass-panel animate-fade-in-up flex flex-col items-center gap-2 p-3"
							>
								<AvatarPreview
									avatarUrl={player.avatarUrl || ''}
									status={player.avatarUrl ? 'done' : 'idle'}
									color={player.color}
									name={player.name}
									size="md"
								/>
								<span className="max-w-full truncate text-xs font-medium text-slate-200">
									{player.name}
								</span>
								<span
									className={
										player.isOnline
											? 'text-neon-green text-[10px]'
											: 'text-[10px] text-slate-500'
									}
								>
									{player.isOnline ? t('ui:online') : t('ui:offline')}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Waiting indicator */}
			<div className="flex items-center justify-center gap-2 text-slate-500">
				<Loader2 className="text-neon-cyan h-4 w-4 animate-spin" />
				<span className="font-display text-xs tracking-wider">
					{t('ui:waitingForHost')}
				</span>
			</div>
		</div>
	);
}
