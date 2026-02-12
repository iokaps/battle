import type { ClientContext } from '@/types/client';
import { getKmClient, getKmEnv, type KokimokiEnv } from '@kokimoki/app';
import { initReactI18next } from 'react-i18next';

/**
 * Kokimoki environment variables
 */
export const kmEnv: KokimokiEnv = getKmEnv();

/**
 * Base URL for static assets (CDN in production, root in dev)
 */
export function getAssetPath(path: string): string {
	return kmEnv.assets.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

/**
 * Kokimoki client to interact with the Kokimoki SDK platform.
 * Used to manage the app state, interact with the Kokimoki services,
 * provides access to the client context and more.
 *
 * @returns Kokimoki client instance
 */
export const kmClient = getKmClient<ClientContext>();

/**
 * i18n instance for translations
 * Uses react-i18next for React integration
 */
export const i18n = kmClient.i18n.createI18n({
	use: [initReactI18next]
});
