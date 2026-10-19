import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Strażnik zasady z CLAUDE.md: src/core to czysty TypeScript, bez DOM, Reacta i sieci,
// i nie importuje niczego z render, ui ani llm. Uzupełnia regułę ESLint i tsconfig.core.json.

const root = join(import.meta.dirname, '..');
const coreDir = join(root, 'src', 'core');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function importsOf(source: string): string[] {
  const pattern = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [...source.matchAll(pattern)].map((m) => m[1] ?? m[2] ?? '');
}

describe('architektura warstw', () => {
  const files = sourceFiles(coreDir);

  it('src/core zawiera kod do sprawdzenia', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [relative(root, f), f]))('%s nie importuje z render, ui, llm ani Reacta', (_name, file) => {
    const forbidden = importsOf(readFileSync(file, 'utf8')).filter(
      (spec) => /(^|\/)(render|ui|llm)(\/|$)/.test(spec) || /^(react|react-dom|zustand)(\/|$)/.test(spec),
    );
    expect(forbidden).toEqual([]);
  });

  it.each(files.map((f) => [relative(root, f), f]))('%s nie korzysta z DOM, sieci ani niezasianej losowości', (_name, file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/\b(window|document|fetch|localStorage|requestAnimationFrame)\b/);
    expect(source).not.toMatch(/Math\.random|Date\.now/);
  });
});
