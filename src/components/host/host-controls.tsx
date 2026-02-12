import { kmClient } from '@/services/km-client';
import { gameConfigActions } from '@/state/actions/game-config-actions';
import { gameConfigStore } from '@/state/stores/game-config-store';
import { gameSessionStore } from '@/state/stores/game-session-store';
import { useSnapshot } from '@kokimoki/app';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
	{ code: 'en', label: 'English' },
	{ code: 'es', label: 'Español' },
	{ code: 'et', label: 'Eesti keel' },
	{ code: 'de', label: 'Deutsch' },
	{ code: 'fr', label: 'Français' },
	{ code: 'it', label: 'Italiano' },
	{ code: 'ja', label: '日本語' },
	{ code: 'ko', label: '한국어' },
	{ code: 'nl', label: 'Nederlands' },
	{ code: 'pt', label: 'Português' },
	{ code: 'ru', label: 'Русский' },
	{ code: 'zh', label: '中文' }
];

/**
 * Example component demonstrating how to create host-specific controls.
 * Shows usage of game config store and host actions.
 * Modify or replace with your own implementation.
 */
export function HostControls() {
	const { t } = useTranslation();
	const { lang, title } = useSnapshot(kmClient.metaStore.proxy);
	const { started } = useSnapshot(gameSessionStore.proxy);
	const { gameDuration, showPresenterQr } = useSnapshot(gameConfigStore.proxy);

	// Local state for form inputs
	const [localLanguage, setLocalLanguage] = React.useState(lang);
	const [localTitle, setLocalTitle] = React.useState(title || '');
	const [localDuration, setLocalDuration] = React.useState(gameDuration);

	// Handle requested language translation
	const [requestedLang, setRequestedLang] = React.useState(lang);
	const [requestedLangStatus, setRequestedLangStatus] = React.useState<
		'processing' | 'available' | 'failed'
	>('available');

	React.useEffect(() => {
		if (!localLanguage || requestedLang === localLanguage) {
			return;
		}

		setRequestedLang(localLanguage);
		setRequestedLangStatus('processing');

		kmClient.i18n.requestTranslation(localLanguage).then((status) => {
			setRequestedLangStatus(status);
		});
	}, [requestedLang, localLanguage]);

	React.useEffect(() => {
		if (!requestedLang || requestedLangStatus !== 'processing') {
			return;
		}

		const checkInterval = setInterval(async () => {
			const status = await kmClient.i18n.getTranslationStatus(requestedLang);
			setRequestedLangStatus(status);

			if (status !== 'processing') {
				clearInterval(checkInterval);
			}
		}, 2000);

		return () => clearInterval(checkInterval);
	}, [requestedLang, requestedLangStatus]);

	// Sync local state when store changes (e.g., from another client)
	React.useEffect(() => {
		setLocalLanguage(lang);
	}, [lang]);

	React.useEffect(() => {
		setLocalTitle(title || '');
	}, [title]);

	React.useEffect(() => {
		setLocalDuration(gameDuration);
	}, [gameDuration]);

	const hasChanges =
		localLanguage !== lang ||
		localTitle !== title ||
		localDuration !== gameDuration;

	const handleSave = async () => {
		if (localLanguage !== lang && localLanguage) {
			await gameConfigActions.setLanguage(localLanguage);
		}

		if (localTitle !== title) {
			await gameConfigActions.setTitle(localTitle);
		}

		if (localDuration !== gameDuration) {
			await gameConfigActions.changeGameDuration(localDuration);
		}
	};

	// Reset local state to store values
	const handleReset = () => {
		setLocalLanguage(lang);
		setLocalTitle(title || '');
		setLocalDuration(gameDuration);
	};

	return (
		<>
			<div className="flex items-center gap-4">
				<label htmlFor="language" className="text-sm font-medium">
					{t('ui:languageLabel', 'Language')}:
				</label>
				<select
					id="language"
					value={localLanguage}
					disabled={started}
					onChange={(e) => setLocalLanguage(e.target.value)}
					className="km-input"
				>
					{LANGUAGES.map((lang) => (
						<option key={lang.code} value={lang.code}>
							{lang.label}
						</option>
					))}
				</select>
				{requestedLangStatus === 'processing' && (
					<span className="text-sm text-yellow-500">Loading...</span>
				)}
				{requestedLangStatus === 'failed' && (
					<span className="text-sm text-red-500">Failed</span>
				)}
			</div>
			<div className="flex items-center gap-4">
				<label htmlFor="title" className="text-sm font-medium">
					{t('ui:gameTitleLabel')}:
				</label>
				<input
					id="title"
					type="text"
					value={localTitle}
					placeholder={t('meta:title')}
					onChange={(e) => setLocalTitle(e.target.value)}
					disabled={started}
					className="km-input"
				/>
			</div>

			<div className="flex items-center gap-4">
				<label htmlFor="duration" className="text-sm font-medium">
					{t('ui:gameDurationLabel')}:
				</label>
				<input
					id="duration"
					type="number"
					min={1}
					max={60}
					value={localDuration}
					onChange={(e) => setLocalDuration(Number(e.target.value))}
					disabled={started}
					className="km-input"
				/>
			</div>

			<div className="flex items-center gap-4">
				<button
					type="button"
					className="km-btn-primary"
					onClick={handleSave}
					disabled={
						started || !hasChanges || requestedLangStatus === 'processing'
					}
				>
					{t('ui:saveButton')}
				</button>
				<button
					type="button"
					className="km-btn-secondary"
					onClick={handleReset}
					disabled={started || !hasChanges}
				>
					{t('ui:resetButton')}
				</button>
			</div>

			<button
				type="button"
				className={showPresenterQr ? 'km-btn-neutral' : 'km-btn-secondary'}
				onClick={gameConfigActions.togglePresenterQr}
			>
				{t('ui:togglePresenterQrButton')}
			</button>
		</>
	);
}
