import type { MessageCode } from '../messages';

/** Tryb zapisu (SPEC 3.8, COMMANDS 0.1). */
export type WritingMode = 'lenient' | 'strict';

/** Etap, od którego interpreter zna stan potrzebny do sprawdzenia warunku (SPEC 10). */
export type Stage = 'E2' | 'E3' | 'E4';

export type GroupId = 'P' | 'Z' | 'ZB' | 'R' | 'O' | 'S' | 'M' | 'MS' | 'X' | 'N';

/**
 * Oczekiwany wynik przykładu w jednym trybie zapisu.
 * - `accepted`: komenda przyjęta, forma kanoniczna `canonical`, dodatkowe komunikaty `codes` (np. I_NORMALIZED);
 * - `rejected`: komenda nie zostanie wykonana, wśród komunikatów jest `code`;
 * - `state`: tekst jest poprawną komendą, a werdykt `code` zależy od stanu drużyny opisanego w `state`
 *   (sprawdzany od etapu `stage`, gdy interpreter zna stan).
 */
export type ExpectedOutcome =
  | { readonly kind: 'accepted'; readonly canonical: string; readonly codes: readonly MessageCode[] }
  | { readonly kind: 'rejected'; readonly code: MessageCode }
  | { readonly kind: 'state'; readonly code: MessageCode; readonly state: string; readonly stage: Stage };

export interface CommandExample {
  /** Tekst wpisywany w wierszu poleceń. */
  readonly text: string;
  /** Zapis przykładu w `docs/COMMANDS.md`, gdy różni się od `text` (np. skrót „…”). */
  readonly doc?: string;
  readonly lenient: ExpectedOutcome;
  readonly strict: ExpectedOutcome;
}

export interface CatalogEntry {
  /** Identyfikator z `docs/COMMANDS.md`, np. „Z-1”. */
  readonly id: string;
  readonly group: GroupId;
  readonly name: string;
  /** Nazwa reguły w `src/core/grammar/musztra.ohm`. */
  readonly rule: string;
  /** Wzorzec z wariantami, jak w regulaminie (do wyświetlania). */
  readonly pattern: string;
  /** Wszystkie warianty w formie kanonicznej; każdy musi przejść tryb ścisły bez zmian. */
  readonly forms: readonly string[];
  /** Hasła komendy w formie kanonicznej (do diagnozy błędów składni). */
  readonly executives: readonly string[];
  /** Punkty regulaminu. */
  readonly points: readonly string[];
  /** Krótki cytat z regulaminu. */
  readonly quote: string;
  readonly description: string;
  readonly preconditions: string;
  readonly effect: string;
  readonly examples: readonly CommandExample[];
}

export interface Group {
  readonly id: GroupId;
  readonly name: string;
}

// Pomocnicze konstruktory przykładów — zwięzły zapis danych katalogu.

const accepted = (canonical: string, codes: readonly MessageCode[] = []): ExpectedOutcome => ({
  kind: 'accepted',
  canonical,
  codes,
});
const rejected = (code: MessageCode): ExpectedOutcome => ({ kind: 'rejected', code });

/** ✔ w obu trybach; tekst jest formą kanoniczną. */
export function ok(text: string): CommandExample {
  return { text, lenient: accepted(text), strict: accepted(text) };
}

/** ✔ w trybie łagodnym (z I_NORMALIZED i formą kanoniczną), ✖ w ścisłym z kodem `strictCode`. */
export function normalized(
  text: string,
  canonical: string,
  strictCode: MessageCode = 'E_STRICT_FORM',
  doc?: string,
): CommandExample {
  return { text, ...(doc === undefined ? {} : { doc }), lenient: accepted(canonical, ['I_NORMALIZED']), strict: rejected(strictCode) };
}

/** ✖ w obu trybach z tym samym kodem. */
export function bad(text: string, code: MessageCode, doc?: string): CommandExample {
  return { text, ...(doc === undefined ? {} : { doc }), lenient: rejected(code), strict: rejected(code) };
}

/** Poprawna komenda, której werdykt zależy od stanu drużyny. */
export function inState(text: string, state: string, code: MessageCode, stage: Stage): CommandExample {
  const outcome: ExpectedOutcome = { kind: 'state', code, state, stage };
  return { text, lenient: outcome, strict: outcome };
}

/** Przykład o różnych wynikach w obu trybach. */
export function modes(text: string, lenient: ExpectedOutcome, strict: ExpectedOutcome, doc?: string): CommandExample {
  return { text, ...(doc === undefined ? {} : { doc }), lenient, strict };
}

export const outcome = { accepted, rejected };
