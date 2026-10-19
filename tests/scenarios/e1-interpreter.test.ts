import { describe, expect, it } from 'vitest';
import { ALL_ENTRIES } from '../../src/core/catalog';
import { interpret } from '../../src/core/interpreter';

// Scenariusze akceptacyjne z docs/COMMANDS.md, które nie zależą od stanu drużyny (etap E1).
// Część stanowa (wykonanie na placu, stan po komendzie) dochodzi od etapu E2.

describe('scenariusze akceptacyjne bez stanu', () => {
  it('S16: zbiórka w szeregu z „czołem” → E_PRECOND_FORMATION', () => {
    const result = interpret('Pierwsza drużyna, w szeregu, czoło na wysokości masztu – ZBIÓRKA', { mode: 'lenient', squad: 1 });
    expect(result.verdict).toBe('rejected');
    expect(result.diagnostics.map((d) => d.code)).toContain('E_PRECOND_FORMATION');
  });

  it('S19: „w prawo zwrot” — łagodny: przyjęta z I_NORMALIZED; ścisły: E_STRICT_FORM ze wskazaniem trzech rozbieżności', () => {
    const lenient = interpret('w prawo zwrot', { mode: 'lenient', squad: 1 });
    expect(lenient.verdict).toBe('accepted');
    expect(lenient.canonical).toBe('W prawo – ZWROT');
    expect(lenient.diagnostics.map((d) => d.code)).toEqual(['I_NORMALIZED']);

    const strict = interpret('w prawo zwrot', { mode: 'strict', squad: 1 });
    expect(strict.verdict).toBe('rejected');
    expect(strict.diagnostics.map((d) => d.code)).toEqual(['E_STRICT_FORM', 'E_STRICT_FORM', 'E_STRICT_FORM']);
    const messages = strict.diagnostics.map((d) => d.message).join(' ');
    expect(messages).toMatch(/wielką literą/);
    expect(messages).toMatch(/Brak myślnika/);
    expect(messages).toMatch(/Hasło wielkimi literami/);
  });

  it('S20: „Druga drużyna – BACZNOŚĆ”, na placu „Pierwsza drużyna” → E_ADDRESSEE, nikt nie reaguje', () => {
    const result = interpret('Druga drużyna – BACZNOŚĆ', { mode: 'lenient', squad: 1 });
    expect(result.verdict).toBe('ignored');
    expect(result.diagnostics.map((d) => d.code)).toEqual(['E_ADDRESSEE']);
  });

  it('S21: „Przez pierś – BROŃ” → E_OUT_OF_SCOPE ze wskazaniem pkt 34', () => {
    for (const mode of ['lenient', 'strict'] as const) {
      const result = interpret('Przez pierś – BROŃ', { mode, squad: 1 });
      expect(result.verdict).toBe('out_of_scope');
      expect(result.diagnostics[0]?.code).toBe('E_OUT_OF_SCOPE');
      expect(result.diagnostics[0]?.points).toEqual(['34']);
      expect(result.diagnostics[0]?.message).toContain('pkt 34');
    }
  });
});

describe('wydajność (SPEC 9.6)', () => {
  it('interpreter odpowiada w mniej niż 20 ms na komendę', () => {
    const texts = ALL_ENTRIES.flatMap((e) => e.examples.map((x) => x.text));
    for (const text of texts) interpret(text); // rozgrzewka
    let worst = 0;
    for (const text of texts) {
      for (const mode of ['lenient', 'strict'] as const) {
        const start = performance.now();
        interpret(text, { mode, squad: 1 });
        worst = Math.max(worst, performance.now() - start);
      }
    }
    expect(worst).toBeLessThan(20);
  });
});
