import { playersStore } from '@/state/stores/players-store';
import { useSnapshot } from '@kokimoki/app';
import { useStoreConnections } from './useStoreConnections';

/**
 * Hook to get the list of players with their online status and the count of online players
 *
 * @returns An array of players with their id, player value and online status. Also returns the count of online players.
 *
 * @example
 * const { players, onlinePlayersCount } = usePlayersWithOnlineStatus();
 */
export function usePlayersWithOnlineStatus() {
	const { players } = useSnapshot(playersStore.proxy);
	const { clientIds: onlinePlayerIds } = useStoreConnections(playersStore);

	const playersWithOnlineStatus = Object.entries(players).map(
		([id, player]) => ({
			id,
			...player,
			isOnline: onlinePlayerIds.has(id)
		})
	);

	const onlinePlayersCount = playersWithOnlineStatus.filter(
		(p) => p.isOnline
	).length;

	return {
		players: playersWithOnlineStatus,
		onlinePlayersCount
	};
}
