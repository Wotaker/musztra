import { COMMANDS, GROUPS } from './commands';
import { OUT_OF_SCOPE } from './outOfScope';
import type { CatalogEntry } from './types';

export { COMMANDS, GROUPS } from './commands';
export { OUT_OF_SCOPE } from './outOfScope';
export * from './lexicon';
export * from './types';

/** Wszystkie wpisy: komendy MVP i rozpoznawane komendy spoza MVP. */
export const ALL_ENTRIES: readonly CatalogEntry[] = [...COMMANDS, ...OUT_OF_SCOPE];

const byId = new Map(ALL_ENTRIES.map((entry) => [entry.id, entry]));
const byRule = new Map(ALL_ENTRIES.map((entry) => [entry.rule, entry]));

export function entryById(id: string): CatalogEntry | undefined {
  return byId.get(id);
}

export function entryByRule(rule: string): CatalogEntry | undefined {
  return byRule.get(rule);
}

export function groupName(id: CatalogEntry['group']): string {
  return GROUPS.find((g) => g.id === id)?.name ?? id;
}

/** „pkt 22, 76, 83” — zapis punktów regulaminu w komunikatach. */
export function formatPoints(points: readonly string[]): string {
  return points.length === 0 ? '' : `pkt ${points.join(', ')}`;
}
