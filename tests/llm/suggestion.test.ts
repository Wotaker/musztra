import { describe, expect, it } from 'vitest';
import type { WritingMode } from '../../src/core/catalog';
import { runScript } from '../../src/core/script';
import { checkSuggestion, type SuggestionContext } from '../../src/llm/suggestion';

// SPEC 8.1: każda propozycja LLM przechodzi przez interpreter (parsowanie i semantykę w obecnym stanie)
// przed pokazaniem przycisku „Użyj”. Propozycja niepoprawna jest odrzucana.

function context(steps: readonly string[], mode: WritingMode = 'lenient'): SuggestionContext {
  const run = runScript(steps);
  return { mode, squad: run.state.squad.name, state: run.state, historyLength: run.session.history.length };
}

const atEaseRank = () => context(['Pierwsza drużyna, w szeregu – ZBIÓRKA', 'SPOCZNIJ']);

describe('propozycja LLM sprawdzana przez interpreter', () => {
  it('poprawna i wykonalna w obecnym stanie — przyjęta w formie kanonicznej', () => {
    expect(checkSuggestion('BACZNOŚĆ', atEaseRank())).toEqual({ ok: true, command: 'BACZNOŚĆ' });
  });

  it('zapis do poprawy (tryb łagodny) — przyjęta jako forma kanoniczna, która przejdzie też tryb ścisły', () => {
    const strict = context(['Pierwsza drużyna, w szeregu – ZBIÓRKA', 'SPOCZNIJ'], 'strict');
    expect(checkSuggestion('bacznosc', strict)).toEqual({ ok: true, command: 'BACZNOŚĆ' });
    expect(checkSuggestion('w prawo zwrot', context(['Pierwsza drużyna, w szeregu – ZBIÓRKA']))).toEqual({
      ok: true,
      command: 'W prawo – ZWROT',
    });
  });

  it('poprawna składniowo, ale niewykonalna w obecnym stanie — odrzucona (semantyka)', () => {
    const check = checkSuggestion('W prawo – ZWROT', atEaseRank());
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.code).toBe('E_PRECOND_POSTURE');
  });

  it('wymyślona komenda — odrzucona (składnia)', () => {
    const check = checkSuggestion('Drużyna, w prawo – OBRÓT', atEaseRank());
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.code).toMatch(/^E_SYNTAX/);
  });

  it('komenda do innej drużyny — odrzucona (nikt by nie zareagował)', () => {
    const check = checkSuggestion('Druga drużyna – BACZNOŚĆ', atEaseRank());
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.code).toBe('E_ADDRESSEE');
  });

  it('komenda spoza zakresu symulatora — odrzucona', () => {
    const check = checkSuggestion('Przez pierś – BROŃ', atEaseRank());
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.code).toBe('E_OUT_OF_SCOPE');
  });

  it('komenda bez skutku w obecnym stanie (W_NO_EFFECT) — odrzucona', () => {
    const marching = context(['Pierwsza drużyna, w rzędzie – ZBIÓRKA', 'Drużyna, kierunek na wprost – MARSZ']);
    const check = checkSuggestion('Pierwsza drużyna', marching);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.code).toBe('W_NO_EFFECT');
  });

  it('pusta propozycja lub wiele komend naraz — odrzucona', () => {
    expect(checkSuggestion('   ', atEaseRank()).ok).toBe(false);
    expect(checkSuggestion('BACZNOŚĆ\nW prawo – ZWROT', atEaseRank()).ok).toBe(false);
  });
});
