import { create } from 'zustand';
import type { InterpretResult } from '../core/interpreter';
import type { LlmError } from '../llm/client';
import type { ExplainRequest } from '../llm/prompt';
import { checkSuggestion, type SuggestionCheck } from '../llm/suggestion';
import { useSettingsStore } from './settingsStore';
import { useSimStore } from './simStore';

/**
 * Objaśnienie LLM ostatniego werdyktu (SPEC 3.4, 8). Jedno naraz: nowa komenda przerywa poprzednie
 * objaśnienie. Propozycja modelu jest pokazywana dopiero po sprawdzeniu przez interpreter (SPEC 8.1).
 */

export type ExplainStatus = 'idle' | 'streaming' | 'done' | 'error';

interface ExplainState {
  /** Werdykt, którego dotyczy objaśnienie. */
  result: InterpretResult | null;
  status: ExplainStatus;
  /** Objaśnienie (w trakcie strumienia — jego dotychczasowa część). */
  text: string;
  regulationPoints: readonly number[];
  /** Wynik sprawdzenia propozycji modelu przez interpreter; `null` — model nic nie zaproponował. */
  suggestion: SuggestionCheck | null;
  error: string | null;
  start: (request: ExplainRequest) => void;
  reset: () => void;
}

let controller: AbortController | null = null;

/** Np. nieudane pobranie modułu klienta przy braku sieci. */
const UNKNOWN_ERROR = 'Nie udało się uzyskać objaśnienia. Sprawdź połączenie z internetem i spróbuj ponownie.';

const EMPTY = { result: null, status: 'idle', text: '', regulationPoints: [], suggestion: null, error: null } as const;

export const useExplainStore = create<ExplainState>()((set, get) => ({
  ...EMPTY,
  start: (request) => {
    controller?.abort();
    const own = new AbortController();
    controller = own;
    const { apiKey } = useSettingsStore.getState();
    set({ ...EMPTY, result: request.result, status: 'streaming' });

    // Klient API (z SDK Anthropic) ładowany dopiero przy pierwszym objaśnieniu — bez klucza nie jest pobierany.
    import('../llm/client')
      .then(({ explain }) =>
        explain(request, {
          apiKey,
          signal: own.signal,
          onText: (text) => {
            if (get().result === request.result) set({ text });
          },
        }),
      )
      .then((answer) => {
        if (get().result !== request.result) return;
        // Propozycja sprawdzana w stanie drużyny z chwili odpowiedzi — tym, w którym użytkownik jej użyje.
        const { session } = useSimStore.getState();
        const suggestion =
          answer.suggestion === null
            ? null
            : checkSuggestion(answer.suggestion, {
                mode: request.result.mode,
                squad: session.sim.squad.name,
                state: session.sim,
                historyLength: session.history.length,
              });
        set({ status: 'done', text: answer.explanation, regulationPoints: answer.regulationPoints, suggestion });
      })
      .catch((error: unknown) => {
        if (get().result !== request.result) return;
        const failure = error instanceof Error && error.name === 'LlmError' ? (error as LlmError) : null;
        if (failure?.kind === 'aborted') return;
        set({ status: 'error', error: failure?.message ?? UNKNOWN_ERROR });
      })
      .finally(() => {
        if (controller === own) controller = null;
      });
  },
  reset: () => {
    controller?.abort();
    controller = null;
    set({ ...EMPTY });
  },
}));
