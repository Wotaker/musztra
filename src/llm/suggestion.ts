import type { SquadOrdinal, WritingMode } from '../core/catalog';
import { interpret, type InterpretResult } from '../core/interpreter';
import type { MessageCode } from '../core/messages';
import type { SimState } from '../core/sim/state';

/**
 * SPEC 8.1: LLM nigdy nie decyduje o poprawności. Każda jego propozycja przechodzi przez interpreter
 * (parsowanie i semantykę w obecnym stanie drużyny), zanim pojawi się przycisk „Użyj”.
 */

export interface SuggestionContext {
  readonly mode: WritingMode;
  readonly squad: SquadOrdinal | null;
  /** Stan drużyny w chwili sprawdzania propozycji. */
  readonly state: SimState;
  readonly historyLength: number;
}

export type SuggestionCheck =
  | { readonly ok: true; /** Forma kanoniczna do wstawienia w wiersz poleceń. */ readonly command: string }
  | { readonly ok: false; /** Pierwszy problem znaleziony przez interpreter. */ readonly code: MessageCode | null };

/** Problem, który dyskwalifikuje propozycję: błąd, nikt nie reaguje, poza zakresem albo brak skutku. */
function problem(result: InterpretResult): MessageCode | null | undefined {
  const blocking = result.diagnostics.find(
    (d) => d.level === 'error' || d.code === 'E_ADDRESSEE' || d.code === 'E_OUT_OF_SCOPE' || d.code === 'W_NO_EFFECT',
  );
  if (blocking) return blocking.code;
  return result.verdict === 'accepted' ? undefined : null;
}

export function checkSuggestion(suggestion: string, context: SuggestionContext): SuggestionCheck {
  const text = suggestion.trim();
  if (text === '' || /[\n\r]/.test(text)) return { ok: false, code: null };
  const options = { squad: context.squad, state: context.state, historyLength: context.historyLength };

  // Najpierw tryb łagodny: model może zapisać komendę nieco inaczej — liczy się, czy to poprawna komenda.
  const lenient = interpret(text, { ...options, mode: 'lenient' });
  const lenientProblem = problem(lenient);
  if (lenientProblem !== undefined || lenient.canonical === null) return { ok: false, code: lenientProblem ?? null };

  // Do wiersza trafia forma kanoniczna — musi przejść także w trybie ustawionym przez użytkownika.
  const canonical = interpret(lenient.canonical, { ...options, mode: context.mode });
  const canonicalProblem = problem(canonical);
  if (canonicalProblem !== undefined) return { ok: false, code: canonicalProblem };
  return { ok: true, command: lenient.canonical };
}
