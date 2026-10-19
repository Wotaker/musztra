import { describe, expect, it } from 'vitest';
import { runScript, type ScriptStep } from '../../src/core/script';
import { squadShape } from '../scenarios/helpers';

// SPEC 9.4: ten sam skrypt daje identyczny stan niezależnie od prędkości symulacji i liczby klatek.

const SCRIPT: ScriptStep[] = [
  { command: 'Pierwsza drużyna, w dwuszeregu – ZBIÓRKA', settle: false },
  { wait: 8 },
  { command: 'W prawo – ZWROT', settle: false },
  { wait: 2 },
  { command: 'ROZEJŚĆ SIĘ', settle: false },
  { wait: 1.5 },
  { command: 'Pierwsza drużyna', settle: false },
  { wait: 3 },
  { command: 'W kolumnie dwójkowej – ZBIÓRKA', settle: false },
  { wait: 10 },
];

/** Czas symulacji jest tu wielokrotnością kroku; przy prędkości 2× czekamy o połowę krócej. */
function runAt(speed: number, frame: number) {
  const steps = SCRIPT.map((s) => (typeof s === 'object' && 'wait' in s ? { wait: s.wait / speed } : s));
  return runScript(steps, { speed, frame });
}

describe('determinizm symulacji', () => {
  const reference = runAt(1, 1 / 60);

  for (const [speed, frame] of [
    [1, 1 / 30],
    [1, 1 / 144],
    [2, 1 / 60],
    [3, 1 / 50],
    [0.5, 1 / 60],
  ] as const) {
    it(`prędkość ${String(speed)}×, klatka ${(1 / frame).toFixed(0)} Hz → ten sam stan`, () => {
      const run = runAt(speed, frame);
      expect(run.state.tick).toBe(reference.state.tick);
      expect(squadShape(run.state)).toEqual(squadShape(reference.state));
    });
  }

  it('ten sam skrypt dwa razy → identyczny stan (z ziarnem losowości)', () => {
    expect(runAt(1, 1 / 60).state).toEqual(reference.state);
  });

  it('inne ziarno → inne rozproszenie', () => {
    const other = runScript([], { initial: { size: 9, seed: 2, squad: 1 } });
    const base = runScript([]);
    expect(other.state.soldiers.map((s) => s.position)).not.toEqual(base.state.soldiers.map((s) => s.position));
  });
});
