import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx,js}'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Parametry z „_” są celowo nieużywane (np. akcje semantyczne Ohm muszą mieć pełną listę dzieci węzła).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
  },
  {
    // Warstwa core: czysty TypeScript, bez DOM, Reacta, sieci i warstw wyżej (CLAUDE.md, SPEC 4.2).
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: globals.es2023 },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'src/core nie może zależeć od Reacta.' },
            { name: 'react-dom', message: 'src/core nie może zależeć od Reacta.' },
            { name: 'zustand', message: 'Stan UI należy do warstwy ui, nie core.' },
          ],
          patterns: [
            {
              regex: '(^|/)(render|ui|llm)(/|$)',
              message: 'src/core nie importuje niczego z render, ui ani llm.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'src/core nie korzysta z sieci.' },
        { name: 'window', message: 'src/core nie korzysta z DOM.' },
        { name: 'document', message: 'src/core nie korzysta z DOM.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Losowość tylko z ziarnem (SPEC 5.5).' },
        { object: 'Date', property: 'now', message: 'Core jest deterministyczny: czas tylko ze stałego kroku symulacji.' },
      ],
    },
  },
]);
