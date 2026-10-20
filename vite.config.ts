import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Strona jest serwowana z https://wotaker.github.io/musztra/, więc wszystkie zasoby
// muszą mieć prefiks nazwy repozytorium (DECISIONS.md, D-004).
export const BASE_PATH = '/musztra/';

// Content Security Policy (SPEC 8.3, D-010, D-049): skrypty, style i zasoby tylko z tej strony,
// połączenia sieciowe wyłącznie do api.anthropic.com (objaśnienia LLM). Bez analityki i zewnętrznych skryptów.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  'connect-src https://api.anthropic.com',
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

/**
 * CSP jako znacznik <meta> w zbudowanej stronie (GitHub Pages nie pozwala ustawić nagłówków).
 * Tylko w buildzie: serwer deweloperski Vite potrzebuje skryptów inline i połączenia HMR.
 */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'musztra-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      // Zaraz po deklaracji kodowania, przed wszystkimi skryptami i stylami.
      handler: (html) =>
        html.replace(
          /<meta charset="UTF-8" \/>/,
          (charset) => `${charset}\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
        ),
    },
  };
}

export default defineConfig({
  base: BASE_PATH,
  plugins: [react(), contentSecurityPolicy()],
  build: {
    target: 'es2023',
  },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
  },
});
