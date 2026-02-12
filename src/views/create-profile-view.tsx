import { localPlayerActions } from '@/state/actions/local-player-actions';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';

/**
 * Example view demonstrating how to create a player profile form.
 * Shows usage of local player actions for registration.
 * Modify or replace with your own implementation.
 */
export function CreateProfileView() {
	const { t } = useTranslation();
	const [name, setName] = React.useState('');
	const [isLoading, setIsLoading] = React.useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const trimmedName = name.trim();
		if (!trimmedName) return;

		setIsLoading(true);
		try {
			await localPlayerActions.setPlayerName(trimmedName);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="mx-auto w-full max-w-96 space-y-12">
			<article className="prose text-center">
				<Markdown>{t('ui:createProfileMd')}</Markdown>
			</article>
			<form onSubmit={handleSubmit} className="grid gap-4">
				<input
					type="text"
					placeholder={t('ui:playerNamePlaceholder')}
					value={name}
					onChange={(e) => setName(e.target.value)}
					disabled={isLoading}
					autoFocus
					maxLength={50}
					className="km-input"
				/>

				<button
					type="submit"
					className="km-btn-primary w-full"
					disabled={!name.trim() || isLoading}
				>
					{isLoading ? (
						<>
							<span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
							{t('ui:loading')}
						</>
					) : (
						t('ui:playerNameButton')
					)}
				</button>
			</form>
		</div>
	);
}
