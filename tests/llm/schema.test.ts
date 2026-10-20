import { describe, expect, it } from 'vitest';
import { EXPLANATION_SCHEMA, parseExplanation, partialExplanation } from '../../src/llm/schema';

// Odpowiedź LLM (SPEC 8.2): JSON { explanation, suggestion, regulationPoints }, walidowany schematem.

describe('walidacja odpowiedzi LLM', () => {
  it('przyjmuje poprawny JSON i porządkuje punkty regulaminu', () => {
    const parsed = parseExplanation(
      JSON.stringify({ explanation: '  Zwrot wymaga postawy zasadniczej (pkt 11).  ', suggestion: 'BACZNOŚĆ', regulationPoints: [11, 22, 11] }),
    );
    expect(parsed).toEqual({ explanation: 'Zwrot wymaga postawy zasadniczej (pkt 11).', suggestion: 'BACZNOŚĆ', regulationPoints: [11, 22] });
  });

  it('propozycja może być pusta (null albo pusty napis)', () => {
    expect(parseExplanation('{"explanation":"Nie wiem.","suggestion":null,"regulationPoints":[]}')?.suggestion).toBeNull();
    expect(parseExplanation('{"explanation":"Nie wiem.","suggestion":"  ","regulationPoints":[]}')?.suggestion).toBeNull();
  });

  it('pomija punkty spoza regulaminu (1–130) i liczby niecałkowite', () => {
    const parsed = parseExplanation('{"explanation":"Tekst.","suggestion":null,"regulationPoints":[0,11,131,22.5,-3,69]}');
    expect(parsed?.regulationPoints).toEqual([11, 69]);
  });

  it.each([
    ['tekst, który nie jest JSON-em', 'To nie jest JSON'],
    ['brak objaśnienia', '{"suggestion":null,"regulationPoints":[]}'],
    ['puste objaśnienie', '{"explanation":"   ","suggestion":null,"regulationPoints":[]}'],
    ['objaśnienie nie jest napisem', '{"explanation":5,"suggestion":null,"regulationPoints":[]}'],
    ['propozycja nie jest napisem', '{"explanation":"Tekst.","suggestion":7,"regulationPoints":[]}'],
    ['punkty nie są tablicą', '{"explanation":"Tekst.","suggestion":null,"regulationPoints":"11"}'],
    ['tablica zamiast obiektu', '[1,2,3]'],
    ['ucięty JSON', '{"explanation":"Tekst'],
  ])('odrzuca odpowiedź: %s', (_name, text) => {
    expect(parseExplanation(text)).toBeNull();
  });

  it('odrzuca zbyt długie objaśnienie i zbyt długą propozycję', () => {
    const long = 'a'.repeat(3000);
    expect(parseExplanation(JSON.stringify({ explanation: long, suggestion: null, regulationPoints: [] }))).toBeNull();
    expect(parseExplanation(JSON.stringify({ explanation: 'Tekst.', suggestion: long, regulationPoints: [] }))).toBeNull();
  });

  it('schemat JSON wymaga wszystkich trzech pól i nie dopuszcza innych', () => {
    expect(EXPLANATION_SCHEMA.required).toEqual(['explanation', 'suggestion', 'regulationPoints']);
    expect(EXPLANATION_SCHEMA.additionalProperties).toBe(false);
  });
});

describe('strumieniowe objaśnienie z niepełnego JSON-a', () => {
  const full = JSON.stringify({
    explanation: 'Komenda „W prawo – ZWROT” wymaga postawy zasadniczej.\nNajpierw podaj „BACZNOŚĆ” (pkt 11).',
    suggestion: 'BACZNOŚĆ',
    regulationPoints: [11],
  });

  it('każdy początek odpowiedzi daje początek objaśnienia', () => {
    const explanation = (JSON.parse(full) as { explanation: string }).explanation;
    let previous = '';
    for (let i = 0; i <= full.length; i++) {
      const partial = partialExplanation(full.slice(0, i));
      expect(explanation.startsWith(partial), `prefiks ${String(i)}: ${partial}`).toBe(true);
      expect(partial.length).toBeGreaterThanOrEqual(previous.length);
      previous = partial;
    }
    expect(previous).toBe(explanation);
  });

  it('dekoduje sekwencje \\u i \\" dopiero, gdy są kompletne', () => {
    expect(partialExplanation('{"explanation":"Za\\u01')).toBe('Za');
    expect(partialExplanation('{"explanation":"Za\\u0142o')).toBe('Zało');
    expect(partialExplanation('{"explanation":"Hasło \\"ZWROT')).toBe('Hasło "ZWROT');
    expect(partialExplanation('{"explanation":"Hasło \\')).toBe('Hasło ');
  });

  it('bez pola explanation zwraca pusty tekst', () => {
    expect(partialExplanation('')).toBe('');
    expect(partialExplanation('{"suggestion":"BACZNOŚĆ"')).toBe('');
  });
});
