import { formatPoints, squadName, type CatalogEntry, type SquadOrdinal, type WritingMode } from './catalog';
import type { ParsedCommand } from './grammar/ast';
import { formIssues, renderCanonical } from './grammar/form';
import type { Span } from './grammar/normalize';
import { parse, type ParseFailure } from './grammar/parse';
import { levelOf, type MessageCode, type MessageLevel } from './messages';
import { addresseeMismatch } from './interpretations';
import { checkState } from './semantics/preconditions';
import { staticViolations } from './semantics/static';
import type { SimState } from './sim/state';

/**
 * Potok interpretera (SPEC 4.3): normalizacja → parsowanie → kontrola formy → semantyka.
 * Semantyka obejmuje reguły niezależne od stanu (`semantics/static.ts`), adresata, a gdy podano stan
 * drużyny — warunki wstępne zależne od stanu (`semantics/preconditions.ts`). Wykonanie (krok 5)
 * należy do symulacji (`sim/execute.ts`, `session.ts`).
 */

export interface InterpreterOptions {
  readonly mode: WritingMode;
  /** Nazwa drużyny na placu: liczebnik porządkowy albo `null` dla „Drużyna” (SPEC 3.8). */
  readonly squad: SquadOrdinal | null;
  /** Stan drużyny do sprawdzenia warunków wstępnych; bez niego tylko reguły niezależne od stanu. */
  readonly state?: SimState;
  /** Liczba komend do cofnięcia przez WRÓĆ. */
  readonly historyLength?: number;
}

export const DEFAULT_OPTIONS: InterpreterOptions = { mode: 'lenient', squad: 1 };

export interface Diagnostic {
  readonly code: MessageCode;
  readonly level: MessageLevel;
  readonly message: string;
  /** Fragment wpisanego tekstu, którego dotyczy komunikat. */
  readonly span: Span | null;
  readonly points: readonly string[];
  /** Szczegóły, np. lista poprawek przy normalizacji. */
  readonly details: readonly string[];
}

/**
 * - `accepted` — komenda poprawna, do wykonania;
 * - `rejected` — błąd, stan bez zmian;
 * - `ignored` — komenda poprawna, ale adresata nie ma na placu (nikt nie reaguje);
 * - `out_of_scope` — komenda z regulaminu, jeszcze nieobsługiwana.
 */
export type Verdict = 'accepted' | 'rejected' | 'ignored' | 'out_of_scope';

export interface InterpretResult {
  readonly input: string;
  readonly mode: WritingMode;
  readonly verdict: Verdict;
  readonly command: ParsedCommand | null;
  readonly entry: CatalogEntry | null;
  /** Forma kanoniczna rozpoznanej komendy. */
  readonly canonical: string | null;
  readonly diagnostics: readonly Diagnostic[];
  /** Poprawiona komenda do wstawienia przyciskiem „Użyj”. */
  readonly suggestion: string | null;
}

function diagnostic(
  code: MessageCode,
  message: string,
  span: Span | null,
  points: readonly string[],
  details: readonly string[] = [],
): Diagnostic {
  return { code, level: levelOf(code), message, span, points, details };
}

const q = (text: string) => `„${text}”`;

function list(items: readonly string[]): string {
  const shown = items.slice(0, 8).map((item) => (item.includes('(') ? item : q(item)));
  const more = items.length > shown.length ? ' …' : '';
  if (shown.length <= 1) return `${shown.join('')}${more}`;
  return `${shown.slice(0, -1).join(', ')} albo ${shown[shown.length - 1] ?? ''}${more}`;
}

function syntaxDiagnostic(failure: ParseFailure): Diagnostic {
  const { code, expected, found, candidates, normalized } = failure;
  const points = candidates.length > 0 ? [...new Set(candidates.flatMap((c) => c.points))] : ['10'];
  if (normalized.tokens.length === 0) {
    return diagnostic(code, 'Wpisz komendę, np. „Pierwsza drużyna, w szeregu – ZBIÓRKA”.', null, ['10']);
  }
  if (code === 'E_SYNTAX_UNKNOWN') {
    return diagnostic(
      code,
      'Nie rozpoznano komendy. Komenda składa się z zapowiedzi i hasła, np. „W prawo – ZWROT” albo „Pierwsza drużyna, w szeregu – ZBIÓRKA”.',
      failure.span,
      ['10'],
    );
  }
  if (code === 'E_SYNTAX_INCOMPLETE') {
    const message =
      found === null
        ? `Komenda niepełna — brakuje dalszej części. Oczekiwano: ${list(expected)}.`
        : `Przed hasłem ${q(found)} brakuje części zapowiedzi. Oczekiwano: ${list(expected)}.`;
    return diagnostic(code, message, failure.span, points);
  }
  if (expected.length === 1 && expected[0] === 'koniec komendy') {
    const span = { start: failure.span.start, end: normalized.input.trimEnd().length };
    const rest = normalized.input.slice(span.start, span.end);
    return diagnostic(code, `Komenda powinna się tu kończyć — zbędny dalszy ciąg ${q(rest)}.`, span, points);
  }
  return diagnostic(code, `W miejscu ${q(found ?? '')} oczekiwano: ${list(expected)}.`, failure.span, points);
}

function addresseeSpan(input: string): Span {
  const match = /dru[zż]yn[a-ząęółśżźćń]*/iu.exec(input);
  return match ? { start: 0, end: match.index + match[0].length } : { start: 0, end: input.length };
}

export function interpret(input: string, options: InterpreterOptions = DEFAULT_OPTIONS): InterpretResult {
  const { mode } = options;
  const base = { input, mode, command: null, entry: null, canonical: null, suggestion: null } as const;
  const parsed = parse(input);

  if (!parsed.ok) {
    return { ...base, verdict: 'rejected', diagnostics: [syntaxDiagnostic(parsed)] };
  }

  const { command, entry, items } = parsed;
  if (command.id === 'OUT_OF_SCOPE' || items === null) {
    return {
      ...base,
      verdict: 'out_of_scope',
      command,
      entry,
      diagnostics: [
        diagnostic(
          'E_OUT_OF_SCOPE',
          `To komenda z regulaminu (${entry.name}, ${formatPoints(entry.points)}), ale symulator jej jeszcze nie obsługuje — obejmuje musztrę drużyny bez broni.`,
          { start: 0, end: input.trimEnd().length },
          entry.points,
        ),
      ],
    };
  }

  const canonical = renderCanonical(items);
  const issues = formIssues(parsed.normalized, items);
  const known = { ...base, command, entry, canonical };

  if (mode === 'strict' && issues.length > 0) {
    return {
      ...known,
      verdict: 'rejected',
      suggestion: canonical,
      diagnostics: issues.map((issue) =>
        diagnostic(issue.code, issue.message, issue.span, issue.kind === 'missing-addressee' ? ['100'] : ['10']),
      ),
    };
  }

  const diagnostics: Diagnostic[] = [];
  const missingAddressee = issues.find((issue) => issue.kind === 'missing-addressee');
  const normalizations = issues.filter((issue) => issue.kind !== 'missing-addressee');
  if (normalizations.length > 0) {
    diagnostics.push(
      diagnostic(
        'I_NORMALIZED',
        'Zapis poprawiony do formy kanonicznej. W trybie ścisłym te różnice byłyby błędami:',
        null,
        ['10'],
        normalizations.map((issue) => issue.message),
      ),
    );
  }
  if (missingAddressee) {
    diagnostics.push(
      diagnostic(
        'W_MISSING_ADDRESSEE',
        `Regulamin podaje zatrzymanie z adresatem: ${q(canonical)}.`,
        missingAddressee.span,
        ['100'],
      ),
    );
  }

  const violations = staticViolations(command);
  if (violations.length > 0) {
    return {
      ...known,
      verdict: 'rejected',
      diagnostics: [...violations.map((v) => diagnostic(v.code, v.message, null, v.points)), ...diagnostics],
    };
  }

  if (addresseeMismatch(command.addressee, options.squad)) {
    const named = squadName(command.addressee?.ordinal ?? null);
    return {
      ...known,
      verdict: 'ignored',
      diagnostics: [
        diagnostic(
          'E_ADDRESSEE',
          `Na placu jest ${q(squadName(options.squad))}, a komenda jest do ${q(named)} — nikt nie reaguje.`,
          addresseeSpan(input),
          ['10'],
        ),
        ...diagnostics,
      ],
    };
  }

  if (options.state) {
    const verdict = checkState(command, options.state, { historyLength: options.historyLength ?? 0 });
    if (verdict.errors.length > 0) {
      return {
        ...known,
        verdict: 'rejected',
        diagnostics: [...verdict.errors.map((v) => diagnostic(v.code, v.message, null, v.points)), ...diagnostics],
      };
    }
    diagnostics.push(...verdict.warnings.map((v) => diagnostic(v.code, v.message, null, v.points)));
  }

  return { ...known, verdict: 'accepted', diagnostics };
}

/** Najpoważniejszy poziom komunikatów — wyznacza ikonę i kolor informacji zwrotnej (SPEC 3.4). */
export function worstLevel(result: InterpretResult): MessageLevel | 'ok' {
  const levels = result.diagnostics.map((d) => d.level);
  if (result.verdict === 'rejected' || levels.includes('error')) return 'error';
  if (result.verdict === 'ignored' || levels.includes('warning')) return 'warning';
  if (result.verdict === 'out_of_scope') return 'info';
  return 'ok';
}
