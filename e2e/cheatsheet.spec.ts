import { expect, test, type Page } from '@playwright/test';

// Etap EF, K2: ściąga (F1) z katalogu komend, podstawowe ćwiczenia, regulamin PDF z odnośnikami „pkt N”.

async function send(page: Page, text: string) {
  const input = page.getByTestId('command-input');
  await input.fill(text);
  await input.press('Enter');
}

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

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.clear();
    // Wskazówki pierwszego uruchomienia (K3) mają osobne testy w welcome.spec.ts.
    localStorage.setItem('musztra.firstRunSeen', 'true');
  });
  await page.reload();
  await expect(page.getByTestId('command-input')).toBeFocused();
});

test.describe('ściąga', () => {
  test('F1 otwiera i zamyka ściągę; przycisk w pasku też', async ({ page }) => {
    await page.keyboard.press('F1');
    await expect(page.getByTestId('cheatsheet')).toBeVisible();
    await page.keyboard.press('F1');
    await expect(page.getByTestId('cheatsheet')).toHaveCount(0);
    await page.getByTestId('open-cheatsheet').click();
    await expect(page.getByTestId('cheatsheet')).toBeVisible();
    await page.getByTestId('cheatsheet-close').click();
    await expect(page.getByTestId('cheatsheet')).toHaveCount(0);
    await expect(page.getByTestId('command-input')).toBeFocused();
  });

  test('„?” w trybie Ruch otwiera ściągę', async ({ page }) => {
    await page.getByTestId('command-input').press('Escape');
    await page.keyboard.press('?');
    await expect(page.getByTestId('cheatsheet')).toBeVisible();
  });

  test('komendy pogrupowane jak w katalogu; przy każdej forma kanoniczna, opis i punkt regulaminu', async ({ page }) => {
    await page.keyboard.press('F1');
    for (const group of ['P', 'Z', 'ZB', 'R', 'O', 'S', 'M', 'MS', 'X']) {
      await expect(page.getByTestId(`cheatsheet-group-${group}`)).toHaveCount(1);
    }
    await expect(page.getByTestId('cheatsheet-group-N')).toHaveCount(0);
    const turn = page.locator('[data-testid=cheatsheet-entry][data-id="Z-1"]');
    await expect(turn.getByTestId('cheatsheet-insert')).toHaveText('W lewo – ZWROT');
    await expect(turn).toContainText('Zwroty w miejscu');
    await expect(turn.getByTestId('point-link').first()).toHaveAttribute('href', /regulamin-musztry-1994.*\.pdf#page=8$/);
  });

  test('wyszukiwarka i klik wstawiający komendę do wiersza poleceń', async ({ page }) => {
    await page.keyboard.press('F1');
    await page.getByTestId('cheatsheet-search').fill('zbiorka');
    await expect(page.getByTestId('cheatsheet-entry')).toHaveCount(3);
    await page.getByTestId('cheatsheet-insert').first().click();
    const input = page.getByTestId('command-input');
    await expect(input).toHaveValue('Pierwsza drużyna, w szeregu – ZBIÓRKA');
    await expect(input).toBeFocused();
    await input.press('Enter');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'ok');
    await expect(page.getByTestId('cheatsheet')).toBeVisible();

    await page.getByTestId('cheatsheet-search').fill('nie ma takiej komendy');
    await expect(page.getByTestId('cheatsheet-entry')).toHaveCount(0);
    await expect(page.getByTestId('cheatsheet')).toContainText('Brak komend');
  });

  test('podstawowe ćwiczenia: komendy wstawiane po kolei', async ({ page }) => {
    await page.keyboard.press('F1');
    await page.getByTestId('cheatsheet-tab-exercises').click();
    const exercises = page.getByTestId('exercise');
    expect(await exercises.count()).toBeGreaterThanOrEqual(5);
    expect(await exercises.count()).toBeLessThanOrEqual(7);
    const first = exercises.first();
    await expect(first).toContainText('Zbiórka i postawy');
    const input = page.getByTestId('command-input');

    await first.getByTestId('exercise-next').click();
    await expect(input).toHaveValue('Pierwsza drużyna, w szeregu – ZBIÓRKA');
    await input.press('Enter');
    await idle(page);
    await first.getByTestId('exercise-next').click();
    await expect(input).toHaveValue('SPOCZNIJ');
    await input.press('Enter');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-level', 'ok');
    await expect(first.getByTestId('exercise-next')).toContainText('3/5');

    // Klik w komendę ćwiczenia wstawia właśnie ją.
    await first.getByTestId('exercise-command').nth(3).click();
    await expect(input).toHaveValue('SPOCZNIJ');
    await expect(first.getByTestId('exercise-next')).toContainText('5/5');
  });
});

test.describe('regulamin w aplikacji', () => {
  test('przycisk „Regulamin” otwiera PDF z zasobów strony', async ({ page }) => {
    const link = page.getByTestId('open-regulation');
    const href = await link.getAttribute('href');
    expect(href).toMatch(/\/musztra\/assets\/regulamin-musztry-1994.*\.pdf$/);
    const response = await page.request.get(href ?? '');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
    expect((await response.body()).length).toBeGreaterThan(1_000_000);
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('„pkt N” w panelu informacji to odnośnik do strony z tym punktem', async ({ page, context }) => {
    await send(page, 'Pierwsza drużyna, w szeregu – ZBIÓRKA');
    await idle(page);
    await send(page, 'SPOCZNIJ');
    await idle(page);
    await send(page, 'W prawo – ZWROT');
    const feedback = page.getByTestId('feedback');
    await expect(feedback).toHaveAttribute('data-level', 'error');
    // pkt 11 (reguła BACZNOŚĆ) — strona 4; pkt 22 (zwroty) — strona 8.
    const point11 = feedback.locator('[data-testid=point-link]', { hasText: /^11$/ });
    await expect(point11).toHaveAttribute('href', /\.pdf#page=4$/);
    await expect(feedback.locator('[data-testid=point-link]', { hasText: /^22$/ })).toHaveAttribute('href', /\.pdf#page=8$/);

    // Klik otwiera nową kartę z plikiem PDF (fragment #page=4 nie trafia do żądania — sprawdzony w href wyżej).
    const [pdf, request] = await Promise.all([
      context.waitForEvent('page'),
      context.waitForEvent('request', (r) => /regulamin-musztry-1994.*\.pdf$/.test(r.url())),
      point11.click(),
    ]);
    expect(request.url()).toContain('/musztra/assets/');
    await pdf.close();
    // Fokus zostaje w wierszu poleceń.
    await expect(page.getByTestId('command-input')).toBeFocused();
  });
});
