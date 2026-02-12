import { kmClient, kmEnv } from '@/services/km-client';
import { useSnapshot } from '@kokimoki/app';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook to sync document metadata (lang and title) with kmClient meta store.
 *
 * Sets document language attribute and title based on meta store values.
 * Updates dynamically when meta store changes.
 *
 * @example
 * useMeta();
 */
export function useMeta(): void {
	const { t, i18n } = useTranslation();
	const { lang, title } = useSnapshot(kmClient.metaStore.proxy);

	React.useEffect(() => {
		const newLang = lang || kmEnv.defaultAppMeta?.lang || 'en';
		document.documentElement.lang = newLang;
		i18n.changeLanguage(newLang);
	}, [i18n, lang]);

	React.useEffect(() => {
		document.title = title || t('meta:title');
	}, [t, title]);
}
