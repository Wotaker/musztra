import { expect, test, type Page } from '@playwright/test';

// Wiersz poleceń z informacją zwrotną (etap E1, SPEC 3.2–3.4).

async function send(page: Page, text: string) {
  const input = page.getByTestId('command-input');
  await input.fill(text);
  await input.press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
});

test('wiersz poleceń ma fokus po otwarciu strony', async ({ page }) => {
  await expect(page.getByTestId('command-input')).toBeFocused();
  await expect(page.getByTestId('mode-lenient')).toHaveAttribute('aria-checked', 'true');
});

test('poprawna komenda: ✔, rozpoznany wpis katalogu z punktem regulaminu, wiersz wyczyszczony', async ({ page }) => {
  await send(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
  const feedback = page.getByTestId('feedback');
  await expect(feedback).toHaveAttribute('data-level', 'ok');
  await expect(page.getByTestId('feedback-title')).toHaveText('Komenda poprawna');
  await expect(page.getByTestId('feedback-entry')).toHaveText('ZB-1 · Zbiórka przy dowódcy · pkt 69');
  await expect(page.getByTestId('command-input')).toHaveValue('');
  await expect(page.getByTestId('command-input')).toBeFocused();
});

test('tryb łagodny: zapis znormalizowany do formy kanonicznej', async ({ page }) => {
  await send(page, 'w prawo zwrot');
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'ok');
  await expect(page.getByTestId('feedback-canonical')).toHaveText('Zapisano jako: W prawo – ZWROT');
  await expect(page.getByTestId('feedback')).toContainText('I_NORMALIZED');
});

test('tryb ścisły: błędy formy z podkreśleniem i przyciskiem „Użyj”', async ({ page }) => {
  await page.getByTestId('mode-strict').click();
  await expect(page.getByTestId('command-input')).toBeFocused();
  await send(page, 'w prawo zwrot');

  await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'error');
  await expect(page.getByTestId('feedback-message')).toHaveCount(3);
  await expect(page.getByTestId('feedback')).toContainText('Hasło wielkimi literami: „ZWROT”.');
  await expect(page.getByTestId('command-input')).toHaveValue('w prawo zwrot');
  await expect(page.getByTestId('error-underline').first()).toBeVisible();

  await page.getByTestId('use-suggestion').click();
  await expect(page.getByTestId('command-input')).toHaveValue('W prawo – ZWROT');
  await expect(page.getByTestId('error-underline')).toHaveCount(0);
  await page.getByTestId('command-input').press('Enter');
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'ok');
});

test('błąd składni: podkreślony błędny fragment, oczekiwane hasło i punkt regulaminu', async ({ page }) => {
  await send(page, 'W prawo – MARSZ');
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'error');
  await expect(page.getByTestId('feedback')).toContainText('E_SYNTAX_EXPECTED');
  await expect(page.getByTestId('feedback')).toContainText('„ZWROT”');
  await expect(page.getByTestId('feedback')).toContainText('pkt 22');
  await expect(page.getByTestId('error-underline')).toHaveText('MARSZ');
});

test('komenda spoza MVP: informacja z punktem regulaminu', async ({ page }) => {
  await send(page, 'Przez pierś – BROŃ');
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'info');
  await expect(page.getByTestId('feedback')).toContainText('pkt 34');
});

test('komenda do innej drużyny: uwaga, nikt nie reaguje', async ({ page }) => {
  await send(page, 'Druga drużyna – BACZNOŚĆ');
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'warning');
  await expect(page.getByTestId('feedback-title')).toHaveText('Nikt nie reaguje');
});

test('historia komend: ↑ przywraca poprzednie komendy, ↓ wraca do pustego wiersza', async ({ page }) => {
  await send(page, 'BACZNOŚĆ');
  await send(page, 'SPOCZNIJ');
  const input = page.getByTestId('command-input');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('SPOCZNIJ');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('BACZNOŚĆ');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('SPOCZNIJ');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('');
});

test('tryb zapisu jest zapamiętany po odświeżeniu strony', async ({ page }) => {
  await page.getByTestId('mode-strict').click();
  await page.reload();
  await expect(page.getByTestId('mode-strict')).toHaveAttribute('aria-checked', 'true');
});
