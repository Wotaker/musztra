import { describe, expect, it } from 'vitest';
import { ALL_ENTRIES, COMMANDS, GROUPS, OUT_OF_SCOPE } from '../../src/core/catalog';
import { COMPILED_GRAMMAR_SOURCE, definedRules, dictionaryCollisions, grammar, rulesUsed } from '../../src/core/grammar/parse';
import { interpret } from '../../src/core/interpreter';

// Test spójności katalogu i gramatyki (SPEC 7): katalog jest jedynym źródłem listy komend.

describe('katalog jako dane', () => {
  it('identyfikatory i reguły są unikalne', () => {
    const ids = ALL_ENTRIES.map((e) => e.id);
    const rules = ALL_ENTRIES.map((e) => e.rule);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(rules).size).toBe(rules.length);
  });

  it('każdy wpis należy do znanej grupy i ma przykład', () => {
    const groups = new Set(GROUPS.map((g) => g.id));
    for (const entry of ALL_ENTRIES) {
      expect(groups.has(entry.group), entry.id).toBe(true);
      expect(entry.examples.length, entry.id).toBeGreaterThan(0);
      expect(entry.points.length, entry.id).toBeGreaterThan(0);
      expect(entry.quote.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('każda komenda MVP ma przykład poprawny (✔ w obu trybach)', () => {
    for (const entry of COMMANDS) {
      const ok = entry.examples.filter((e) => e.lenient.kind === 'accepted' && e.strict.kind === 'accepted');
      expect(ok.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('komendy spoza MVP należą do grupy N, MVP — do pozostałych', () => {
    expect(OUT_OF_SCOPE.every((e) => e.group === 'N')).toBe(true);
    expect(COMMANDS.every((e) => e.group !== 'N')).toBe(true);
  });
});

describe('gramatyka ↔ katalog', () => {
  const rules = definedRules();

  it('reguła każdego wpisu istnieje w gramatyce i jest alternatywą reguły Command', () => {
    const command = /Command\s*=([\s\S]*?)\n\n/.exec(COMPILED_GRAMMAR_SOURCE)?.[1] ?? '';
    const alternatives = [...command.matchAll(/(\w+) end/g)].map((m) => m[1]);
    expect([...alternatives].sort()).toEqual(ALL_ENTRIES.map((e) => e.rule).sort());
    for (const entry of ALL_ENTRIES) expect(rules, entry.id).toContain(entry.rule);
  });

  it.each(COMMANDS.flatMap((e) => e.forms.map((form) => [e.id, form] as const)))(
    '%s: wariant „%s” jest formą kanoniczną (tryb ścisły bez zmian)',
    (id, form) => {
      const result = interpret(form, { mode: 'strict', squad: 1 });
      expect(result.verdict, JSON.stringify(result.diagnostics)).toBe('accepted');
      expect(result.command?.id).toBe(id);
      expect(result.canonical).toBe(form);
      expect(result.diagnostics).toEqual([]);
    },
  );

  it.each(COMMANDS.filter((e) => e.executives.length > 0).map((e) => [e.id, e] as const))(
    '%s: hasła z danych występują w formach kanonicznych',
    (_id, entry) => {
      for (const executive of entry.executives) {
        expect(entry.forms.some((f) => f.endsWith(executive)), executive).toBe(true);
      }
    },
  );

  it('każda reguła gramatyki jest pokryta co najmniej jednym przykładem z katalogu', () => {
    const texts = ALL_ENTRIES.flatMap((e) => [...e.forms, ...e.examples.map((x) => x.text)]);
    const used = new Set(texts.flatMap((t) => rulesUsed(t)));
    const uncovered = rules.filter((r) => !used.has(r));
    expect(uncovered).toEqual([]);
    // Lista reguł obejmuje też alternatywy nazwane i gramatykę słownictwa — test nie jest pusty.
    expect(rules).toEqual(expect.arrayContaining(['CountSpec_byN', 'N20_Vehicles_engines', 'terrainObject', 'surname']));
  });

  it('słownik form nie ma niejednoznaczności (słowo bez polskich znaków → jedna pisownia)', () => {
    expect(dictionaryCollisions()).toEqual([]);
  });

  it('gramatyka się kompiluje i zaczyna od reguły Command', () => {
    expect(grammar.name).toBe('Musztra');
    expect(grammar.match('w prawo - zwrot ', 'Command').succeeded()).toBe(true);
  });
});
