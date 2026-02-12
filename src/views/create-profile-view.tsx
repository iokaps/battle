import { localPlayerActions } from '@/state/actions/local-player-actions';
import { Sparkles } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';

const EXAMPLE_PROMPTS = [
	'A cyber samurai with a glowing katana',
	'A frost mage with ice crystals',
	'A fierce dragon warrior',
	'A stealth ninja in shadows',
	'A golden phoenix knight'
];

/**
 * View for creating a player profile with name and avatar prompt.
 * Dark neon theme with example prompt suggestion chips.
 */
export function CreateProfileView() {
	const { t } = useTranslation();
	const [name, setName] = React.useState('');
	const [avatarPrompt, setAvatarPrompt] = React.useState('');
	const [isLoading, setIsLoading] = React.useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const trimmedName = name.trim();
		const trimmedPrompt = avatarPrompt.trim();
		if (!trimmedName || !trimmedPrompt) return;

		setIsLoading(true);
		try {
			await localPlayerActions.setPlayerName(trimmedName, trimmedPrompt);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="mx-auto w-full max-w-96 space-y-10">
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

				<input
					type="text"
					placeholder={t('ui:avatarPromptPlaceholder')}
					value={avatarPrompt}
					onChange={(e) => setAvatarPrompt(e.target.value)}
					disabled={isLoading}
					maxLength={200}
					className="km-input"
				/>

				{/* Example prompt chips */}
				<div className="flex flex-wrap justify-center gap-1.5">
					{EXAMPLE_PROMPTS.map((prompt) => (
						<button
							key={prompt}
							type="button"
							disabled={isLoading}
							onClick={() => setAvatarPrompt(prompt)}
							className="hover:border-neon-cyan/40 hover:text-neon-cyan inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] text-slate-400 transition-colors disabled:opacity-50"
						>
							<Sparkles className="h-2.5 w-2.5" />
							{prompt}
						</button>
					))}
				</div>

				<p className="text-center text-sm text-slate-500">
					{t('ui:avatarPromptHint')}
				</p>

				<button
					type="submit"
					className="km-btn-primary w-full"
					disabled={!name.trim() || !avatarPrompt.trim() || isLoading}
				>
					{isLoading ? (
						<>
							<span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-slate-900"></span>
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
