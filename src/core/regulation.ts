import { REGULATION_POINT_PAGES } from './regulationPages';

export { REGULATION_PAGE_COUNT, REGULATION_POINT_PAGES } from './regulationPages';

/** Źródło prawdy dla całej aplikacji (CLAUDE.md, „Źródła prawdy”). */
export const REGULATION = {
  title: 'Regulamin musztry Sił Zbrojnych Rzeczypospolitej Polskiej',
  shortTitle: 'Regulamin musztry SZ RP',
  signature: 'Szt. Gen. 1427/94',
  year: 1994,
} as const;

/** Najwyższy numer punktu regulaminu. */
export const REGULATION_POINT_COUNT = Math.max(...Object.keys(REGULATION_POINT_PAGES).map(Number));

/** Numer punktu z zapisu w katalogu: „25b” → 25, „57–59” → 57; `null`, gdy to nie numer punktu regulaminu. */
export function pointNumber(point: string | number): number | null {
  const match = /^\s*(\d{1,3})/.exec(String(point));
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 1 && n <= REGULATION_POINT_COUNT ? n : null;
}

/** Strona PDF regulaminu, na której zaczyna się punkt; `null` dla nieznanego punktu. */
export function pageOfPoint(point: string | number): number | null {
  const n = pointNumber(point);
  return n === null ? null : (REGULATION_POINT_PAGES[n] ?? null);
}
