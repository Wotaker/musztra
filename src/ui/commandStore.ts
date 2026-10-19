import { create } from 'zustand';
import type { Stage, WritingMode } from '../core/catalog';
import type { InterpretResult } from '../core/interpreter';
import { useSimStore } from './simStore';

const MODE_KEY = 'musztra.writingMode';

function loadMode(): WritingMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'strict' ? 'strict' : 'lenient';
  } catch {
    return 'lenient';
  }
}

function saveMode(mode: WritingMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Brak dostępu do pamięci przeglądarki: tryb obowiązuje do zamknięcia strony.
  }
}

interface CommandState {
  /** Tekst w wierszu poleceń. */
  draft: string;
  mode: WritingMode;
  /** Wysłane komendy, od najstarszej (SPEC 3.2: ↑/↓). */
  history: string[];
  /** Pozycja w historii podczas przeglądania strzałkami; `null` — edycja nowej komendy. */
  historyIndex: number | null;
  result: InterpretResult | null;
  /** Skutek ostatniej komendy na placu: wykonana, bez zmian albo w kolejnym etapie. */
  outcome: { readonly executed: boolean; readonly pendingStage: Stage | null } | null;
  setDraft: (draft: string) => void;
  setMode: (mode: WritingMode) => void;
  submit: () => void;
  historyUp: () => void;
  historyDown: () => void;
}

export const useCommandStore = create<CommandState>()((set, get) => ({
  draft: '',
  mode: loadMode(),
  history: [],
  historyIndex: null,
  result: null,
  outcome: null,
  setDraft: (draft) => {
    set({ draft, historyIndex: null });
  },
  setMode: (mode) => {
    saveMode(mode);
    set({ mode });
  },
  submit: () => {
    const { draft, mode, history } = get();
    if (draft.trim() === '') return;
    // Na placu stoi „Pierwsza drużyna” — nazwa będzie ustawieniem od etapu E5 (SPEC 3.8).
    const { result, executed, pendingStage } = useSimStore.getState().submit(draft, mode);
    set({
      result,
      outcome: { executed, pendingStage },
      history: history[history.length - 1] === draft ? history : [...history, draft],
      historyIndex: null,
      // Po błędzie tekst zostaje do poprawienia (z podkreśleniem), po przyjęciu wiersz się czyści.
      draft: result.verdict === 'rejected' ? draft : '',
    });
  },
  historyUp: () => {
    const { history, historyIndex } = get();
    if (history.length === 0) return;
    const index = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
    set({ historyIndex: index, draft: history[index] ?? '' });
  },
  historyDown: () => {
    const { history, historyIndex } = get();
    if (historyIndex === null) return;
    const index = historyIndex + 1;
    if (index >= history.length) set({ historyIndex: null, draft: '' });
    else set({ historyIndex: index, draft: history[index] ?? '' });
  },
}));
