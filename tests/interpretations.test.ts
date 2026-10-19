import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INTERPRETATIONS } from '../src/core/interpretations';

// Interpretacje I-1…I-17 (SPEC 11) są w kodzie zebrane w jednym module, każda jako osobna reguła.
// Test pilnuje, by lista w kodzie odpowiadała tabeli w SPEC.md.

const spec = readFileSync(join(import.meta.dirname, '..', 'docs', 'SPEC.md'), 'utf8');
const rows = [...spec.matchAll(/^\| (I-\d+) \| (.+?) \| (.+?) \|$/gm)].map((m) => ({ id: m[1], situation: m[2] }));

describe('interpretacje regulaminu (SPEC 11)', () => {
  it('SPEC 11 zawiera 17 interpretacji', () => {
    expect(rows).toHaveLength(17);
  });

  it('każda interpretacja ze SPEC ma wpis w module interpretacji, w tej samej kolejności', () => {
    expect(INTERPRETATIONS.map((i) => i.id)).toEqual(rows.map((r) => r.id));
  });

  it('opisy sytuacji zgodne ze SPEC (bez formatowania)', () => {
    const plain = (t: string | undefined) => (t ?? '').replace(/[`*]/g, '');
    for (const row of rows) {
      expect(plain(INTERPRETATIONS.find((i) => i.id === row.id)?.situation)).toBe(plain(row.situation));
    }
  });
});
