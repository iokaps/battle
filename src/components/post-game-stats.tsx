import { gameConfigStore } from '@/state/stores/game-config-store';
import { gameWorldStore } from '@/state/stores/game-world-store';
import { TEAM_COLORS } from '@/utils/gameConstants';
import { useSnapshot } from '@kokimoki/app';
import { Crown, Heart, Shield, Skull, Sword } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatAward {
	label: string;
	playerName: string;
	value: string;
	icon: React.ReactNode;
	color: string;
}

/**
 * Post-game statistics screen showing MVP, damage dealer, tank, and survivor awards.
 * Displayed on the presenter after game over.
 */
export function PostGameStats() {
	const { t } = useTranslation();
	const { players, winnerId, winnerTeamId, gameOver } = useSnapshot(
		gameWorldStore.proxy
	);
	const { teamMode } = useSnapshot(gameConfigStore.proxy);

	if (!gameOver) return null;

	const allPlayers = Object.entries(players);
	if (allPlayers.length === 0) return null;

	const isTeamMode = teamMode === 'teams';

	// Calculate awards
	const awards: StatAward[] = [];

	// MVP: Most kills
	const mvp = [...allPlayers].sort(([, a], [, b]) => b.kills - a.kills)[0];
	if (mvp && mvp[1].kills > 0) {
		awards.push({
			label: t('ui:statMvp', 'MVP'),
			playerName: mvp[1].name,
			value: `${mvp[1].kills} ${t('ui:killsLabel')}`,
			icon: <Crown className="h-6 w-6" />,
			color: '#fbbf24'
		});
	}

	// Damage Dealer: Most damage dealt
	const dmgDealer = [...allPlayers].sort(
		([, a], [, b]) => b.damageDealt - a.damageDealt
	)[0];
	if (dmgDealer && dmgDealer[1].damageDealt > 0) {
		awards.push({
			label: t('ui:statDamageDealer', 'Damage Dealer'),
			playerName: dmgDealer[1].name,
			value: `${dmgDealer[1].damageDealt} ${t('ui:damageLabel', 'dmg')}`,
			icon: <Sword className="h-6 w-6" />,
			color: '#ef4444'
		});
	}

	// Tank: Most damage blocked
	const tank = [...allPlayers].sort(
		([, a], [, b]) => b.damageBlocked - a.damageBlocked
	)[0];
	if (tank && tank[1].damageBlocked > 0) {
		awards.push({
			label: t('ui:statTank', 'Tank'),
			playerName: tank[1].name,
			value: `${tank[1].damageBlocked} ${t('ui:blockedLabel', 'blocked')}`,
			icon: <Shield className="h-6 w-6" />,
			color: '#22d3ee'
		});
	}

	// Survivor: Last alive (or alive longest)
	const survivor = [...allPlayers].sort(([, a], [, b]) => {
		// Alive players first, then by latest death time
		if (a.alive && !b.alive) return -1;
		if (!a.alive && b.alive) return 1;
		return b.deathTime - a.deathTime;
	})[0];
	if (survivor) {
		awards.push({
			label: t('ui:statSurvivor', 'Survivor'),
			playerName: survivor[1].name,
			value: survivor[1].alive ? t('ui:aliveLabel') : t('ui:eliminatedTag'),
			icon: <Heart className="h-6 w-6" />,
			color: '#4ade80'
		});
	}

	// Team scores
	const teamScores: Record<number, { kills: number; alive: number }> = {};
	if (isTeamMode) {
		for (const [, p] of allPlayers) {
			if (p.teamId <= 0) continue;
			if (!teamScores[p.teamId]) {
				teamScores[p.teamId] = { kills: 0, alive: 0 };
			}
			teamScores[p.teamId].kills += p.kills;
			if (p.alive) teamScores[p.teamId].alive += 1;
		}
	}

	const winner = winnerId ? players[winnerId] : null;

	return (
		<div className="flex flex-col items-center gap-6">
			{/* Team winner */}
			{isTeamMode && winnerTeamId > 0 && TEAM_COLORS[winnerTeamId] && (
				<div className="text-center">
					<h2
						className="font-display text-3xl font-black"
						style={{ color: TEAM_COLORS[winnerTeamId].primary }}
					>
						{TEAM_COLORS[winnerTeamId].name} {t('ui:teamWins', 'Team Wins!')}
					</h2>
					<div className="mt-2 flex justify-center gap-8 text-sm text-slate-400">
						{Object.entries(teamScores).map(([tid, stats]) => {
							const tInfo = TEAM_COLORS[Number(tid)];
							return (
								<div key={tid} className="flex items-center gap-2">
									<span
										className="h-3 w-3 rounded-full"
										style={{ backgroundColor: tInfo?.primary }}
									/>
									<span>{tInfo?.name}</span>
									<span className="font-mono text-slate-300">
										{stats.kills} <Skull className="inline h-3 w-3" />
									</span>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* FFA winner */}
			{!isTeamMode && winner && (
				<div className="text-center">
					<Crown className="text-neon-amber mx-auto mb-2 h-10 w-10" />
					<h2
						className="font-display text-2xl font-black"
						style={{ color: winner.color }}
					>
						{winner.name}
					</h2>
					<p className="text-sm text-slate-400">
						{winner.kills} {t('ui:killsLabel')}
					</p>
				</div>
			)}

			{/* Awards */}
			<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
				{awards.map((award) => (
					<div
						key={award.label}
						className="glass-panel flex flex-col items-center gap-2 px-4 py-3 text-center"
					>
						<div style={{ color: award.color }}>{award.icon}</div>
						<div className="text-xs font-semibold text-slate-400 uppercase">
							{award.label}
						</div>
						<div className="font-display text-sm font-bold text-slate-100">
							{award.playerName}
						</div>
						<div className="text-xs text-slate-400">{award.value}</div>
					</div>
				))}
			</div>

			{/* Full scoreboard */}
			<div className="glass-panel w-full max-w-lg">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-slate-700 text-slate-400">
							<th className="px-3 py-2 text-left">#</th>
							<th className="px-3 py-2 text-left">
								{t('ui:playerLabel', 'Player')}
							</th>
							<th className="px-3 py-2 text-center">
								<Skull className="mx-auto h-3.5 w-3.5" />
							</th>
							<th className="px-3 py-2 text-center">
								<Sword className="mx-auto h-3.5 w-3.5" />
							</th>
							<th className="px-3 py-2 text-center">
								<Shield className="mx-auto h-3.5 w-3.5" />
							</th>
						</tr>
					</thead>
					<tbody>
						{[...allPlayers]
							.sort(([, a], [, b]) => b.kills - a.kills)
							.map(([id, p], i) => (
								<tr
									key={id}
									className={`border-b border-slate-800 ${!p.alive ? 'opacity-50' : ''}`}
								>
									<td className="px-3 py-1.5 font-mono text-slate-500">
										{i + 1}
									</td>
									<td className="flex items-center gap-2 px-3 py-1.5">
										<span
											className="h-2.5 w-2.5 rounded-full"
											style={{ backgroundColor: p.color }}
										/>
										<span className="text-slate-200">{p.name}</span>
										{isTeamMode && p.teamId > 0 && TEAM_COLORS[p.teamId] && (
											<span
												className="text-xs"
												style={{ color: TEAM_COLORS[p.teamId].primary }}
											>
												T{p.teamId}
											</span>
										)}
									</td>
									<td className="text-neon-amber px-3 py-1.5 text-center font-mono">
										{p.kills}
									</td>
									<td className="px-3 py-1.5 text-center font-mono text-slate-300">
										{p.damageDealt}
									</td>
									<td className="text-neon-cyan px-3 py-1.5 text-center font-mono">
										{p.damageBlocked}
									</td>
								</tr>
							))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
