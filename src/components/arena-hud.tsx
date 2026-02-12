import { PostGameStats } from '@/components/post-game-stats';
import { gameConfigStore } from '@/state/stores/game-config-store';
import { gameWorldStore } from '@/state/stores/game-world-store';
import { TEAM_COLORS } from '@/utils/gameConstants';
import { useSnapshot } from '@kokimoki/app';
import { Crown, Skull, Users } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Overlay HUD for the arena view.
 * Shows alive player count, animated kill feed, scoreboard, streak announcements,
 * team scores, and dramatic game-over with post-game stats.
 */
export function ArenaHUD() {
	const { t } = useTranslation();
	const {
		players,
		gameOver,
		winnerId,
		winnerTeamId,
		killFeed: killFeedRecord,
		streaks
	} = useSnapshot(gameWorldStore.proxy);
	const killFeed = Object.values(killFeedRecord);
	const { teamMode } = useSnapshot(gameConfigStore.proxy);

	const isTeamMode = teamMode === 'teams';
	const allPlayers = Object.entries(players);
	const aliveCount = allPlayers.filter(([, p]) => p.alive).length;
	const totalCount = allPlayers.length;
	const winner = winnerId ? players[winnerId] : null;

	// Sorted scoreboard (by kills descending)
	const scoreboard = React.useMemo(
		() => [...allPlayers].sort(([, a], [, b]) => b.kills - a.kills).slice(0, 5),
		[allPlayers]
	);

	// Team scores
	const teamScores = React.useMemo(() => {
		if (!isTeamMode) return null;
		const scores: Record<number, { kills: number; alive: number }> = {};
		for (const [, p] of allPlayers) {
			if (p.teamId <= 0) continue;
			if (!scores[p.teamId]) scores[p.teamId] = { kills: 0, alive: 0 };
			scores[p.teamId].kills += p.kills;
			if (p.alive) scores[p.teamId].alive += 1;
		}
		return scores;
	}, [allPlayers, isTeamMode]);

	// Detect first blood
	const [showFirstBlood, setShowFirstBlood] = React.useState(false);
	const firstBloodRef = React.useRef(false);
	React.useEffect(() => {
		if (killFeed.length > 0 && !firstBloodRef.current && totalCount > 0) {
			firstBloodRef.current = true;
			setShowFirstBlood(true);
			setTimeout(() => setShowFirstBlood(false), 2500);
		}
		if (killFeed.length === 0) {
			firstBloodRef.current = false;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [killFeed.length, totalCount]);

	return (
		<div className="pointer-events-none absolute inset-0 flex flex-col p-4">
			{/* Top bar */}
			<div className="flex items-start justify-between">
				{/* Alive count */}
				<div className="glass-panel flex items-center gap-2 px-4 py-2 text-white">
					<Users className="text-neon-cyan h-4 w-4" />
					<span className="font-display text-neon-cyan text-lg font-bold">
						{aliveCount}
					</span>
					<span className="text-sm text-slate-400">/ {totalCount}</span>
					<span className="ml-1 text-xs text-slate-500">
						{t('ui:aliveLabel')}
					</span>
				</div>

				{/* Team scores (team mode) */}
				{isTeamMode && teamScores && (
					<div className="glass-panel flex gap-4 px-4 py-2">
						{Object.entries(teamScores).map(([tid, stats]) => {
							const teamInfo = TEAM_COLORS[Number(tid)];
							if (!teamInfo) return null;
							return (
								<div key={tid} className="flex items-center gap-1.5 text-sm">
									<span
										className="h-3 w-3 rounded-full"
										style={{ backgroundColor: teamInfo.primary }}
									/>
									<span
										className="font-display font-bold"
										style={{ color: teamInfo.primary }}
									>
										{stats.kills}
									</span>
									<span className="text-xs text-slate-500">
										({stats.alive})
									</span>
								</div>
							);
						})}
					</div>
				)}

				{/* Top scoreboard */}
				{totalCount > 0 && !isTeamMode && (
					<div className="glass-panel hidden px-3 py-2 md:block">
						<div className="space-y-1">
							{scoreboard.map(([id, p], i) => (
								<div
									key={id}
									className="flex items-center gap-2 text-xs text-slate-300"
								>
									{i === 0 && p.kills > 0 && (
										<Crown className="text-neon-amber h-3 w-3" />
									)}
									<span
										className="h-2 w-2 rounded-full"
										style={{ backgroundColor: p.color }}
									/>
									<span
										className={!p.alive ? 'text-slate-600 line-through' : ''}
									>
										{p.name}
									</span>
									<span className="text-neon-amber ml-auto font-mono">
										{p.kills}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Kill feed (top right) */}
			{killFeed.length > 0 && (
				<div className="absolute top-4 right-4 space-y-1.5 md:top-4 md:right-auto md:left-1/2 md:-translate-x-1/2">
					{killFeed.map((entry, i) => (
						<div
							key={`${entry.timestamp}-${i}`}
							className="glass-panel animate-slide-in-right flex items-center gap-1.5 px-3 py-1.5 text-sm"
						>
							<Skull className="text-neon-red h-3.5 w-3.5" />
							<span className="text-neon-amber font-semibold">
								{entry.killerName}
							</span>
							<span className="text-slate-500">{t('ui:eliminatedVerb')}</span>
							<span className="font-semibold text-slate-300">
								{entry.victimName}
							</span>
						</div>
					))}
				</div>
			)}

			{/* First blood flash */}
			{showFirstBlood && (
				<div className="absolute inset-x-0 top-1/3 flex justify-center">
					<div className="animate-countdown-pop font-display text-neon-red text-4xl font-black tracking-widest drop-shadow-[0_0_30px_rgba(248,113,113,0.8)] md:text-6xl">
						{t('ui:firstBlood')}
					</div>
				</div>
			)}

			{/* Game over overlay with post-game stats */}
			{gameOver && (
				<div className="pointer-events-auto flex flex-1 items-center justify-center overflow-y-auto">
					<div className="glass-panel animate-fade-in-up max-h-[90vh] overflow-y-auto px-8 py-6 text-center md:px-12 md:py-8">
						<h1 className="font-display text-neon-cyan text-4xl font-black tracking-wider drop-shadow-[0_0_30px_rgba(34,211,238,0.6)] md:text-5xl">
							{t('ui:gameOverTitle')}
						</h1>
						<div className="mt-6">
							<PostGameStats />
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
