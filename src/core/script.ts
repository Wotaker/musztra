import type { WritingMode } from './catalog';
import type { InterpretResult } from './interpreter';
import { absorbReports, createSession, submit, type Session } from './session';
import { DT } from './sim/constants';
import type { InitialOptions } from './sim/initial';
import { checkInvariants } from './sim/invariants';
import { isSettled, simulate, step } from './sim/simulate';
import type { SimState } from './sim/state';

/**
 * `runScript` (SPEC 5.5): wykonanie sekwencji komend od stanu początkowego — do testów scenariuszowych.
 * Po każdej komendzie symulacja jest przewijana do zakończenia czynności przejściowych, a niezmienniki
 * szyku (SPEC 5.4) są sprawdzane.
 */

export type ScriptStep =
  | string
  | { readonly command: string; readonly mode?: WritingMode; readonly settle?: boolean }
  | { readonly wait: number };

export interface ScriptOptions {
  readonly initial?: InitialOptions;
  readonly mode?: WritingMode;
  /** Najdłuższy czas oczekiwania na zakończenie czynności (s). */
  readonly settleLimit?: number;
  /** Mnożnik czasu (prędkość symulacji) i długość klatki — wynik nie może od nich zależeć (SPEC 9.4). */
  readonly speed?: number;
  readonly frame?: number;
}

export interface ScriptRecord {
  readonly step: ScriptStep;
  readonly result: InterpretResult | null;
  readonly state: SimState;
  /** Naruszenia niezmienników po tym kroku. */
  readonly violations: readonly string[];
}

export interface ScriptRun {
  readonly session: Session;
  readonly records: readonly ScriptRecord[];
  /** Stan po ostatnim kroku. */
  readonly state: SimState;
  readonly violations: readonly string[];
}

function run(session: Session, seconds: number, options: ScriptOptions): Session {
  const frame = options.frame ?? DT;
  const speed = options.speed ?? 1;
  let s = session;
  let elapsed = 0;
  while (elapsed < seconds - 1e-9) {
    const dt = Math.min(frame, seconds - elapsed);
    s = { ...s, sim: simulate(s.sim, dt * speed) };
    elapsed += dt;
  }
  return absorbReports(s);
}

function settleSession(session: Session, options: ScriptOptions): Session {
  const limit = options.settleLimit ?? 120;
  let s = session;
  const start = s.sim.time;
  while (!isSettled(s.sim) && s.sim.time - start < limit) s = { ...s, sim: step(s.sim) };
  return absorbReports(s);
}

export function runScript(steps: readonly ScriptStep[], options: ScriptOptions = {}): ScriptRun {
  return continueScript(createSession(options.initial), steps, options);
}

/** Dalszy ciąg skryptu od istniejącej sesji. */
export function continueScript(
  initial: Session,
  steps: readonly ScriptStep[],
  options: ScriptOptions = {},
): ScriptRun {
  let session = initial;
  const records: ScriptRecord[] = [];
  for (const item of steps) {
    let result: InterpretResult | null = null;
    if (typeof item === 'object' && 'wait' in item) {
      session = run(session, item.wait, options);
    } else {
      const text = typeof item === 'string' ? item : item.command;
      const mode = (typeof item === 'object' ? item.mode : undefined) ?? options.mode ?? 'lenient';
      const outcome = submit(session, text, mode);
      session = outcome.session;
      result = outcome.result;
      const settle = typeof item === 'object' ? (item.settle ?? true) : true;
      if (settle) session = settleSession(session, options);
    }
    const violations = isSettled(session.sim) ? checkInvariants(session.sim) : [];
    records.push({ step: item, result, state: session.sim, violations });
  }
  return {
    session,
    records,
    state: session.sim,
    violations: records.flatMap((r) => r.violations.map((v) => `${describeStep(r.step)}: ${v}`)),
  };
}

function describeStep(step: ScriptStep): string {
  if (typeof step === 'string') return step;
  return 'wait' in step ? `czekaj ${String(step.wait)} s` : step.command;
}
