import type { InterpretResult } from '../core/interpreter';
import { isExplainable, useCommandStore } from './commandStore';
import { PointLinks } from './PointLinks';
import { useExplainStore } from './explainStore';
import { hasApiKey, useSettingsStore } from './settingsStore';
import { useViewStore } from './store';

const keepFocus = (event: { preventDefault: () => void }) => {
  // Fokus zostaje w wierszu poleceń.
  event.preventDefault();
};

/** Przycisk „Objaśnij” (SPEC 3.1, 3.4): przy błędzie i uwadze; bez klucza otwiera ustawienia. */
export function ExplainButton({ result }: { result: InterpretResult }) {
  const request = useCommandStore((s) => s.explainRequest);
  const status = useExplainStore((s) => (s.result === result ? s.status : 'idle'));
  const keyPresent = useSettingsStore(hasApiKey);
  if (!isExplainable(result) || !request || request.result !== result) return null;
  if (status === 'streaming' || status === 'done') return null;

  return (
    <button
      type="button"
      className="feedback__explain"
      data-testid="explain"
      title={keyPresent ? 'Objaśnienie przez model Claude (Anthropic)' : 'Objaśnienia AI wymagają klucza API — otwórz ustawienia'}
      onMouseDown={keepFocus}
      onClick={() => {
        if (keyPresent) useExplainStore.getState().start(request);
        else useViewStore.getState().setDialog('settings');
      }}
    >
      <span aria-hidden="true">✦</span> {status === 'error' ? 'Objaśnij ponownie' : 'Objaśnij'}
      {!keyPresent && <span className="feedback__explain-hint"> · wymaga klucza API</span>}
    </button>
  );
}

/** Objaśnienie LLM pod komunikatami interpretera: strumień, propozycja po kontroli interpretera, błędy. */
export function ExplanationBox({ result }: { result: InterpretResult }) {
  const state = useExplainStore();
  const setDraft = useCommandStore((s) => s.setDraft);
  if (state.result !== result || state.status === 'idle') return null;

  if (state.status === 'error') {
    return (
      <div className="explanation explanation--error" data-testid="llm-error" role="alert">
        <span className="explanation__label">Objaśnienie AI niedostępne</span>
        <p className="explanation__text">{state.error}</p>
      </div>
    );
  }

  const suggestion = state.suggestion;
  return (
    <div className="explanation" data-testid="llm-explanation" data-status={state.status} aria-live="polite" aria-busy={state.status === 'streaming'}>
      <span className="explanation__label">
        <span aria-hidden="true">✦</span> Objaśnienie AI{state.status === 'streaming' ? ' — piszę…' : ''}
      </span>
      <p className="explanation__text" data-testid="llm-explanation-text">
        {state.status === 'done' ? <PointLinks text={state.text} /> : state.text}
        {state.status === 'streaming' && <span className="explanation__cursor" aria-hidden="true" />}
      </p>
      {state.status === 'done' && state.regulationPoints.length > 0 && (
        <p className="explanation__points" data-testid="llm-points">
          Regulamin: <PointLinks text={`pkt ${state.regulationPoints.join(', ')}`} />
        </p>
      )}
      {state.status === 'done' && suggestion?.ok && (
        <button
          type="button"
          className="feedback__use"
          data-testid="llm-use-suggestion"
          onMouseDown={keepFocus}
          onClick={() => {
            setDraft(suggestion.command);
          }}
        >
          Użyj: {suggestion.command}
        </button>
      )}
      {state.status === 'done' && suggestion && !suggestion.ok && (
        <p className="explanation__note" data-testid="llm-suggestion-rejected">
          Propozycja modelu nie przeszła kontroli interpretera w obecnym stanie drużyny — pominięta.
        </p>
      )}
      <p className="explanation__disclaimer">Werdykt wydaje interpreter; objaśnienie AI może być nieprecyzyjne.</p>
    </div>
  );
}
