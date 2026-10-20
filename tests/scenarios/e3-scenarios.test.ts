import { describe, expect, it } from 'vitest';
import { fileGapsOf, ranksOf } from '../../src/core/sim/formation';
import type { SimState } from '../../src/core/sim/state';
import { ASSEMBLE_RANK, codes, expectAt, scenario, soldier, squadShape, verdict } from './helpers';

// Scenariusze akceptacyjne z docs/COMMANDS.md dotyczące etapu E3 (odliczanie, równanie, zmiany szyku
// w miejscu, przesunięcie, odstępowanie i łączenie). Niezmienniki SPEC 5.4 po każdym kroku (`scenario`).

const reportsOf = (state: SimState, kind: string) => state.reports.filter((r) => r.kind === kind);

describe('scenariusze akceptacyjne E3', () => {
  it('S04: S01 + „W dwójki, w prawo – ZWROT” — E_PRECOND_COUNT, stan bez zmian', () => {
    const run = scenario([ASSEMBLE_RANK, 'W dwójki, w prawo – ZWROT']);
    expect(verdict(run, 1)).toBe('rejected');
    expect(codes(run, 1)).toContain('E_PRECOND_COUNT');
    const before = run.records[0]?.state;
    if (before) expect(squadShape(run.state)).toEqual(squadShape(before));
  });

  it('S05: odliczanie do dwóch (dymki 1,2,1,…,1), swobodna; po BACZNOŚĆ i „W dwójki, w prawo – ZWROT” kolumna dwójkowa', () => {
    const run = scenario([ASSEMBLE_RANK, 'Do dwóch – ODLICZ', 'BACZNOŚĆ', 'W dwójki, w prawo – ZWROT']);
    const counted = run.records[1]?.state;
    expect(counted).toBeDefined();
    if (!counted) return;
    const numbers = reportsOf(counted, 'count');
    expect(numbers.map((r) => r.soldierId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(numbers.map((r) => r.text)).toEqual(['1', '2', '1', '2', '1', '2', '1', '2', '1']);
    // Liczby kolejno od prawego skrzydła, co ok. 0,5 s.
    for (let i = 1; i < numbers.length; i++) {
      expect((numbers[i]?.time ?? 0) - (numbers[i - 1]?.time ?? 0)).toBeCloseTo(0.5, 1);
    }
    expect(counted.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
    expect(counted.squad.countMode).toEqual({ n: 2, inMarch: false });

    const { state } = run;
    expect(state.squad.formation).toBe('COLUMN_OF_TWOS');
    expect(state.squad.layout?.facing).toBe(90);
    for (const k of [1, 3, 5, 7, 9]) expectAt(state, k, -0.6 * k, 0);
    for (const k of [2, 4, 6, 8]) expectAt(state, k, -0.6 * (k - 1), 0.6);
    for (const s of state.soldiers) expect(s.facing).toBeCloseTo(90, 6);
    // nr 9 bez pary — na końcu kolumny.
    const pairs = state.squad.layout ? ranksOf(state.squad.layout) : [];
    expect(pairs[pairs.length - 1]?.map((s) => s.id)).toEqual([9]);
  });

  it('S06: S05 + „W szereg, w lewo – FRONT” — szereg, front 0°, kolejność 1…9 co 0,6 m, dwójki tylko się zwróciły', () => {
    const run = scenario([ASSEMBLE_RANK, 'Do dwóch – ODLICZ', 'BACZNOŚĆ', 'W dwójki, w prawo – ZWROT', 'W szereg, w lewo – FRONT']);
    const column = run.records[3]?.state;
    const { state } = run;
    expect(state.squad.formation).toBe('SINGLE_RANK');
    expect(state.squad.layout?.facing).toBe(0);
    expect(state.squad.layout?.slots.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(fileGapsOf(state.squad.layout ?? { facing: 0, origin: { x: 0, y: 0 }, slots: [] }).every((g) => Math.abs(g - 0.6) < 0.01)).toBe(true);
    for (const k of [2, 4, 6, 8]) {
      const before = column ? soldier(column, k).position : { x: NaN, y: NaN };
      expectAt(state, k, before.x, before.y);
    }
    // I-8: jedynki na prawo od swoich dwójek, samotna nr 9 na lewo od ostatniej dwójki.
    expectAt(state, 1, 0, 0.6);
    expectAt(state, 9, -4.8, 0.6);
    expect(state.squad.irregularSpacing).toBe(false);
  });

  it('S07: dwuszereg + „Kolejno – ODLICZ” — dymki 1–5 w 1. szeregu, „Niepełny” lewoskrzydłowego 2. szeregu, wpis w Dzienniku, swobodna', () => {
    const run = scenario(['Pierwsza drużyna, w dwuszeregu – ZBIÓRKA', 'Kolejno – ODLICZ']);
    const { state } = run;
    const numbers = reportsOf(state, 'count');
    expect(numbers.map((r) => r.soldierId)).toEqual([1, 2, 3, 4, 5]);
    expect(numbers.map((r) => r.text)).toEqual(['1', '2', '3', '4', '5']);
    const incomplete = reportsOf(state, 'incomplete');
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]?.soldierId).toBe(9);
    expect(incomplete[0]?.text).toBe('Niepełny');
    // Drugi szereg przejmuje liczby poprzedników.
    expect([6, 7, 8, 9].map((id) => soldier(state, id).countNumber)).toEqual([1, 2, 3, 4]);
    expect(state.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
    const journal = run.session.journal.filter((e) => e.kind === 'report' && e.reportKind === 'incomplete');
    expect(journal).toHaveLength(1);
    expect(journal[0]?.kind === 'report' ? journal[0].soldier : '').toBe(soldier(state, 9).surname.nominative);
  });

  it('S08: jak S07, N = 8 — brak meldunku „Niepełny”', () => {
    const run = scenario(['Pierwsza drużyna, w dwuszeregu – ZBIÓRKA', 'Kolejno – ODLICZ'], { initial: { size: 8, seed: 1, squad: 1 } });
    expect(reportsOf(run.state, 'count').map((r) => r.text)).toEqual(['1', '2', '3', '4']);
    expect(reportsOf(run.state, 'incomplete')).toHaveLength(0);
  });

  it('S12: S01 + „trzy kroki w tył” — E_RULE; „krok w tył” — szyk 0,7 m na południe, front 0°', () => {
    const run = scenario([ASSEMBLE_RANK, 'Drużyna, trzy kroki w tył – MARSZ', 'Drużyna, krok w tył – MARSZ']);
    expect(codes(run, 1)).toContain('E_RULE');
    expect(verdict(run, 2)).toBe('accepted');
    for (let k = 1; k <= 9; k++) {
      expectAt(run.state, k, -0.6 * k, -0.7);
      expect(soldier(run.state, k).facing).toBeCloseTo(0, 6);
    }
  });

  it('S13: odstępowanie od prawoskrzydłowego o dwa kroki (odstępy 2,0 m), BACZNOŚĆ, łączenie (0,6 m)', () => {
    const run = scenario([ASSEMBLE_RANK, 'Od prawoskrzydłowego, dwa kroki – ODSTĄP', 'BACZNOŚĆ', 'Do prawoskrzydłowego – ŁĄCZ']);
    const extended = run.records[1]?.state;
    expect(extended).toBeDefined();
    if (!extended) return;
    expectAt(extended, 1, -0.6, 0);
    for (let k = 2; k <= 9; k++) expectAt(extended, k, -0.6 - 2.0 * (k - 1), 0);
    expect(extended.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
    expect(extended.squad.extension).not.toBeNull();
    for (let k = 1; k <= 9; k++) expectAt(run.state, k, -0.6 * k, 0);
    expect(run.state.squad.extension).toBeNull();
    // I-14: po ŁĄCZ postawa swobodna.
    expect(run.state.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
  });

  it('S14: S01 + BACZNOŚĆ + „Do prawoskrzydłowego – ŁĄCZ” — E_PRECOND_STATE', () => {
    const run = scenario([ASSEMBLE_RANK, 'BACZNOŚĆ', 'Do prawoskrzydłowego – ŁĄCZ']);
    expect(codes(run, 2)).toContain('E_PRECOND_STATE');
  });

  it('S25: S01 + „Równaj – W PRAWO” + zwrot — E_PRECOND_STATE (głowy zwrócone); po BACZNOŚĆ zwrot wykonany', () => {
    const run = scenario([ASSEMBLE_RANK, 'Równaj – W PRAWO', 'W prawo – ZWROT', 'BACZNOŚĆ', 'W prawo – ZWROT']);
    const dressed = run.records[1]?.state;
    expect(dressed?.squad.headsTurned).toBe('RIGHT');
    // Wszyscy oprócz prawoskrzydłowego zwracają głowy w prawo.
    expect(dressed?.soldiers.filter((s) => s.head === 'RIGHT').map((s) => s.id)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(codes(run, 2)).toContain('E_PRECOND_STATE');
    expect(run.records[3]?.state.soldiers.every((s) => s.head === 'FRONT')).toBe(true);
    expect(verdict(run, 4)).toBe('accepted');
    expect(run.state.squad.formation).toBe('FILE');
  });
});
