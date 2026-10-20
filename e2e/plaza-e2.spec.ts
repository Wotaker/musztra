import { expect, test, type Page } from '@playwright/test';

// Etap E2: stan drużyny na placu, tryby fokusu, sterowanie dowódcą, WRÓĆ (SPEC 3.1–3.4, 9.5).

async function send(page: Page, text: string) {
  const input = page.getByTestId('command-input');
  await input.fill(text);
  await input.press('Enter');
}

/** Czeka, aż pętla animacji opublikuje stan po komendzie (dwie klatki), a potem na koniec czynności. */
async function idle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
  await expect(page.getByTestId('plaza-canvas')).toHaveAttribute('data-activity', 'idle', { timeout: 20_000 });
}

async function commander(page: Page): Promise<number[]> {
  const value = (await page.getByTestId('plaza-canvas').getAttribute('data-commander')) ?? '0,0,0';
  return value.split(',').map(Number);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
});

test('start: drużyna rozproszona, pasek stanu i tryb Komenda', async ({ page }) => {
  await expect(page.getByTestId('status-text')).toContainText('rozproszona');
  await expect(page.getByTestId('focus-mode')).toHaveAttribute('data-mode', 'command');
  await expect(page.getByTestId('plaza-canvas')).toHaveAttribute('data-formation', 'rozproszona');
});

test('zbiórka: drużyna biegnie na miejsca i staje w szeregu, pasek pokazuje czynność i stan', async ({ page }) => {
  await send(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
  await expect(page.getByTestId('status-activity')).toHaveText('zbiórka');
  await idle(page);
  await expect(page.getByTestId('status-text')).toHaveText('Stan: szereg · zasadnicza · stoi · front 0°');
  await expect(page.getByTestId('status-activity')).toHaveCount(0);
});

test('warunek wstępny: zwrot drużyny rozproszonej → błąd E_PRECOND_FORMATION', async ({ page }) => {
  await send(page, 'W prawo – ZWROT');
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'error');
  await expect(page.getByTestId('feedback-title')).toHaveText('Komenda niewykonalna');
  await expect(page.getByTestId('feedback')).toContainText('E_PRECOND_FORMATION');
});

test('czynność przejściowa: komenda w trakcie zbiórki → E_BUSY; WRÓĆ przerywa zbiórkę', async ({ page }) => {
  await send(page, 'Pierwsza drużyna, w dwuszeregu – ZBIÓRKA');
  await send(page, 'W prawo – ZWROT');
  await expect(page.getByTestId('feedback')).toContainText('E_BUSY');
  await page.getByTestId('command-input').fill('WRÓĆ');
  await page.getByTestId('command-input').press('Enter');
  await expect(page.getByTestId('feedback-title')).toHaveText('Wykonano');
  await idle(page);
  await expect(page.getByTestId('status-text')).toContainText('rozproszona');
});

test('zwrot i WRÓĆ: rząd, potem powrót do szeregu', async ({ page }) => {
  await send(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
  await idle(page);
  await send(page, 'W prawo – ZWROT');
  await idle(page);
  await expect(page.getByTestId('status-text')).toContainText('rząd · zasadnicza · stoi · front 90°');
  await send(page, 'WRÓĆ');
  await idle(page);
  await expect(page.getByTestId('status-text')).toContainText('szereg · zasadnicza · stoi · front 0°');
});

test('tryb Ruch: Esc, WASD przesuwa dowódcę, Q obraca, Enter wraca do komend', async ({ page }) => {
  const input = page.getByTestId('command-input');
  await input.press('Escape');
  await expect(page.getByTestId('focus-mode')).toHaveAttribute('data-mode', 'move');
  await expect(input).not.toBeFocused();

  await page.keyboard.down('d');
  await page.waitForTimeout(800);
  await page.keyboard.up('d');
  await expect.poll(async () => (await commander(page))[0]).toBeGreaterThan(0.5);
  expect((await commander(page))[2]).toBe(90);

  await page.keyboard.press('q');
  await expect.poll(async () => (await commander(page))[2]).toBe(45);

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('focus-mode')).toHaveAttribute('data-mode', 'command');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('');
});

test('klik w plac przełącza na tryb Ruch, „/” wraca do komend', async ({ page }) => {
  await page.getByTestId('plaza-canvas').click({ position: { x: 300, y: 300 } });
  await expect(page.getByTestId('focus-mode')).toHaveAttribute('data-mode', 'move');
  await page.keyboard.press('/');
  await expect(page.getByTestId('command-input')).toBeFocused();
  await expect(page.getByTestId('command-input')).toHaveValue('');
});

test('zbiórka przy dowódcy obróconym w prawo (E): szereg frontem na wschód', async ({ page }) => {
  await page.getByTestId('command-input').press('Escape');
  await page.keyboard.press('e');
  await page.keyboard.press('e');
  await expect.poll(async () => (await commander(page))[2]).toBe(90);
  await page.keyboard.press('Enter');
  await send(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
  await idle(page);
  await expect(page.getByTestId('status-text')).toContainText('front 90°');
});

test('komenda kolejnego etapu: poprawna, ale drużyna jej jeszcze nie wykonuje', async ({ page }) => {
  await send(page, 'Pierwsza drużyna, w rzędzie – ZBIÓRKA');
  await idle(page);
  await send(page, 'Drużyna, kierunek na wprost – MARSZ');
  await expect(page.getByTestId('feedback-title')).toHaveText('Komenda poprawna');
  await expect(page.getByTestId('feedback-pending')).toContainText('E4');
  await expect(page.getByTestId('status-text')).toContainText('rząd · zasadnicza · stoi');
});

test('prędkość symulacji i przełącznik ról', async ({ page }) => {
  await page.getByTestId('speed').click();
  await expect(page.getByTestId('speed')).toContainText('2×');
  await page.getByTestId('toggle-roles').click();
  await expect(page.getByTestId('toggle-roles')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('command-input')).toBeFocused();
});
