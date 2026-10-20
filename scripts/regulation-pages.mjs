// Mapa „punkt regulaminu → strona PDF” dla odnośników „pkt N” (etap EF, K2).
//
// Uruchomienie (wymaga pdftotext z pakietu poppler-utils):
//   node scripts/regulation-pages.mjs > src/core/regulationPages.ts
//
// Każdy punkt regulaminu zaczyna się w nowym wierszu numerem z kropką („22. Zwroty w miejscu…”).
// Strony są przeszukiwane po kolei i przyjmowany jest tylko kolejny oczekiwany numer (albo numer
// o 1–2 dalej, gdy OCR zniekształcił poprzedni — wtedy pominięty punkt dostaje stronę następnego),
// więc numery list wewnątrz punktów („1) …”) i rysunków nie mylą wyniku.

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const pdf = join(import.meta.dirname, '..', 'docs', 'regulamin-musztry-1994.pdf');
const info = execFileSync('pdfinfo', [pdf], { encoding: 'utf8' });
const pageCount = Number(/Pages:\s+(\d+)/.exec(info)?.[1]);

const pages = {};
const gaps = [];
let expected = 1;
for (let page = 1; page <= pageCount; page++) {
  const text = execFileSync('pdftotext', ['-layout', '-f', String(page), '-l', String(page), pdf, '-'], { encoding: 'utf8' });
  for (const line of text.split('\n')) {
    const match = /^\s*(\d{1,3})\.\s*\S/.exec(line);
    if (!match) continue;
    const n = Number(match[1]);
    if (n < expected || n > expected + 2) continue;
    for (let gap = expected; gap < n; gap++) {
      pages[gap] = page;
      gaps.push(gap);
    }
    pages[n] = page;
    expected = n + 1;
  }
}

const entries = Object.entries(pages).map(([point, page]) => `  ${point}: ${String(page)},`);
process.stdout.write(`// Plik wygenerowany przez scripts/regulation-pages.mjs — nie edytować ręcznie.
// Strona PDF (numeracja od 1, jak w przeglądarce PDF), na której zaczyna się punkt regulaminu.
// Punkty bez numeru w tekście PDF (zniekształcenie OCR), przypisane do strony następnego punktu: ${gaps.join(', ') || 'brak'}.

export const REGULATION_PAGE_COUNT = ${String(pageCount)};

export const REGULATION_POINT_PAGES: Readonly<Record<number, number>> = {
${entries.join('\n')}
};
`);
