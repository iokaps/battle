import { kokimokiKitPlugin } from '@kokimoki/kit';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import { kokimokiConfig } from './kokimoki.config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		react(),
		wasm(),
		topLevelAwait(),
		kokimokiKitPlugin(kokimokiConfig)
	],
	resolve: {
		alias: {
			'@': resolve(process.cwd(), './src')
		}
	},
	experimental: {
		renderBuiltUrl(filename, { hostType }) {
			if (hostType === 'js') {
				return {
					runtime: `window.__toAssetsUrl(${JSON.stringify(filename)})`
				};
			}

			return { relative: true };
		}
	}
});
