import { kmClient } from '@/services/km-client';
import type {
	HostClientContext,
	PlayerClientContext,
	PresenterClientContext
} from '@/types/client';
import type { AppMode } from '@/types/common';
import type { ComponentType } from 'react';

type ClientContextMap = {
	host: HostClientContext;
	presenter: PresenterClientContext;
	player: PlayerClientContext;
};

/**
 * Props for components wrapped with `withModeGuard`.
 *
 * @template M The app mode ('host', 'presenter', or 'player').
 */
export type ModeGuardProps<M extends AppMode> = {
	clientContext: ClientContextMap[M];
};

/**
 * HOC that guards a component to only render in the specified mode.
 * Throws an error if rendered in a different mode.
 * Passes typed `clientContext` prop to the wrapped component.
 *
 * @param Component The component to wrap (receives `clientContext` prop).
 * @param mode The required app mode ('host', 'presenter', or 'player').
 * @returns The wrapped component with mode guard.
 *
 * @example
 * const App: React.FC<ModeGuardProps<'host'>> = ({ clientContext }) => {
 *   const { playerCode } = clientContext; // typed correctly
 * };
 * export default withModeGuard(App, 'host');
 */
export function withModeGuard<P extends ModeGuardProps<M>, M extends AppMode>(
	Component: ComponentType<P>,
	mode: M
) {
	const displayName = Component.displayName || Component.name || 'Component';

	function WithModeGuard(props: Omit<P, 'clientContext'>) {
		if (kmClient.clientContext.mode !== mode) {
			throw new Error(
				`${displayName} requires "${mode}" mode, but rendered in "${kmClient.clientContext.mode}" mode`
			);
		}

		const clientContext = kmClient.clientContext as ClientContextMap[M];

		return <Component {...(props as P)} clientContext={clientContext} />;
	}

	WithModeGuard.displayName = `withModeGuard(${displayName})`;

	return WithModeGuard;
}
