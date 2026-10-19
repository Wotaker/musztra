import { describe, expect, it } from 'vitest';
import { worldObject } from '../../src/core/sim/world';
import { bearing } from '../../src/core/sim/geometry';
import { ASSEMBLE_RANK, codes, expectAt, scenario, soldier, squadShape, verdict } from './helpers';

// Scenariusze akceptacyjne z docs/COMMANDS.md dotyczące etapu E2 (zbiórki, zwroty, postawy, WRÓĆ).
// Stan początkowy: N = 9, ziarno 1, dowódca w (0, 0) z frontem 0°, drużyna rozproszona, tryb łagodny.
// Po każdym kroku `scenario` sprawdza niezmienniki szyku z SPEC 5.4.

describe('scenariusze akceptacyjne E2', () => {
  it('S01: zbiórka w szeregu przy dowódcy — nr 1 w (−0,6; 0), nr k w (−0,6k; 0), front 0°, zasadnicza, stoi', () => {
    const run = scenario([ASSEMBLE_RANK]);
    const { state } = run;
    expect(verdict(run, 0)).toBe('accepted');
    expect(state.squad.formation).toBe('SINGLE_RANK');
    expect(state.squad.layout?.facing).toBe(0);
    for (let k = 1; k <= 9; k++) expectAt(state, k, -0.6 * k, 0);
    for (const s of state.soldiers) {
      expect(s.posture).toBe('ATTENTION');
      expect(s.motion).toBe('STANDING');
      expect(s.facing).toBeCloseTo(0, 6);
    }
  });

  it('S02: S01 + „W prawo – ZWROT” — rząd, front 90°, czoło = nr 1, odległości 0,6 m, zasadnicza', () => {
    const { state } = scenario([ASSEMBLE_RANK, 'W prawo – ZWROT']);
    expect(state.squad.formation).toBe('FILE');
    expect(state.squad.layout?.facing).toBe(90);
    expect(state.squad.layout?.slots[0]?.id).toBe(1);
    expect(state.squad.layout?.slots.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let k = 1; k <= 9; k++) {
      expectAt(state, k, -0.6 * k, 0);
      expect(soldier(state, k).facing).toBeCloseTo(90, 6);
      expect(soldier(state, k).posture).toBe('ATTENTION');
    }
    // I-2: odległość 0,6 m wynika z geometrii, rozwiera się dopiero po ruszeniu.
    expect(state.squad.irregularSpacing).toBe(true);
  });

  it('S03: S01 + SPOCZNIJ + „W prawo – ZWROT” — E_PRECOND_POSTURE, stan bez zmian (swobodna)', () => {
    const run = scenario([ASSEMBLE_RANK, 'SPOCZNIJ', 'W prawo – ZWROT']);
    expect(verdict(run, 2)).toBe('rejected');
    expect(codes(run, 2)).toContain('E_PRECOND_POSTURE');
    const before = run.records[1]?.state;
    expect(before).toBeDefined();
    if (before) expect(squadShape(run.state)).toEqual(squadShape(before));
    expect(run.state.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
    expect(run.state.squad.formation).toBe('SINGLE_RANK');
  });

  it('S15: zbiórka w dwuszeregu przy maszcie frontem do koszar — prawoskrzydłowy w punkcie zaczepienia, front ku koszarom', () => {
    const { state } = scenario([
      'Pierwsza drużyna, w dwuszeregu, na placu, prawe skrzydło na wysokości masztu, frontem do koszar – ZBIÓRKA',
    ]);
    const anchor = worldObject('MAST').anchor;
    expect(state.squad.formation).toBe('DOUBLE_RANK');
    expectAt(state, 1, anchor.x, anchor.y);
    const toBarracks = bearing(anchor, worldObject('BARRACKS').position);
    expect(Math.abs((state.squad.layout?.facing ?? -1) - toBarracks)).toBeLessThanOrEqual(1);
    for (const s of state.soldiers) expect(Math.abs(s.facing - toBarracks)).toBeLessThanOrEqual(1);
  });

  it('S16: zbiórka w szeregu z „czołem” — E_PRECOND_FORMATION, drużyna nie reaguje', () => {
    const run = scenario(['Pierwsza drużyna, w szeregu, czoło na wysokości masztu – ZBIÓRKA']);
    expect(codes(run, 0)).toContain('E_PRECOND_FORMATION');
    expect(run.state.squad.formation).toBe('DISPERSED');
  });

  it('S17: „na poprzednim miejscu” na starcie — E_PRECOND_STATE; po S15 i rozejściu — pozycje i front jak w S15', () => {
    const previous = 'Pierwsza drużyna, w dwuszeregu, na poprzednim miejscu – ZBIÓRKA';
    const s15 = 'Pierwsza drużyna, w dwuszeregu, na placu, prawe skrzydło na wysokości masztu, frontem do koszar – ZBIÓRKA';
    const run = scenario([previous, s15, 'ROZEJŚĆ SIĘ', previous]);
    expect(codes(run, 0)).toContain('E_PRECOND_STATE');
    expect(verdict(run, 0)).toBe('rejected');
    const afterS15 = run.records[1]?.state;
    const dispersed = run.records[2]?.state;
    expect(dispersed?.squad.formation).toBe('DISPERSED');
    expect(verdict(run, 3)).toBe('accepted');
    expect(afterS15).toBeDefined();
    if (afterS15) {
      for (const s of afterS15.soldiers) expectAt(run.state, s.id, s.position.x, s.position.y);
      expect(run.state.squad.layout?.facing).toBeCloseTo(afterS15.squad.layout?.facing ?? -1, 6);
    }
  });

  it('S18: S02 + WRÓĆ — szereg, front 0°, pozycje jak w S01', () => {
    const run = scenario([ASSEMBLE_RANK, 'W prawo – ZWROT', 'WRÓĆ']);
    const { state } = run;
    expect(state.squad.formation).toBe('SINGLE_RANK');
    expect(state.squad.layout?.facing).toBe(0);
    for (let k = 1; k <= 9; k++) {
      expectAt(state, k, -0.6 * k, 0);
      expect(soldier(state, k).facing).toBeCloseTo(0, 6);
    }
  });

  it('S19: „w prawo zwrot” po S01 — łagodny: wykonane z I_NORMALIZED; ścisły: E_STRICT_FORM, stan bez zmian', () => {
    const lenient = scenario([ASSEMBLE_RANK, 'w prawo zwrot']);
    expect(verdict(lenient, 1)).toBe('accepted');
    expect(lenient.records[1]?.result?.canonical).toBe('W prawo – ZWROT');
    expect(codes(lenient, 1)).toContain('I_NORMALIZED');
    expect(lenient.state.squad.formation).toBe('FILE');

    const strict = scenario([ASSEMBLE_RANK, { command: 'w prawo zwrot', mode: 'strict' }]);
    expect(verdict(strict, 1)).toBe('rejected');
    expect(codes(strict, 1).filter((c) => c === 'E_STRICT_FORM')).toHaveLength(3);
    expect(strict.state.squad.formation).toBe('SINGLE_RANK');
  });

  it('S20: „Druga drużyna – BACZNOŚĆ” — E_ADDRESSEE, nikt nie reaguje', () => {
    const run = scenario([ASSEMBLE_RANK, 'SPOCZNIJ', 'Druga drużyna – BACZNOŚĆ']);
    expect(verdict(run, 2)).toBe('ignored');
    expect(codes(run, 2)).toEqual(['E_ADDRESSEE']);
    expect(run.state.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
  });

  it('S27: „W szeregu – ZBIÓRKA” bez wezwania — E_PRECOND_ATTENTION; po „Pierwsza drużyna” wykonana', () => {
    const run = scenario(['W szeregu – ZBIÓRKA', 'Pierwsza drużyna', 'W szeregu – ZBIÓRKA']);
    expect(codes(run, 0)).toContain('E_PRECOND_ATTENTION');
    expect(run.records[0]?.state.squad.formation).toBe('DISPERSED');
    // Po wezwaniu żołnierze zwracają się frontem do dowódcy i przyjmują postawę zasadniczą.
    const summoned = run.records[1]?.state;
    expect(summoned?.squad.attending).toBe(true);
    for (const s of summoned?.soldiers ?? []) {
      expect(s.posture).toBe('ATTENTION');
      expect(Math.abs(((bearing(s.position, { x: 0, y: 0 }) - s.facing + 540) % 360) - 180)).toBeLessThanOrEqual(1);
    }
    expect(verdict(run, 2)).toBe('accepted');
    expect(run.state.squad.formation).toBe('SINGLE_RANK');
    for (let k = 1; k <= 9; k++) expectAt(run.state, k, -0.6 * k, 0);
  });
});
