import { expect, test } from '@playwright/test';

test.describe('pusty plac', () => {
  test('strona się ładuje bez błędów, a plac wypełnia ekran', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('./');

    await expect(page).toHaveTitle(/Musztra/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');

    const canvas = page.getByTestId('plaza-canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBe(1280);
    expect(box?.height).toBe(720);

    expect(errors).toEqual([]);
  });

  test('na placu narysowana jest nawierzchnia z siatką i róża wiatrów', async ({ page }) => {
    await page.goto('./');
    const canvas = page.getByTestId('plaza-canvas');
    await expect(canvas).toHaveAttribute('data-frames', /^[1-9]/);

    const sample = await canvas.evaluate((element) => {
      const c = element as HTMLCanvasElement;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('brak kontekstu 2d');
      const row = Math.round(c.height * 0.75);
      const { data } = ctx.getImageData(0, row, c.width, 1);
      const colors = new Set<string>();
      let transparent = 0;
      for (let i = 0; i < data.length; i += 4) {
        colors.add(`${String(data[i])},${String(data[i + 1])},${String(data[i + 2])}`);
        if ((data[i + 3] ?? 0) < 255) transparent++;
      }
      return { distinctColors: colors.size, transparent, width: c.width };
    });

    // Cały wiersz jest zamalowany (nawierzchnia), ale nie jednolicie (linie siatki).
    expect(sample.transparent).toBe(0);
    expect(sample.distinctColors).toBeGreaterThan(1);

    await expect(page.getByRole('img', { name: /Róża wiatrów/ })).toBeAttached();
  });

  test('plac dopasowuje się do zmiany rozmiaru okna', async ({ page }) => {
    await page.goto('./');
    const canvas = page.getByTestId('plaza-canvas');
    await expect(canvas).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect
      .poll(async () => {
        const box = await canvas.boundingBox();
        return box ? [box.width, box.height] : null;
      })
      .toEqual([1440, 900]);
    await expect
      .poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).width))
      .toBe(1440 * (await page.evaluate(() => window.devicePixelRatio)));
  });
});
