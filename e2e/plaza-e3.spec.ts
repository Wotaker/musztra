import { expect, test, type Page } from '@playwright/test';

// Etap E3: odliczanie z meldunkami, równanie, dwójki, odstępowanie, Dziennik (SPEC 3.5, 3.6, 9.5).

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
  await expect(page.getByTestId('plaza-canvas')).toHaveAttribute('data-activity', 'idle', { timeout: 30_000 });
}

async function command(page: Page, text: string) {
  await send(page, text);
  await idle(page);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
});

test('odliczanie w niepełnym dwuszeregu: liczby i meldunek „Niepełny” w Dzienniku, potem postawa swobodna', async ({ page }) => {
  await command(page, 'Pierwsza drużyna, w dwuszeregu – ZBIÓRKA');
  await send(page, 'Kolejno – ODLICZ');
  await expect(page.getByTestId('status-activity')).toHaveText('odliczanie');
  await idle(page);
  await expect(page.getByTestId('journal-count')).toContainText('Wieczorek 1');
  await expect(page.getByTestId('journal-count')).toContainText('Sikora 5');
  await expect(page.getByTestId('journal-report')).toHaveText(/szer\. Woźniak: Niepełny/);
  await expect(page.getByTestId('status-text')).toContainText('dwuszereg · swobodna · stoi');
  await expect(page.getByTestId('status-bar')).toContainText('odliczona kolejno');
});

test('dwójki: odliczenie do dwóch, BACZNOŚĆ, „W dwójki, w prawo – ZWROT”, powrót do szeregu', async ({ page }) => {
  await command(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
  await send(page, 'W dwójki, w prawo – ZWROT');
  await expect(page.getByTestId('feedback')).toContainText('E_PRECOND_COUNT');
  await command(page, 'Do dwóch – ODLICZ');
  await command(page, 'BACZNOŚĆ');
  await command(page, 'W dwójki, w prawo – ZWROT');
  await expect(page.getByTestId('status-text')).toContainText('kolumna dwójkowa · zasadnicza · stoi · front 90°');
  await command(page, 'W szereg, w lewo – FRONT');
  await expect(page.getByTestId('status-text')).toContainText('szereg · zasadnicza · stoi · front 0°');
});

test('równanie: głowy zwrócone blokują inne komendy do BACZNOŚĆ', async ({ page }) => {
  await command(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
  await command(page, 'Równaj – W PRAWO');
  await expect(page.getByTestId('status-bar')).toContainText('głowy zwrócone');
  await send(page, 'W prawo – ZWROT');
  await expect(page.getByTestId('feedback')).toContainText('BACZNOŚĆ');
  await expect(page.getByTestId('feedback')).toContainText('E_PRECOND_STATE');
  await command(page, 'BACZNOŚĆ');
  await expect(page.getByTestId('status-bar')).not.toContainText('głowy zwrócone');
});

test('odstępowanie od wskazanego żołnierza: „Jestem” w Dzienniku; łączenie po BACZNOŚĆ', async ({ page }) => {
  await command(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
  await command(page, 'Od szeregowego Barana, dwa kroki – ODSTĄP');
  await expect(page.getByTestId('journal-report')).toHaveText(/szer\. Baran: Jestem/);
  await expect(page.getByTestId('status-bar')).toContainText('odstąpiona');
  await send(page, 'Do szeregowego Barana – ŁĄCZ');
  await expect(page.getByTestId('feedback')).toContainText('E_PRECOND_POSTURE');
  await command(page, 'BACZNOŚĆ');
  await command(page, 'Do szeregowego Barana – ŁĄCZ');
  await expect(page.getByTestId('status-bar')).not.toContainText('odstąpiona');
  await expect(page.getByTestId('status-text')).toContainText('swobodna');
});

test('Dziennik: wpisy z ikoną wyniku, klik wstawia komendę do wiersza, panel się zwija', async ({ page }) => {
  await send(page, 'W prawo – ZWROT');
  await command(page, 'pierwsza druzyna w szeregu zbiorka');
  const commands = page.getByTestId('journal-command');
  await expect(commands).toHaveCount(2);
  await expect(commands.nth(0)).toContainText('✖');
  await expect(commands.nth(0)).toContainText('E_PRECOND_FORMATION');
  await expect(commands.nth(1)).toContainText('✔');
  // Przyjęta komenda zapisana w formie kanonicznej.
  await expect(commands.nth(1)).toContainText('Pierwsza drużyna, w szeregu – ZBIÓRKA');
  await commands.nth(1).getByRole('button').click();
  await expect(page.getByTestId('command-input')).toHaveValue('Pierwsza drużyna, w szeregu – ZBIÓRKA');
  await expect(page.getByTestId('command-input')).toBeFocused();
  await page.getByTestId('journal-toggle').click();
  await expect(page.getByTestId('journal-command')).toHaveCount(0);
  await page.getByTestId('journal-toggle').click();
  await expect(page.getByTestId('journal-command')).toHaveCount(2);
});

test('przesunięcie o trzy kroki na wprost i krok w tył', async ({ page }) => {
  await command(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
  await send(page, 'Drużyna, trzy kroki w tył – MARSZ');
  await expect(page.getByTestId('feedback')).toContainText('E_RULE');
  await send(page, 'Drużyna, trzy kroki na wprost – MARSZ');
  await expect(page.getByTestId('status-activity')).toHaveText('przesunięcie');
  await idle(page);
  await expect(page.getByTestId('feedback-title')).toHaveText('Wykonano');
});
