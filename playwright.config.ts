import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const isCI = Boolean(process.env.CI);

// E2E działa na zbudowanej wersji produkcyjnej z bazową ścieżką /musztra/,
// czyli tak samo jak na GitHub Pages (DECISIONS.md, D-005).
// W CI build wykonuje osobny krok, lokalnie budujemy przed testami.
const preview = `npm run preview -- --port ${String(PORT)} --strictPort`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${String(PORT)}/musztra/`,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } }],
  webServer: {
    command: isCI ? preview : `npm run build && ${preview}`,
    url: `http://localhost:${String(PORT)}/musztra/`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
