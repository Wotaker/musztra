// Zrzuty ekranu placu do docs/screenshots (ręcznie: npm run build && npx vite preview --port 4173, potem
// node scripts/screenshots.mjs [katalog]). Nie jest częścią CI.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/musztra/';
const OUT = process.argv[2] ?? 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

const SCENES = JSON.parse(process.env.SCENES ?? 'null') ?? [
  { name: 'e2-start', steps: [] },
  { name: 'e2-dwuszereg-po-zbiorce', steps: ['Pierwsza drużyna, w dwuszeregu – ZBIÓRKA'] },
  { name: 'e2-kolumna-dwojkowa', steps: ['Pierwsza drużyna, w kolumnie dwójkowej – ZBIÓRKA'] },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: Number(process.env.DPR ?? 1) });
for (const scene of SCENES) {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const input = page.getByTestId('command-input');
  for (const step of scene.steps) {
    if (typeof step === 'object' && step.wait) {
      await page.waitForTimeout(step.wait);
      continue;
    }
    if (typeof step === 'object' && step.keys) {
      for (const k of step.keys) await page.keyboard.press(k);
      continue;
    }
    if (typeof step === 'object' && step.hold) {
      await page.keyboard.down(step.hold);
      await page.waitForTimeout(step.ms);
      await page.keyboard.up(step.hold);
      continue;
    }
    if (typeof step === 'object' && step.nowait) {
      await input.fill(step.nowait);
      await input.press('Enter');
      continue;
    }
    await input.fill(step);
    await input.press('Enter');
    // Pętla animacji publikuje stan w następnej klatce.
    await page.waitForTimeout(120);
    await page.waitForFunction(() => document.querySelector('[data-testid=plaza-canvas]')?.getAttribute('data-activity') !== 'busy', null, { timeout: 30000 });
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(scene.settle ?? 1800);
  await page.screenshot({ path: join(OUT, `${scene.name}.png`) });
  console.log('zapisano', scene.name);
}
await browser.close();
