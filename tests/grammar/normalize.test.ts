import { describe, expect, it } from 'vitest';
import { fold, normalize, spanOfTokens, stripDiacritics, tokenIndexAt, tokenize } from '../../src/core/grammar/normalize';

describe('normalizacja (SPEC 4.3, krok 1)', () => {
  it('postać złożona: małe litery, bez polskich znaków, także ł', () => {
    expect(fold('ROZEJŚĆ SIĘ')).toBe('rozejsc sie');
    expect(fold('ŁĄCZ')).toBe('lacz');
    expect(fold('Zbiórka')).toBe('zbiorka');
    expect(fold('Źdźbło żółć')).toBe('zdzblo zolc');
  });

  it('wszystkie rodzaje myślnika są ujednolicone', () => {
    for (const dash of ['-', '–', '—', '−']) expect(fold(dash)).toBe('-');
  });

  it('usuwanie znaków diakrytycznych zachowuje wielkość liter', () => {
    expect(stripDiacritics('ŁĄCZ')).toBe('LACZ');
    expect(stripDiacritics('Stępnia')).toBe('Stepnia');
  });

  it('podział na słowa, przecinki i myślniki z pozycjami w tekście', () => {
    const tokens = tokenize('Drużyna,w prawo–ZWROT');
    expect(tokens.map((t) => [t.kind, t.text, t.start, t.end])).toEqual([
      ['word', 'Drużyna', 0, 7],
      ['comma', ',', 7, 8],
      ['word', 'w', 8, 9],
      ['word', 'prawo', 10, 15],
      ['dash', '–', 15, 16],
      ['word', 'ZWROT', 16, 21],
    ]);
  });

  it('cyfry są osobnym słowem, także sklejone z literami', () => {
    expect(tokenize('5kroków').map((t) => t.text)).toEqual(['5', 'kroków']);
  });

  it('nadmiarowe spacje nie mają znaczenia', () => {
    expect(normalize('   W   prawo  –   ZWROT  ').folded).toBe('w prawo - zwrot ');
  });

  it('kropka lub wykrzyknik na końcu są pomijane, ale zapamiętane', () => {
    const n = normalize('BACZNOŚĆ!');
    expect(n.folded).toBe('bacznosc ');
    expect(n.trailingPunctuation).toEqual({ start: 8, end: 9 });
    expect(normalize('BACZNOŚĆ').trailingPunctuation).toBeNull();
  });

  it('mapa pozycji: z tekstu złożonego do słowa i z powrotem do oryginału', () => {
    const n = normalize('Drużyna, w szereg – ZBIÓRKA');
    // „drużyna , w szereg - zbiórka ”: słowo „szereg” zaczyna się na pozycji 12 tekstu złożonego.
    expect(n.folded).toBe('druzyna , w szereg - zbiorka ');
    expect(tokenIndexAt(n, 12)).toBe(3);
    expect(spanOfTokens(n, 2, 3)).toEqual({ start: 9, end: 17 });
    expect(n.input.slice(9, 17)).toBe('w szereg');
    expect(tokenIndexAt(n, n.folded.length)).toBe(n.tokens.length);
  });
});
