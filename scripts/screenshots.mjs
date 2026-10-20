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

function sse(text) {
  const ev = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
  return [
    ev('message_start', { message: { id: 'm', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } }),
    ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }),
    ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text } }),
    ev('content_block_stop', { index: 0 }),
    ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 1 } }),
    ev('message_stop', {}),
  ].join('');
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: Number(process.env.DPR ?? 1) });
for (const scene of SCENES) {
  await page.unrouteAll();
  await page.goto(BASE);
  await page.evaluate((keep) => {
    localStorage.clear();
    sessionStorage.clear();
    for (const [key, value] of Object.entries(keep)) localStorage.setItem(key, value);
  }, scene.storage ?? { 'musztra.firstRunSeen': 'true' });
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
    if (typeof step === 'object' && step.click) {
      await page.getByTestId(step.click).click();
      await page.waitForTimeout(step.ms ?? 300);
      continue;
    }
    if (typeof step === 'object' && step.fill) {
      await page.getByTestId(step.fill[0]).fill(step.fill[1]);
      continue;
    }
    if (typeof step === 'object' && step.mockLlm) {
      // Atrapa API Anthropic (bez sieci): odpowiedź strumieniowa z podanym objaśnieniem albo błąd HTTP.
      const reply = step.mockLlm;
      await page.route('https://api.anthropic.com/**', (route) =>
        reply.status
          ? route.fulfill({ status: reply.status, contentType: 'application/json', body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'x' } }) })
          : route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sse(JSON.stringify(reply)) }),
      );
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
