import { expect, test, type Page } from '@playwright/test';

// Etap E4: marsz, zatrzymania, bieg, zmiana kierunku, „Za mną”, zachodzenie (SPEC 9.5).

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

const status = (page: Page) => page.getByTestId('status-text');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.clear();
    // Wskazówki pierwszego uruchomienia (K3) mają osobne testy w welcome.spec.ts.
    localStorage.setItem('musztra.firstRunSeen', 'true');
  });
  await page.reload();
});

test('marsz na wprost i zatrzymanie: rząd maszeruje, po STÓJ stoi w postawie zasadniczej', async ({ page }) => {
  await command(page, 'Pierwsza drużyna, w rzędzie – ZBIÓRKA');
  await send(page, 'Drużyna, kierunek na wprost – MARSZ');
  await expect(status(page)).toContainText('rząd · zasadnicza · marsz · front 0°');
  await expect(page.getByTestId('status-bar')).toContainText('krok defiladowy');
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('status-bar')).not.toContainText('krok defiladowy');
  await send(page, 'Kierunek – W PRAWO');
  await expect(status(page)).toContainText('front 90°', { timeout: 10_000 });
  await send(page, 'Drużyna – STÓJ');
  await expect(status(page)).toContainText('rząd · zasadnicza · stoi', { timeout: 10_000 });
});

test('bieg: STÓJ z biegu → E_RULE; „Zwykły – KROK”, potem STÓJ', async ({ page }) => {
  await command(page, 'Pierwsza drużyna, w rzędzie – ZBIÓRKA');
  await send(page, 'Biegiem – MARSZ');
  await expect(status(page)).toContainText('bieg');
  await send(page, 'Drużyna – STÓJ');
  await expect(page.getByTestId('feedback')).toContainText('E_RULE');
  await send(page, 'Zwykły – KROK');
  await expect(status(page)).toContainText('marsz', { timeout: 10_000 });
  await send(page, 'Drużyna – STÓJ');
  await expect(status(page)).toContainText('stoi', { timeout: 10_000 });
});

test('„Za mną – MARSZ”: drużyna idzie za dowódcą sterowanym klawiszami', async ({ page }) => {
  await command(page, 'Pierwsza drużyna, w rzędzie – ZBIÓRKA');
  await send(page, 'Za mną – MARSZ');
  await expect(page.getByTestId('status-bar')).toContainText('za dowódcą');
  await page.getByTestId('command-input').press('Escape');
  await page.keyboard.down('w');
  await page.waitForTimeout(2500);
  await page.keyboard.up('w');
  await expect(status(page)).toContainText('marsz');
  // Dowódca stoi — drużyna dochodzi i maszeruje w miejscu (uwaga w Dzienniku).
  await expect(page.getByTestId('journal-note').last()).toContainText('Dowódca stanął', { timeout: 15_000 });
  await page.keyboard.press('Enter');
  await send(page, 'Drużyna – STÓJ');
  await expect(status(page)).toContainText('stoi', { timeout: 10_000 });
});

test('zachodzenie i zmiana szyku w marszu', async ({ page }) => {
  await command(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
  await send(page, 'Drużyna, w prawo zachodź – MARSZ');
  await expect(status(page)).toContainText('zachodzenie');
  await send(page, 'Kierunek – W PRAWO');
  await expect(page.getByTestId('feedback')).toContainText('E_PRECOND_MOTION');
  await send(page, 'Drużyna – STÓJ');
  await expect(status(page)).toContainText('szereg · zasadnicza · stoi');
  await command(page, 'Pierwsza drużyna, w rzędzie – ZBIÓRKA');
  await send(page, 'Drużyna, kierunek na wprost – MARSZ');
  await command(page, 'Do dwóch – ODLICZ');
  await command(page, 'W dwójki – W PRZÓD');
  await expect(status(page)).toContainText('kolumna dwójkowa · zasadnicza · marsz');
  await expect(page.getByTestId('journal-note').last()).toContainText('Zwykły – KROK');
  await send(page, 'Zwykły – KROK');
  await send(page, 'Stawaj – W LEWO');
  await idle(page);
  await expect(status(page)).toContainText('dwuszereg · swobodna · stoi · front 270°');
});
