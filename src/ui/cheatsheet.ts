import { COMMANDS, GROUPS, type CatalogEntry, type Group } from '../core/catalog';

/**
 * Dane ściągi (etap EF, K2): komendy z katalogu (`src/core/catalog`), pogrupowane jak w `COMMANDS.md`.
 * Grupa „Poza MVP” jest pominięta — tych komend symulator nie wykonuje (D-056).
 */

export interface CheatsheetGroup {
  readonly group: Group;
  readonly entries: readonly CatalogEntry[];
}

/** Bez wielkości liter, polskich znaków i myślników — jak tryb łagodny. */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[–—-]/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function haystack(entry: CatalogEntry): string {
  return fold([entry.id, entry.name, entry.pattern, entry.description, ...entry.forms, ...entry.points.map((p) => `pkt ${p}`)].join(' '));
}

const INDEX = new Map(COMMANDS.map((entry) => [entry, haystack(entry)]));

/** Każde słowo zapytania musi być początkiem któregoś słowa opisu komendy. */
function matches(entry: CatalogEntry, words: readonly string[]): boolean {
  const text = ` ${INDEX.get(entry) ?? ''}`;
  return words.every((w) => text.includes(` ${w}`));
}

/** Komendy pasujące do zapytania, w grupach katalogu. Numer komendy („M-11”) wskazuje dokładnie ją. */
export function cheatsheetGroups(query: string): CheatsheetGroup[] {
  const byId = COMMANDS.find((e) => e.id.toLowerCase() === query.trim().toLowerCase());
  const words = fold(query).split(' ').filter(Boolean);
  return GROUPS.filter((g) => g.id !== 'N')
    .map((group) => ({
      group,
      entries: COMMANDS.filter((e) => e.group === group.id && (byId ? e === byId : matches(e, words))),
    }))
    .filter((g) => g.entries.length > 0);
}

/** Forma wstawiana do wiersza poleceń: pierwsza forma kanoniczna z katalogu. */
export const canonicalForm = (entry: CatalogEntry): string => entry.forms[0] ?? entry.pattern;
