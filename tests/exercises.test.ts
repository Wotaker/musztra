import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../src/core/exercises';
import { interpret } from '../src/core/interpreter';
import { continueScript, runScript, type ScriptStep } from '../src/core/script';
import { createSession } from '../src/core/session';

// Podstawowe ćwiczenia (etap EF, K2): 5–7 sekwencji, każda z celem; komendy wpisane po kolei
// muszą zostać przyjęte bez błędów i uwag, a szyk spełnia niezmienniki SPEC 5.4.

/** W marszu użytkownik wpisuje kolejną komendę po chwili — tu 4 s symulacji. */
const MARCH_PAUSE: ScriptStep = { wait: 4 };

describe('podstawowe ćwiczenia', () => {
  it('jest ich 5–7, od najprostszego (zbiórka, postawy) do zmian szyku w marszu', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(5);
    expect(EXERCISES.length).toBeLessThanOrEqual(7);
    expect(EXERCISES[0]?.commands[0]).toMatch(/ZBIÓRKA$/);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });

  it.each(EXERCISES.map((e) => [e.title, e] as const))('„%s”: cel w jednym zdaniu', (_title, exercise) => {
    expect(exercise.goal).toMatch(/^[A-ZŁŚŻŹ].*\.$/);
    expect(exercise.goal.split(/[.!?]\s/)).toHaveLength(1);
  });

  it.each(EXERCISES.map((e) => [e.title, e] as const))('„%s”: każda komenda w formie kanonicznej (tryb ścisły)', (_title, exercise) => {
    for (const command of exercise.commands) {
      const result = interpret(command, { mode: 'strict', squad: 1 });
      expect(result.verdict, `${command}: ${JSON.stringify(result.diagnostics)}`).toBe('accepted');
      expect(result.canonical).toBe(command);
    }
  });

  it.each(EXERCISES.map((e) => [e.title, e] as const))('„%s”: wykonane po kolei — bez błędów i uwag', (_title, exercise) => {
    let session = createSession();
    for (const command of exercise.commands) {
      const run = continueScript(session, [{ command, mode: 'strict' }, MARCH_PAUSE]);
      const result = run.records[0]?.result;
      expect(result?.verdict, `${command}: ${JSON.stringify(result?.diagnostics)}`).toBe('accepted');
      expect(result?.diagnostics.filter((d) => d.level !== 'info') ?? []).toEqual([]);
      expect(run.violations, `${command}: ${run.violations.join('; ')}`).toEqual([]);
      session = run.session;
    }
  });

  it('ćwiczenia nie zależą od siebie — każde startuje od drużyny rozproszonej', () => {
    for (const exercise of EXERCISES) {
      const first = runScript([exercise.commands[0] ?? '']).records[0]?.result;
      expect(first?.verdict).toBe('accepted');
    }
  });
});
