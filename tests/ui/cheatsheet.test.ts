import { describe, expect, it } from 'vitest';
import { COMMANDS, GROUPS } from '../../src/core/catalog';
import { interpret } from '../../src/core/interpreter';
import { canonicalForm, cheatsheetGroups, fold } from '../../src/ui/cheatsheet';

// Ściąga (etap EF, K2): generowana z danych katalogu, pogrupowana jak w COMMANDS.md, z wyszukiwarką.

const ids = (query: string) => cheatsheetGroups(query).flatMap((g) => g.entries.map((e) => e.id));

describe('ściąga z katalogu komend', () => {
  it('bez zapytania: wszystkie komendy MVP w grupach i kolejności katalogu, bez grupy „Poza MVP”', () => {
    const groups = cheatsheetGroups('');
    expect(groups.map((g) => g.group.id)).toEqual(GROUPS.filter((g) => g.id !== 'N').map((g) => g.id));
    expect(ids('')).toEqual(COMMANDS.map((e) => e.id));
  });

  it.each(COMMANDS.map((e) => [e.id, e] as const))('%s: forma kanoniczna do wstawienia jest poprawną komendą (tryb ścisły)', (_id, entry) => {
    const form = canonicalForm(entry);
    const result = interpret(form, { mode: 'strict', squad: 1 });
    expect(result.command?.id).toBe(entry.id);
    expect(result.diagnostics.filter((d) => d.code.startsWith('E_SYNTAX') || d.code === 'E_STRICT_FORM')).toEqual([]);
  });

  it('wyszukiwanie bez polskich znaków i wielkości liter', () => {
    expect(ids('zbiorka')).toEqual(['ZB-1', 'ZB-2', 'ZB-3']);
    expect(ids('ODLICZ')).toContain('R-2');
    expect(ids('baczność')).toContain('P-2');
  });

  it('wyszukiwanie po numerze komendy, punkcie regulaminu i kilku słowach', () => {
    expect(ids('M-11')).toEqual(['M-11']);
    expect(ids('pkt 75')).toContain('S-4');
    expect(ids('kierunek marsz')).toEqual(expect.arrayContaining(['M-1', 'M-9']));
    expect(ids('nieistniejąca komenda xyz')).toEqual([]);
  });

  it('normalizacja zapytania', () => {
    expect(fold('  W prawo – ZWROT ')).toBe('w prawo zwrot');
    expect(fold('Łączenie')).toBe('laczenie');
  });
});
