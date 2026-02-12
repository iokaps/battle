import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
	globalIgnores(['dist']),
	eslintConfigPrettier,
	{
		files: ['**/*.{ts,tsx}'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			reactPlugin.configs.flat.recommended,
			reactHooks.configs.flat.recommended
			// TODO: Add react refresh plugin
			// reactRefresh.configs.vite
		],
		settings: { react: { version: 'detect' } },
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser
		},
		rules: {
			// React scope no longer necessary with new JSX transform.
			'react/react-in-jsx-scope': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_'
				}
			],
			'no-console': ['warn', { allow: ['warn', 'error'] }]
		}
	}
]);
