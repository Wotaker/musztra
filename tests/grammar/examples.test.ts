import { describe, expect, it } from 'vitest';
import { ALL_ENTRIES, type ExpectedOutcome, type WritingMode } from '../../src/core/catalog';
import { interpret } from '../../src/core/interpreter';

// Testy generowane z przykładów katalogu (SPEC 7, 9.1): każdy przykład ✔/✖ z docs/COMMANDS.md,
// w obu trybach zapisu. Na placu stoi „Pierwsza drużyna” (ustawienie domyślne, SPEC 3.8).

const MODES: readonly WritingMode[] = ['lenient', 'strict'];
const MODE_NAME: Record<WritingMode, string> = { lenient: 'łagodny', strict: 'ścisły' };

function describeOutcome(outcome: ExpectedOutcome): string {
  switch (outcome.kind) {
    case 'accepted':
      return `✔ ${outcome.canonical}${outcome.codes.length > 0 ? ` (${outcome.codes.join(', ')})` : ''}`;
    case 'rejected':
      return `✖ ${outcome.code}`;
    case 'state':
      return `rozpoznana; w stanie „${outcome.state}” → ${outcome.code}`;
  }
}

for (const entry of ALL_ENTRIES) {
  describe(`${entry.id} ${entry.name}`, () => {
    for (const example of entry.examples) {
      for (const mode of MODES) {
        const expected = example[mode];
        it(`[${MODE_NAME[mode]}] ${example.text} → ${describeOutcome(expected)}`, () => {
          const result = interpret(example.text, { mode, squad: 1 });
          const codes = result.diagnostics.map((d) => d.code);

          switch (expected.kind) {
            case 'accepted':
              expect(result.verdict, JSON.stringify(result.diagnostics)).toBe('accepted');
              expect(result.command?.id).toBe(entry.id);
              expect(result.canonical).toBe(expected.canonical);
              expect([...codes].sort()).toEqual([...expected.codes].sort());
              break;
            case 'rejected':
              expect(result.verdict).not.toBe('accepted');
              expect(codes).toContain(expected.code);
              if (result.command && result.command.id !== 'OUT_OF_SCOPE') expect(result.command.id).toBe(entry.id);
              if (result.command?.id === 'OUT_OF_SCOPE') expect(result.command.entryId).toBe(entry.id);
              break;
            case 'state':
              // Bez stanu drużyny (etap E1) komenda jest rozpoznana i poprawna składniowo;
              // werdykt zależny od stanu sprawdzają testy semantyki od etapu expected.stage.
              expect(result.verdict, JSON.stringify(result.diagnostics)).toBe('accepted');
              expect(result.command?.id).toBe(entry.id);
              break;
          }
        });
        if (expected.kind === 'state') {
          it.todo(`[${MODE_NAME[mode]}] ${example.text} w stanie „${expected.state}” → ${expected.code} (semantyka, etap ${expected.stage})`);
        }
      }
    }
  });
}
