import { describe, expect, it } from 'vitest';
import { continueScript, type ScriptRun } from '../../src/core/script';
import { fileGapsOf, ranksOf } from '../../src/core/sim/formation';
import { angleDelta } from '../../src/core/sim/geometry';
import type { SimState } from '../../src/core/sim/state';
import { codes, scenario, soldier, verdict } from './helpers';

// Scenariusze akceptacyjne z docs/COMMANDS.md dotyczące etapu E4 (marsz, bieg, zatrzymania, zmiany kierunku,
// zachodzenie, zmiany szyku w marszu). Niezmienniki SPEC 5.4 sprawdzane po każdym kroku (`scenario`).

const FILE = 'Pierwsza drużyna, w rzędzie – ZBIÓRKA';
const MARCH = 'Drużyna, kierunek na wprost – MARSZ';
const HALT = 'Drużyna – STÓJ';

/** Kolejne odległości w głąb (m) między żołnierzami kolumny, od czoła. */
function depthGaps(state: SimState): number[] {
  const slots = state.squad.layout?.slots ?? [];
  return slots.slice(1).map((s, i) => Math.round((s.depth - (slots[i]?.depth ?? 0)) * 100) / 100);
}

function facingsNear(state: SimState, facing: number, tolerance = 1): boolean {
  return state.soldiers.every((s) => Math.abs(angleDelta(s.facing, facing)) <= tolerance);
}

/** Symulacja w odcinkach po 0,1 s, aż warunek będzie spełniony (najwyżej `limit` s). */
function until(run: ScriptRun, condition: (s: SimState) => boolean, limit = 60): ScriptRun {
  let current = run;
  for (let t = 0; t < limit && !condition(current.state); t += 0.1) current = continueScript(current.session, [{ wait: 0.1 }]);
  return current;
}

describe('scenariusze akceptacyjne E4', () => {
  it('S09: rząd, marsz na wprost 10 s, STÓJ — 3 kroki defiladowe, potem zwykły; odległości 1,2 m; po STÓJ rząd, zasadnicza, front 0°', () => {
    const run = scenario([FILE, MARCH, { wait: 1 }]);
    expect(soldier(run.state, 1).gait).toBe('PARADE');
    expect(run.state.squad.march?.motion).toBe('MARCHING');
    const later = continueScript(run.session, [{ wait: 9 }]);
    expect(later.violations).toEqual([]);
    expect(soldier(later.state, 1).gait).toBe('QUICK');
    expect(depthGaps(later.state).every((g) => Math.abs(g - 1.2) <= 0.05)).toBe(true);
    // Kierunkowy przeszedł ok. 10 s × 1,33 m/s.
    expect(soldier(later.state, 1).position.y).toBeGreaterThan(-2.1 + 12.5);

    const halted = continueScript(later.session, [HALT, { wait: 1.5 }]);
    expect(halted.violations).toEqual([]);
    const { state } = halted;
    expect(state.squad.march).toBeNull();
    expect(state.squad.formation).toBe('FILE');
    expect(state.squad.layout?.facing).toBe(0);
    expect(state.soldiers.every((s) => s.posture === 'ATTENTION' && s.motion === 'STANDING')).toBe(true);
    expect(depthGaps(state).every((g) => Math.abs(g - 1.2) <= 0.05)).toBe(true);
    // Jeszcze jeden krok po haśle STÓJ.
    expect(soldier(state, 1).position.y - soldier(later.state, 1).position.y).toBeCloseTo(0.7, 1);
  });

  it('S10: S09 bez STÓJ + „Kierunek – W LEWO”, 15 s — wszyscy frontem 270°, na śladzie kierunkowego, odległości 1,2 m', () => {
    const run = scenario([FILE, MARCH, { wait: 10 }, 'Kierunek – W LEWO', { wait: 15 }]);
    const { state } = run;
    expect(state.squad.march?.motion).toBe('MARCHING');
    expect(facingsNear(state, 270)).toBe(true);
    const ys = state.soldiers.map((s) => s.position.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.05);
    const xs = [...state.soldiers].sort((a, b) => a.id - b.id).map((s) => s.position.x);
    for (let i = 1; i < xs.length; i++) expect((xs[i] ?? 0) - (xs[i - 1] ?? 0)).toBeCloseTo(1.2, 1);
    // Marsz na zachód: kierunkowy prowadzi (najmniejsze x), reszta idzie po jego śladzie za nim.
    expect(state.soldiers.every((s) => s.position.x >= soldier(state, 1).position.x - 0.01)).toBe(true);
    // Ślad: zakręt o 90° w lewo trzy kroki po haśle — kolumna idzie na wysokości tego zakrętu.
    const trail = state.squad.march?.trail ?? [];
    expect(trail.length).toBeGreaterThanOrEqual(2);
  });

  it('S11: bieg, STÓJ → E_RULE (bieg trwa); „Zwykły – KROK” — 3 kroki biegiem, marsz; drugie STÓJ wykonane', () => {
    const run = scenario([FILE, MARCH, { wait: 10 }, 'Biegiem – MARSZ', { wait: 2 }, HALT]);
    expect(codes(run, 5)).toContain('E_RULE');
    expect(run.state.squad.march?.motion).toBe('RUNNING');
    const quick = continueScript(run.session, ['Zwykły – KROK', { wait: 0.5 }]);
    expect(quick.state.squad.march?.motion).toBe('RUNNING');
    const walking = continueScript(quick.session, [{ wait: 1.5 }]);
    expect(walking.state.squad.march?.motion).toBe('MARCHING');
    const halted = continueScript(walking.session, [HALT, { wait: 2 }]);
    expect(halted.records[0]?.result?.verdict).toBe('accepted');
    expect(halted.state.squad.march).toBeNull();
    expect(halted.state.soldiers.every((s) => s.posture === 'ATTENTION')).toBe(true);
    expect(halted.violations).toEqual([]);
  });

  it('S22: kolumna dwójkowa, marsz 10 s, „Stawaj – W LEWO” — dwuszereg frontem 270°, pierwszy szereg = dawny lewy rząd, swobodna', () => {
    const run = scenario(['Pierwsza drużyna, w kolumnie dwójkowej – ZBIÓRKA', MARCH, { wait: 10 }, 'Stawaj – W LEWO']);
    const { state } = run;
    expect(state.squad.formation).toBe('DOUBLE_RANK');
    expect(state.squad.march).toBeNull();
    expect(state.squad.layout?.facing).toBe(270);
    const front = ranksOf(state.squad.layout ?? { facing: 0, origin: { x: 0, y: 0 }, slots: [] })[0] ?? [];
    expect(front.map((s) => s.id).sort((a, b) => a - b)).toEqual([2, 4, 6, 8]);
    expect(state.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
    expect(facingsNear(state, 270)).toBe(true);
  });

  it('S23: S01 + „w prawo zachodź”, aż front ≈ 90°, STÓJ — szereg frontem 90° (±3°), nr 1 w (−0,6; 0) ±0,1 m, zasadnicza', () => {
    const started = scenario(['Pierwsza drużyna, w szeregu – ZBIÓRKA', 'Drużyna, w prawo zachodź – MARSZ']);
    expect(started.state.squad.march?.kind).toBe('WHEEL');
    const turned = until(started, (s) => (s.squad.layout?.facing ?? 0) >= 89.5);
    const halted = continueScript(turned.session, [HALT, { wait: 0.5 }]);
    expect(halted.violations).toEqual([]);
    const { state } = halted;
    expect(state.squad.formation).toBe('SINGLE_RANK');
    expect(Math.abs(angleDelta(state.squad.layout?.facing ?? 0, 90))).toBeLessThanOrEqual(3);
    const nr1 = soldier(state, 1).position;
    expect(Math.hypot(nr1.x + 0.6, nr1.y)).toBeLessThanOrEqual(0.1);
    expect(state.soldiers.every((s) => s.posture === 'ATTENTION')).toBe(true);
    expect(fileGapsOf(state.squad.layout ?? { facing: 0, origin: { x: 0, y: 0 }, slots: [] }).every((g) => Math.abs(g - 0.6) < 0.05)).toBe(true);
  });

  it('S24: odliczanie w marszu, „W dwójki – W PRZÓD”, W_AWAIT_QUICK_STEP, „Zwykły – KROK”, „W rząd – W TYŁ” → rząd 1,2 m', () => {
    const run = scenario([FILE, MARCH, { wait: 5 }, 'Do dwóch – ODLICZ', 'W dwójki – W PRZÓD']);
    expect(verdict(run, 3)).toBe('accepted');
    expect(run.state.squad.countMode).toEqual({ n: 2, inMarch: true });
    expect(verdict(run, 4)).toBe('accepted');
    const { state } = run;
    expect(state.squad.formation).toBe('COLUMN_OF_TWOS');
    expect(state.squad.march?.motion).toBe('MARCHING');
    expect(state.squad.march?.awaitingQuickStep).toBe(true);
    expect(state.reports.some((r) => r.kind === 'note' && r.code === 'W_AWAIT_QUICK_STEP')).toBe(true);
    expect(run.session.journal.some((e) => e.kind === 'note' && e.code === 'W_AWAIT_QUICK_STEP')).toBe(true);
    // Pary: prawy rząd 1, 3, 5, 7, 9; lewy 2, 4, 6, 8 — każda dwójka obok swojej jedynki.
    const pairs = ranksOf(state.squad.layout ?? { facing: 0, origin: { x: 0, y: 0 }, slots: [] }).map((r) => r.map((s) => s.id));
    expect(pairs).toEqual([[1, 2], [3, 4], [5, 6], [7, 8], [9]]);
    expect(depthGaps(state).filter((g) => g > 0.1).every((g) => Math.abs(g - 1.2) <= 0.05)).toBe(true);

    const quick = continueScript(run.session, ['Zwykły – KROK']);
    expect(quick.state.squad.march?.awaitingQuickStep).toBe(false);
    const file = continueScript(quick.session, ['W rząd – W TYŁ', { wait: 3 }]);
    expect(file.violations).toEqual([]);
    expect(file.state.squad.formation).toBe('FILE');
    expect(file.state.squad.layout?.slots.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(depthGaps(file.state).every((g) => Math.abs(g - 1.2) <= 0.05)).toBe(true);
  });

  it('S26: S02 + marsz 10 s + STÓJ + „W lewo – ZWROT” — szereg z odstępami 1,2 m, irregularSpacing; po SPOCZNIJ 0,6 m', () => {
    const run = scenario(['Pierwsza drużyna, w szeregu – ZBIÓRKA', 'W prawo – ZWROT', MARCH, { wait: 10 }, HALT, { wait: 1.5 }, 'W lewo – ZWROT']);
    const { state } = run;
    expect(state.squad.formation).toBe('SINGLE_RANK');
    expect(state.squad.irregularSpacing).toBe(true);
    const layout = state.squad.layout ?? { facing: 0, origin: { x: 0, y: 0 }, slots: [] };
    expect(fileGapsOf(layout).every((g) => Math.abs(g - 1.2) <= 0.05)).toBe(true);
    const right = soldier(state, 1).position;
    const eased = continueScript(run.session, ['SPOCZNIJ']);
    expect(eased.violations).toEqual([]);
    expect(eased.state.squad.irregularSpacing).toBe(false);
    expect(fileGapsOf(eased.state.squad.layout ?? layout).every((g) => Math.abs(g - 0.6) <= 0.05)).toBe(true);
    const after = soldier(eased.state, 1).position;
    expect(Math.hypot(after.x - right.x, after.y - right.y)).toBeLessThan(0.05);
  });
});
