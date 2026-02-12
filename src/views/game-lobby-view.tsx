import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';

/**
 * Example view demonstrating how to display lobby content before game starts.
 * Modify or replace with your own implementation.
 */
export function GameLobbyView() {
	const { t } = useTranslation();

	return (
		<article className="prose">
			<Markdown>{t('ui:gameLobbyMd')}</Markdown>
		</article>
	);
}
