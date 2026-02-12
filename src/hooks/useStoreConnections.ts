import { useSnapshot, type KokimokiStore } from '@kokimoki/app';

/**
 * Hook to access connection IDs and client IDs from a Kokimoki store
 *
 * It returns two sets:
 * - `connectionIds`: unique IDs for each connection to the store
 * - `clientIds`: unique IDs for each client (user) connected to the store
 *
 *  One connection ID is connected to one client ID, but a client ID can have multiple connection IDs (e.g., multiple tabs).
 *
 * @param {KokimokiStore} store The Kokimoki store to access connections from
 * @returns The set of connection IDs and client IDs in the store
 *
 * @example
 * const { connectionIds } = useStoreConnections(gameStore);
 */
export function useStoreConnections<T extends object>(
	store: KokimokiStore<T>
): {
	connectionIds: Set<string>;
	clientIds: Set<string>;
} {
	const { connectionIds, clientIds } = useSnapshot(store.connections);

	return {
		connectionIds,
		clientIds
	};
}
