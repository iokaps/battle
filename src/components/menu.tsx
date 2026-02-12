import { useKmModal } from '@kokimoki/react-components';
import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';

/**
 * Example component demonstrating how to create a player menu with help drawer.
 * Modify or replace with your own implementation.
 */
export function PlayerMenu() {
	const { t } = useTranslation();
	const { openDrawer } = useKmModal();

	const handleOpenHelp = () => {
		openDrawer({
			content: (
				<div className="bg-arena-bg max-h-full w-full overflow-y-auto text-slate-100">
					<div className="container mx-auto px-4 py-16">
						<article className="prose">
							<Markdown>{t('ui:menuHelpMd')}</Markdown>
						</article>
					</div>
				</div>
			)
		});
	};

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={handleOpenHelp}
				className="flex size-9 cursor-pointer items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-slate-100"
			>
				<HelpCircle className="size-5" />
				<span className="sr-only">{t('ui:menuHelpAriaLabel')}</span>
			</button>
		</div>
	);
}
