import {
	KmAudioPlayerProvider,
	KmConfettiProvider,
	KmModalProvider
} from '@kokimoki/react-components';
import type { ComponentType } from 'react';

/**
 * HOC that wraps a component with all Kokimoki shared providers.
 * Providers included: KmAudioProvider, KmConfettiProvider, KmModalProvider
 *
 * Example component demonstrating how to wrap components with providers.
 * Modify or replace with your own implementation.
 *
 * @param Component The component to be wrapped with Kokimoki providers.
 *
 * @example
 * export default withKmProviders(App);
 */
export function withKmProviders<P extends object>(Component: ComponentType<P>) {
	const displayName = Component.displayName || Component.name || 'Component';

	function WithKmProviders(props: P) {
		return (
			<KmAudioPlayerProvider>
				<KmConfettiProvider>
					<KmModalProvider>
						<Component {...props} />
					</KmModalProvider>
				</KmConfettiProvider>
			</KmAudioPlayerProvider>
		);
	}

	WithKmProviders.displayName = `withKmProviders(${displayName})`;

	return WithKmProviders;
}
