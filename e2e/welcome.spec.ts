import { expect, test } from '@playwright/test';

// Etap EF, K3: nakładka przy pierwszym uruchomieniu (SPEC 3.10) — trzy wskazówki, ponowne otwarcie przyciskiem „?”.

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
});

test('przy pierwszym uruchomieniu: trzy wskazówki (zbiórka, Esc/Enter i WASD, F1)', async ({ page }) => {
  const dialog = page.getByTestId('welcome-dialog');
  await expect(dialog).toBeVisible();
  const tips = page.getByTestId('welcome-tip');
  await expect(tips).toHaveCount(3);
  await expect(tips.nth(0)).toContainText('ZBIÓRKA');
  await expect(tips.nth(1)).toContainText('Esc');
  await expect(tips.nth(1)).toContainText('Enter');
  await expect(tips.nth(1)).toContainText('W');
  await expect(tips.nth(2)).toContainText('F1');
  await expect(page.getByTestId('welcome-start')).toBeFocused();

  await page.getByTestId('welcome-start').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('command-input')).toBeFocused();

  // Kolejne uruchomienie — bez nakładki.
  await page.reload();
  await expect(page.getByTestId('command-input')).toBeFocused();
  await expect(dialog).toHaveCount(0);
});

test('pierwsza komenda w kilka sekund: klik w przykład, Enter — drużyna się zbiera', async ({ page }) => {
  await page.getByTestId('welcome-command').click();
  const input = page.getByTestId('command-input');
  await expect(input).toHaveValue('Pierwsza drużyna, w dwuszeregu – ZBIÓRKA');
  await expect(input).toBeFocused();
  await input.press('Enter');
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'ok');
  await expect(page.getByTestId('plaza-canvas')).toHaveAttribute('data-activity', 'idle', { timeout: 20_000 });
  await expect(page.getByTestId('status-text')).toContainText('dwuszereg');
});

test('Esc zamyka nakładkę; „?” w pasku otwiera ją ponownie', async ({ page }) => {
  await expect(page.getByTestId('welcome-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('welcome-dialog')).toHaveCount(0);
  await expect(page.getByTestId('focus-mode')).toHaveAttribute('data-mode', 'command');
  await page.getByTestId('open-welcome').click();
  await expect(page.getByTestId('welcome-dialog')).toBeVisible();
  await page.getByTestId('welcome-start').click();
  await expect(page.getByTestId('welcome-dialog')).toHaveCount(0);
});
