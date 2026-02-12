import type { KokimokiKitConfig } from '@kokimoki/kit';
import enMeta from './src/i18n/en/meta.json';
import {
	gameConfigStoreSchema,
	gameSessionStoreSchema,
	gameWorldStoreSchema,
	localPlayerStoreSchema,
	playerInputStoreSchema,
	playersStoreSchema
} from './src/state/schemas';

/**
 * Kokimoki Kit Configuration
 *
 * This file defines the core configuration for the Kokimoki application.
 * See @kokimoki/kit docs for all available options.
 */
export const kokimokiConfig: KokimokiKitConfig = {
	// Unique identifier for this game concept (assigned by Kokimoki)
	conceptId: '698db7183aabd17c07341f09',

	/**
	 * Deploy Codes - Define different entry points/modes for the application
	 *
	 * Each deploy code generates a unique link with its clientContext.
	 * The `mode` in clientContext determines which src/modes/app.{mode}.tsx is loaded.
	 * Use `$name` syntax to auto-generate linked codes (e.g., $player for playerCode).
	 */
	deployCodes: [
		{
			name: 'host',
			description: 'Link for hosts',
			clientContext: {
				mode: 'host',
				playerCode: '$player', // Auto-fills linked player code
				presenterCode: '$presenter' // Auto-fills linked presenter code
			}
		},
		{
			name: 'presenter',
			description: 'Link for presenters',
			clientContext: {
				mode: 'presenter',
				playerCode: '$player' // Auto-fills linked player code
			}
		},
		{
			name: 'player',
			description: 'Link for players',
			clientContext: {
				mode: 'player'
			}
		}
	],

	/**
	 * Dev View - Layout for development multi-client preview
	 *
	 * Each array represents a row of frames in the dev view.
	 * Useful for testing multiple clients simultaneously during development.
	 */
	devView: [
		[
			{
				label: 'host',
				clientContext: {
					mode: 'host',
					playerCode: 'player',
					presenterCode: 'presenter'
				}
			},
			{
				label: 'presenter',
				clientContext: { mode: 'presenter', playerCode: 'player' }
			}
		],
		[
			{ label: 'player1', clientContext: { mode: 'player' } },
			{ label: 'player2', clientContext: { mode: 'player' } },
			{ label: 'player3', clientContext: { mode: 'player' } }
		]
	],

	/**
	 * Store Schemas - Zod schemas for validating store state
	 *
	 * Each store must have a matching schema for type safety and validation.
	 * Pattern should match the store name used in kmClient.store() or kmClient.localStore().
	 * Set `local: true` for stores that are device-only (not synced).
	 *
	 * Set `isTransferable: true` for stores that can be reused when creating
	 * new app instances (e.g., game-config). Highly dynamic stores like game-session
	 * should not be transferable.
	 */
	stores: [
		{
			pattern: 'game-config',
			schema: gameConfigStoreSchema,
			isTransferable: true
		},
		{ pattern: 'game-session', schema: gameSessionStoreSchema },
		{ pattern: 'players-registry', schema: playersStoreSchema },
		{ pattern: 'player-inputs', schema: playerInputStoreSchema },
		{ pattern: 'game-world', schema: gameWorldStoreSchema },
		{ pattern: 'local-player', schema: localPlayerStoreSchema, local: true }
	],

	/**
	 * Default App Meta - SEO and social sharing defaults
	 *
	 * These values are loaded from i18n/en/meta.json for the built-in appMetaStore.
	 * ogImage and favicon are set here for server HTML meta tag injection.
	 */
	defaultAppMeta: {
		...enMeta,
		lang: 'en',
		ogImage: '/og-image.webp',
		favicon: '/favicon.png'
	},

	// Path to i18n translation files (see src/i18n/ for structure)
	i18nPath: './src/i18n',

	// Default project styles imported in admin panel preview
	defaultProjectStylePath: './kokimoki.style.css'
};
