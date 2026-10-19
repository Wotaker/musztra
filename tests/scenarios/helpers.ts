import { expect } from 'vitest';
import { runScript, type ScriptOptions, type ScriptRun, type ScriptStep } from '../../src/core/script';
import type { SimState, Soldier } from '../../src/core/sim/state';

/** Uruchomienie scenariusza z obowiązkową kontrolą niezmienników po każdym kroku (SPEC 9.3). */
export function scenario(steps: readonly ScriptStep[], options: ScriptOptions = {}): ScriptRun {
  const run = runScript(steps, options);
  expect(run.violations, run.violations.join('\n')).toEqual([]);
  return run;
}

export function soldier(state: SimState, id: number): Soldier {
  const s = state.soldiers.find((x) => x.id === id);
  if (!s) throw new Error(`Brak żołnierza nr ${String(id)}`);
  return s;
}

export function expectAt(state: SimState, id: number, x: number, y: number, tolerance = 0.05): void {
  const s = soldier(state, id);
  expect(Math.hypot(s.position.x - x, s.position.y - y), `nr ${String(id)} w (${s.position.x.toFixed(2)}; ${s.position.y.toFixed(2)}), oczekiwano (${String(x)}; ${String(y)})`).toBeLessThanOrEqual(tolerance);
}

/** Kody komunikatów wyniku kroku `index`. */
export function codes(run: ScriptRun, index: number): string[] {
  return run.records[index]?.result?.diagnostics.map((d) => d.code) ?? [];
}

export function verdict(run: ScriptRun, index: number): string | undefined {
  return run.records[index]?.result?.verdict;
}

/** Stan drużyny bez pól zmiennych w czasie — do porównań „stan bez zmian”. */
export function squadShape(state: SimState) {
  return {
    squad: { ...state.squad, activity: null },
    soldiers: state.soldiers.map((s) => ({
      id: s.id,
      x: Number(s.position.x.toFixed(4)),
      y: Number(s.position.y.toFixed(4)),
      facing: Number(s.facing.toFixed(3)),
      posture: s.posture,
      head: s.head,
      countNumber: s.countNumber,
    })),
  };
}

export const ASSEMBLE_RANK = 'Pierwsza drużyna, w szeregu – ZBIÓRKA';
