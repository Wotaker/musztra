import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMMANDS, OUT_OF_SCOPE, entryById, type CatalogEntry, type CommandExample } from '../../src/core/catalog';

// Zgodność danych katalogu z docs/COMMANDS.md (źródło wyżej w hierarchii, CLAUDE.md):
// każdy wpis dokumentu ma odpowiednik w danych, z tymi samymi punktami regulaminu,
// a każdy przykład ✔/✖ z dokumentu jest przykładem w danych, z tym samym wynikiem.

const doc = readFileSync(join(import.meta.dirname, '..', '..', 'docs', 'COMMANDS.md'), 'utf8');

interface DocEntry {
  id: string;
  name: string;
  points: string[];
  examples: DocExample[];
}

interface DocExample {
  raw: string;
  mark: '✔' | '✖';
  mode: 'łagodny' | 'ścisły' | null;
  text: string;
  codes: string[];
}

const CODE = /^[EWI]_[A-Z_]+$/;

function parseExamples(line: string): DocExample[] {
  return line
    .split(' · ')
    .map((raw) => raw.trim())
    .flatMap((raw): DocExample[] => {
      const mark = raw.includes('✔') ? '✔' : raw.includes('✖') ? '✖' : null;
      const quoted = [...raw.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? '');
      const text = quoted[0];
      // Pozycje bez przykładu w cudzysłowie (np. „✖ w swobodnej → …”) opisują stan, nie tekst.
      if (!mark || text === undefined || CODE.test(text)) return [];
      const mode = /\(łagodny\)/.test(raw.split('`')[0] ?? '') ? 'łagodny' : /\(ścisły\)/.test(raw.split('`')[0] ?? '') ? 'ścisły' : null;
      return [{ raw, mark, mode, text, codes: quoted.slice(1).filter((c) => CODE.test(c)) }];
    });
}

function parseDoc(): DocEntry[] {
  const entries: DocEntry[] = [];
  const sections = doc.split(/^### /m).slice(1);
  for (const section of sections) {
    const header = /^([A-Z]+-\d+) (.+)$/m.exec(section);
    if (!header) continue;
    const pointsLine = /^- \*\*Pkt:\*\* (.+)$/m.exec(section)?.[1] ?? '';
    const examplesLine = /^- \*\*Przykłady:\*\* (.+)$/m.exec(section)?.[1] ?? '';
    entries.push({
      id: header[1] ?? '',
      name: header[2] ?? '',
      points: pointsLine.split(',').map((p) => p.trim()),
      examples: parseExamples(examplesLine),
    });
  }
  return entries;
}

const docEntries = parseDoc();

const accepted = (e: CommandExample, mode: 'lenient' | 'strict') => e[mode].kind === 'accepted';
const codesOf = (e: CommandExample): string[] =>
  (['lenient', 'strict'] as const).flatMap((m) => {
    const o = e[m];
    return o.kind === 'accepted' ? o.codes : [o.code];
  });

/** Ten sam tekst bywa przykładem kilka razy (np. poprawny i błędny w innym stanie) — wybór po kodach. */
function findExample(entry: CatalogEntry, example: DocExample): CommandExample | undefined {
  const sameText = entry.examples.filter((e) => e.text === example.text || e.doc === example.text);
  if (example.codes.length > 0) return sameText.find((e) => example.codes.some((c) => codesOf(e).includes(c)));
  return sameText.find((e) => (example.mark === '✔') === (accepted(e, 'lenient') || e.lenient.kind === 'state'));
}

describe('docs/COMMANDS.md ↔ dane katalogu', () => {
  it('dokument opisuje wszystkie komendy MVP i tylko je', () => {
    expect(docEntries.map((e) => e.id)).toEqual(COMMANDS.map((c) => c.id));
  });

  it.each(docEntries.map((e) => [e.id, e] as const))('%s: nazwa i punkty regulaminu jak w dokumencie', (_id, docEntry) => {
    const entry = entryById(docEntry.id);
    expect(entry?.name).toBe(docEntry.name);
    expect(entry?.points).toEqual(docEntry.points);
  });

  const docExamples = docEntries.flatMap((e) => e.examples.map((x) => [e.id, x.raw, e, x] as const));

  it.each(docExamples)('%s: przykład z dokumentu „%s” jest w danych z tym samym wynikiem', (_id, _raw, docEntry, example) => {
    const entry = entryById(docEntry.id);
    expect(entry).toBeDefined();
    if (!entry) return;
    const data = findExample(entry, example);
    expect(data, `brak przykładu „${example.text}” w danych ${entry.id}`).toBeDefined();
    if (!data) return;

    if (example.mark === '✔') {
      if (example.mode !== 'ścisły') expect(accepted(data, 'lenient')).toBe(true);
      if (example.mode === null) expect(accepted(data, 'strict') || data.strict.kind === 'state').toBe(true);
    } else {
      if (example.mode === 'ścisły') expect(accepted(data, 'strict')).toBe(false);
      else expect(accepted(data, 'lenient') && accepted(data, 'strict')).toBe(false);
    }
    for (const code of example.codes) expect(codesOf(data)).toContain(code);
  });
});

describe('docs/COMMANDS.md, „Poza MVP” ↔ dane katalogu', () => {
  const table = doc.slice(doc.indexOf('## Poza MVP'), doc.indexOf('## Scenariusze akceptacyjne'));
  const rows = table
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.startsWith('| Komenda') && !line.startsWith('|---'))
    .map((line) => {
      const [, command = '', points = ''] = line.split('|').map((c) => c.trim());
      return { command, points, examples: [...command.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? '') };
    });

  function inRanges(point: string, spec: string): boolean {
    const [from, to = from] = point.split('–').map(Number);
    return spec.split(',').some((part) => {
      const [a, b = a] = part.trim().split('–').map(Number);
      return (from ?? NaN) >= (a ?? NaN) && (to ?? NaN) <= (b ?? NaN);
    });
  }

  const cases = rows.flatMap((row) => row.examples.map((text) => [text, row.points] as const));

  it('tabela zawiera przykłady', () => {
    expect(cases.length).toBeGreaterThan(10);
  });

  it.each(cases)('„%s” (pkt %s) jest w danych, z punktami z tabeli', (text, points) => {
    const entry = OUT_OF_SCOPE.find((e) => e.examples.some((x) => x.text === text || x.doc === text));
    expect(entry, `brak „${text}” w OUT_OF_SCOPE`).toBeDefined();
    for (const point of entry?.points ?? []) expect(inRanges(point, points), `pkt ${point} poza ${points}`).toBe(true);
  });
});
