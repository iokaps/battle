import { kmClient } from '@/services/km-client';
import { gameSessionActions } from '@/state/actions/game-session-actions';
import { gameWorldActions } from '@/state/actions/game-world-actions';
import { gameConfigStore } from '@/state/stores/game-config-store';
import { gameSessionStore } from '@/state/stores/game-session-store';
import { COUNTDOWN_DURATION_MS, TICK_INTERVAL_MS } from '@/utils/gameConstants';
import { useSnapshot } from '@kokimoki/app';
import { useEffect, useRef } from 'react';
import { useServerTimer } from './useServerTime';
import { useStoreConnections } from './useStoreConnections';

/** How often (ms) the controller syncs the in-memory world to the store */
const SYNC_INTERVAL_MS = 100;

/**
 * Hook that maintains a single global controller connection across all clients.
 *
 * Handles:
 * 1. Controller election (lowest connectionId)
 * 2. Countdown phase — waits COUNTDOWN_DURATION_MS then starts battle
 * 3. Physics simulation via direct setInterval (bypasses React render cycle)
 * 4. Game-end detection and cleanup
 *
 * @returns A boolean indicating if the current client is the global controller
 */
export function useGlobalController(): boolean {
	const { controllerConnectionId, started, countdownStartTimestamp } =
		useSnapshot(gameSessionStore.proxy);
	const { connectionIds } = useStoreConnections(gameSessionStore);

	const isGlobalController = controllerConnectionId === kmClient.connectionId;
	// Only used for countdown detection (low frequency is fine)
	const serverTime = useServerTimer(started ? 500 : 1000);

	const countdownHandledRef = useRef(false);

	// Maintain connection that is assigned to be the global controller
	useEffect(() => {
		if (connectionIds.has(controllerConnectionId)) {
			return;
		}

		kmClient
			.transact([gameSessionStore], ([gameSessionState]) => {
				const connectionIdsArray = Array.from(connectionIds);
				connectionIdsArray.sort();
				gameSessionState.controllerConnectionId = connectionIdsArray[0] || '';
			})
			.then(() => {})
			.catch(() => {});
	}, [connectionIds, controllerConnectionId]);

	// Handle countdown → battle transition (controller only)
	useEffect(() => {
		if (!isGlobalController) {
			countdownHandledRef.current = false;
			return;
		}

		// If countdown is active but battle hasn't started yet
		if (
			countdownStartTimestamp > 0 &&
			!started &&
			!countdownHandledRef.current
		) {
			const elapsed = serverTime - countdownStartTimestamp;
			if (elapsed >= COUNTDOWN_DURATION_MS) {
				countdownHandledRef.current = true;
				// Initialize world, then start battle
				gameWorldActions.initializeWorld().then(() => {
					gameSessionActions.startBattle();
				});
			}
		}

		// Reset flag when game stops
		if (!countdownStartTimestamp) {
			countdownHandledRef.current = false;
		}
	}, [isGlobalController, countdownStartTimestamp, started, serverTime]);

	// Track when game starts for hasInitialized
	useEffect(() => {
		if (!isGlobalController || !started) {
			return;
		}

		// Hydrate local world from store in case we're a new controller taking over
		if (!gameWorldActions.getLocalWorld()) {
			gameWorldActions.hydrateFromStore();
		}
	}, [isGlobalController, started]);

	// Game loop: synchronous physics + periodic fire-and-forget store sync.
	// Physics runs on in-memory state (zero network latency).
	// Store sync is decoupled so network delays never block the game loop.
	useEffect(() => {
		if (!isGlobalController || !started) {
			return;
		}

		let gameOverHandled = false;

		// Physics tick — synchronous, no network, guaranteed 20fps
		const tickId = setInterval(() => {
			const gameSessionState = gameSessionStore.proxy;
			if (!gameSessionState.started) return;

			const now = kmClient.serverTimestamp();
			const gameDurationMs = gameConfigStore.proxy.gameDuration * 60 * 1000;
			if (now - gameSessionState.startTimestamp > gameDurationMs) {
				gameSessionActions.stopGame().catch(() => {});
				return;
			}

			// Process physics on local in-memory state (instant)
			gameWorldActions.processTickLocal(now);

			// Check game over from local state
			const localWorld = gameWorldActions.getLocalWorld();
			if (localWorld?.gameOver && !gameOverHandled) {
				gameOverHandled = true;
				// Final sync before stopping
				gameWorldActions.syncToStore();
				setTimeout(() => {
					gameSessionActions.stopGame().catch(() => {});
				}, 5000);
			}
		}, TICK_INTERVAL_MS);

		// Store sync — fire-and-forget, decoupled from physics
		const syncId = setInterval(() => {
			gameWorldActions.syncToStore();
		}, SYNC_INTERVAL_MS);

		return () => {
			clearInterval(tickId);
			clearInterval(syncId);
			// Final sync on cleanup
			gameWorldActions.syncToStore();
		};
	}, [isGlobalController, started]);

	// Cleanup world when game stops
	useEffect(() => {
		if (!isGlobalController || started) return;

		const localWorld = gameWorldActions.getLocalWorld();
		if (localWorld?.gameOver) {
			gameWorldActions.resetWorld().catch(() => {});
		}
	}, [isGlobalController, started]);

	return isGlobalController;
}
