import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_ENTRIES } from '../../src/core/catalog';
import {
  pageOfPoint,
  pointNumber,
  REGULATION_PAGE_COUNT,
  REGULATION_POINT_COUNT,
  REGULATION_POINT_PAGES,
} from '../../src/core/regulation';

// Mapa „punkt regulaminu → strona PDF” (etap EF, K2): każde „pkt N” w aplikacji jest odnośnikiem
// do strony PDF, na której zaczyna się punkt. Mapa jest wygenerowana z PDF (scripts/regulation-pages.mjs).

const coreDir = join(import.meta.dirname, '..', '..', 'src', 'core');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') && entry.name !== 'regulationPages.ts' ? [path] : [];
  });
}

/** Punkty regulaminu zapisane w kodzie core jako tablice napisów, np. `['26']`, `['57–59']`, `['25b', '69']`. */
function pointsInCoreSources(): string[] {
  const found = new Set<string>();
  for (const file of sourceFiles(coreDir)) {
    const source = readFileSync(file, 'utf8');
    for (const array of source.matchAll(/\[((?:\s*'\d{1,3}[a-z]?(?:–\d{1,3})?'\s*,?)+)\]/g)) {
      for (const literal of (array[1] ?? '').matchAll(/'([^']+)'/g)) found.add(literal[1] ?? '');
    }
  }
  return [...found];
}

const catalogPoints = [...new Set(ALL_ENTRIES.flatMap((entry) => entry.points))];

describe('mapa punkt → strona regulaminu', () => {
  it('obejmuje kolejno wszystkie 130 punktów regulaminu na 44 stronach', () => {
    expect(REGULATION_PAGE_COUNT).toBe(44);
    expect(REGULATION_POINT_COUNT).toBe(130);
    for (let point = 1; point <= REGULATION_POINT_COUNT; point++) {
      expect(REGULATION_POINT_PAGES[point], `pkt ${String(point)}`).toBeDefined();
    }
  });

  it('strony rosną razem z numerami punktów i mieszczą się w dokumencie', () => {
    let previous = 1;
    for (let point = 1; point <= REGULATION_POINT_COUNT; point++) {
      const page = REGULATION_POINT_PAGES[point] ?? 0;
      expect(page, `pkt ${String(point)}`).toBeGreaterThanOrEqual(previous);
      expect(page).toBeLessThanOrEqual(REGULATION_PAGE_COUNT);
      previous = page;
    }
  });

  // Strony sprawdzone ręcznie w PDF.
  it.each([
    [1, 2],
    [10, 4],
    [11, 4],
    [22, 8],
    [25, 9],
    [27, 10],
    [69, 26],
    [74, 28],
    [100, 35],
    [105, 36],
    [106, 38],
    [130, 44],
  ])('pkt %i zaczyna się na stronie %i', (point, page) => {
    expect(pageOfPoint(point)).toBe(page);
  });

  it.each(catalogPoints)('punkt katalogu „%s” ma stronę w PDF', (point) => {
    expect(pageOfPoint(point)).not.toBeNull();
  });

  it('każdy punkt zapisany w komunikatach interpretera (src/core) ma stronę w PDF', () => {
    const points = pointsInCoreSources();
    expect(points.length).toBeGreaterThan(catalogPoints.length / 2);
    expect(points.filter((point) => pageOfPoint(point) === null)).toEqual([]);
  });

  it('zapis punktu: litera i zakres wskazują pierwszy punkt', () => {
    expect(pointNumber('25b')).toBe(25);
    expect(pointNumber('57–59')).toBe(57);
    expect(pointNumber(131)).toBeNull();
    expect(pointNumber('rys. 5')).toBeNull();
    expect(pageOfPoint('25b')).toBe(9);
  });
});
