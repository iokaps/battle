import { usePlayersWithOnlineStatus } from '@/hooks/usePlayersWithOnlineStatus';
import { kmClient } from '@/services/km-client';
import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';

interface ConnectionViewProps {
	children?: ReactNode;
}

/**
 * Example view demonstrating how to display players and their online status.
 * Shows usage of `usePlayersWithOnlineStatus` hook for player list with presence.
 * Modify or replace with your own implementation.
 */
export function ConnectionsView({ children }: ConnectionViewProps) {
	const { t } = useTranslation();
	const { players, onlinePlayersCount } = usePlayersWithOnlineStatus();

	const isPresenter = kmClient.clientContext.mode === 'presenter';

	return (
		<div className="w-full space-y-8">
			<div className="flex items-center justify-between gap-8">
				<article
					className={cn(
						'prose',
						isPresenter && 'lg:prose-lg xl:prose-xl 2xl:prose-2xl'
					)}
				>
					<h1>
						{onlinePlayersCount} {t('ui:players')}
					</h1>

					<Markdown>{t('ui:connectionsMd')}</Markdown>
				</article>

				{children}
			</div>

			{players.length > 0 && (
				<ul className="w-full divide-y divide-slate-300 lg:text-lg xl:text-xl 2xl:text-2xl">
					{players.map((player) => (
						<li key={player.id} className="py-6">
							<div className="flex items-center justify-between">
								<span className="font-semibold">{player.name}</span>
								<span
									className={cn(
										'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
										player.isOnline
											? 'bg-green-100 text-green-900'
											: 'text-slate-400 italic'
									)}
								>
									{player.isOnline ? t('ui:online') : t('ui:offline')}
								</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
