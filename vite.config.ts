import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Strona jest serwowana z https://wotaker.github.io/musztra/, więc wszystkie zasoby
// muszą mieć prefiks nazwy repozytorium (DECISIONS.md, D-004).
export const BASE_PATH = '/musztra/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  build: {
    target: 'es2023',
  },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
  },
});
