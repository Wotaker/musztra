import { describe, expect, it } from 'vitest';
import { continueScript, runScript } from '../../src/core/script';
import { checkInvariants } from '../../src/core/sim/invariants';
import { regulationSlots } from '../../src/core/sim/formation';
import type { SimState } from '../../src/core/sim/state';
import { codes, expectAt, scenario, soldier, verdict } from '../scenarios/helpers';

// Zbiórki we wszystkich szykach i liczebnościach, zwroty z każdego szyku, niezmienniki (SPEC 5.4).

const FORMATIONS = {
  'w szeregu': 'SINGLE_RANK',
  'w dwuszeregu': 'DOUBLE_RANK',
  'w rzędzie': 'FILE',
  'w kolumnie dwójkowej': 'COLUMN_OF_TWOS',
} as const;

describe('zbiórka przy dowódcy (ZB-1, I-6, I-7)', () => {
  for (const [phrase, formation] of Object.entries(FORMATIONS)) {
    for (const size of [3, 4, 9, 12]) {
      it(`${phrase}, N = ${String(size)}: szyk regulaminowy, niezmienniki spełnione`, () => {
        const { state } = scenario([`Pierwsza drużyna, ${phrase} – ZBIÓRKA`], { initial: { size, seed: size, squad: 1 } });
        expect(state.squad.formation).toBe(formation);
        expect(state.soldiers.every((s) => s.posture === 'ATTENTION')).toBe(true);
        expect(checkInvariants(state)).toEqual([]);
      });
    }
  }

  it('dwuszereg z 9: pierwszy szereg nr 1–5 od prawej, drugi nr 6–9 od prawej, 1,2 m za pierwszym (I-7)', () => {
    const { state } = scenario(['Pierwsza drużyna, w dwuszeregu – ZBIÓRKA']);
    for (let k = 1; k <= 5; k++) expectAt(state, k, -0.6 * k, 0);
    for (let k = 6; k <= 9; k++) expectAt(state, k, -0.6 * (k - 5), -1.2);
  });

  it('rząd: kierunkowy 3 kroki za dowódcą, kolejni co 1,2 m (I-6)', () => {
    const { state } = scenario(['Pierwsza drużyna, w rzędzie – ZBIÓRKA']);
    for (let k = 1; k <= 9; k++) expectAt(state, k, 0, -2.1 - 1.2 * (k - 1));
  });

  it('kolumna dwójkowa: prawy rząd nieparzyści za dowódcą, lewy parzyści 0,6 m w lewo', () => {
    const { state } = scenario(['Pierwsza drużyna, w kolumnie dwójkowej – ZBIÓRKA']);
    expectAt(state, 1, 0, -2.1);
    expectAt(state, 2, -0.6, -2.1);
    expectAt(state, 3, 0, -3.3);
    expectAt(state, 9, 0, -2.1 - 4 * 1.2);
  });

  it('zbiórka według frontu dowódcy obróconego o 90° (Q/E)', () => {
    const run = runScript([]);
    const turned: SimState = { ...run.state, commander: { ...run.state.commander, heading: 90, facing: 90 } };
    const session = { ...run.session, sim: turned };
    const next = continueScript(session, ['Pierwsza drużyna, w szeregu – ZBIÓRKA']);
    expect(next.violations).toEqual([]);
    // Front wschód: lewo dowódcy to północ.
    expectAt(next.state, 1, 0, 0.6);
    expectAt(next.state, 9, 0, 5.4);
  });
});

describe('zwroty w miejscu (Z-1, pkt 22, 76)', () => {
  const cases: [string, string, string, boolean][] = [
    ['w szeregu', 'W prawo – ZWROT', 'FILE', false],
    ['w szeregu', 'W lewo – ZWROT', 'FILE', true],
    ['w szeregu', 'W tył – ZWROT', 'SINGLE_RANK', false],
    ['w dwuszeregu', 'W prawo – ZWROT', 'COLUMN_OF_TWOS', false],
    ['w dwuszeregu', 'W lewo – ZWROT', 'COLUMN_OF_TWOS', true],
    ['w dwuszeregu', 'W tył – ZWROT', 'DOUBLE_RANK', false],
    ['w rzędzie', 'W lewo – ZWROT', 'SINGLE_RANK', false],
    ['w rzędzie', 'W prawo – ZWROT', 'SINGLE_RANK', true],
    ['w rzędzie', 'W tył – ZWROT', 'FILE', false],
    ['w kolumnie dwójkowej', 'W lewo – ZWROT', 'DOUBLE_RANK', false],
    ['w kolumnie dwójkowej', 'W prawo – ZWROT', 'DOUBLE_RANK', true],
    ['w kolumnie dwójkowej', 'W tył – ZWROT', 'COLUMN_OF_TWOS', false],
  ];
  for (const [phrase, turn, after, warning] of cases) {
    it(`${phrase} + „${turn}” → ${after}${warning ? ' z uwagą W_FORMATION_DIRECTION' : ''}`, () => {
      for (const size of [8, 9]) {
        const run = scenario([`Pierwsza drużyna, ${phrase} – ZBIÓRKA`, turn], { initial: { size, seed: 3, squad: 1 } });
        expect(verdict(run, 1)).toBe('accepted');
        expect(run.state.squad.formation).toBe(after);
        expect(codes(run, 1).includes('W_FORMATION_DIRECTION')).toBe(warning);
      }
    });
  }

  it('cztery zwroty w prawo przywracają szereg w tym samym miejscu', () => {
    const run = scenario(['Pierwsza drużyna, w szeregu – ZBIÓRKA', 'W prawo – ZWROT', 'W lewo – ZWROT', 'W tył – ZWROT', 'W tył – ZWROT']);
    expect(run.state.squad.formation).toBe('SINGLE_RANK');
    for (let k = 1; k <= 9; k++) expectAt(run.state, k, -0.6 * k, 0);
  });

  it('w tył przez lewe ramię (pkt 22): w połowie zwrotu front 270°', () => {
    const run = scenario(['Pierwsza drużyna, w szeregu – ZBIÓRKA', { command: 'W tył – ZWROT', settle: false }, { wait: 0.3 }]);
    expect(soldier(run.state, 1).facing).toBeCloseTo(270, 0);
  });

  it('I-1: rząd (1,2 m) → szereg: odstępy 1,2 m i flaga irregularSpacing; SPOCZNIJ koryguje do 0,6 m względem prawoskrzydłowego', () => {
    const run = scenario(['Pierwsza drużyna, w rzędzie – ZBIÓRKA', 'W lewo – ZWROT']);
    expect(run.state.squad.formation).toBe('SINGLE_RANK');
    expect(run.state.squad.irregularSpacing).toBe(true);
    expectAt(run.state, 1, 0, -2.1);
    expectAt(run.state, 2, 0, -3.3);
    const corrected = continueScript(run.session, ['SPOCZNIJ']);
    expect(corrected.violations).toEqual([]);
    expect(corrected.state.squad.irregularSpacing).toBe(false);
    expectAt(corrected.state, 1, 0, -2.1);
    expectAt(corrected.state, 2, 0, -2.7);
    expectAt(corrected.state, 9, 0, -2.1 - 8 * 0.6);
    expect(corrected.state.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
  });

  it('zwrot unieważnia oznaczenie kolumny z dwójek i odliczenie', () => {
    const run = scenario(['Pierwsza drużyna, w dwuszeregu – ZBIÓRKA', 'W prawo – ZWROT']);
    expect(run.state.squad.formedFromTwos).toBe(false);
    expect(run.state.squad.countMode).toBeNull();
  });
});

describe('miejsca regulaminowe', () => {
  it('dwuszereg niepełny: ⌈N/2⌉ w pierwszym szeregu', () => {
    const slots = regulationSlots('DOUBLE_RANK', [1, 2, 3, 4, 5, 6, 7]);
    expect(slots.filter((s) => s.depth === 0)).toHaveLength(4);
  });
});

describe('kontrola niezmienników wykrywa naruszenia', () => {
  const base = runScript(['Pierwsza drużyna, w dwuszeregu – ZBIÓRKA']).state;
  const edit = (id: number, change: (s: SimState['soldiers'][number]) => SimState['soldiers'][number]): SimState => ({
    ...base,
    soldiers: base.soldiers.map((s) => (s.id === id ? change(s) : s)),
  });

  it('poprawny szyk: brak naruszeń', () => {
    expect(checkInvariants(base)).toEqual([]);
  });
  it('żołnierz poza miejscem', () => {
    expect(checkInvariants(edit(3, (s) => ({ ...s, position: { x: s.position.x, y: s.position.y + 0.2 } })))).not.toEqual([]);
  });
  it('inny front', () => {
    expect(checkInvariants(edit(3, (s) => ({ ...s, facing: 5 })))).not.toEqual([]);
  });
  it('zamienione miejsca (kolejność niezgodna ze stanem)', () => {
    const a = soldier(base, 1).position;
    const b = soldier(base, 2).position;
    const swapped: SimState = {
      ...base,
      soldiers: base.soldiers.map((s) => (s.id === 1 ? { ...s, position: b } : s.id === 2 ? { ...s, position: a } : s)),
    };
    expect(checkInvariants(swapped).join(' ')).toMatch(/Kolejność/);
  });
  it('żołnierz bez pary w środku dwuszeregu', () => {
    // nr 7 (drugi szereg, trzecia kolumna) przesunięty na koniec drugiego szeregu → dwie kolumny bez pary.
    const moved = edit(7, (s) => ({ ...s, position: { x: -3.0, y: -1.2 } }));
    expect(checkInvariants(moved).length).toBeGreaterThan(0);
  });
});
