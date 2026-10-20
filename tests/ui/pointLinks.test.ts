import { describe, expect, it } from 'vitest';
import { linkPoints } from '../../src/ui/pointLinks';

// Każde „pkt N” w interfejsie to odnośnik do strony PDF regulaminu, na której zaczyna się punkt (etap EF, K2).

const points = (text: string) => linkPoints(text).flatMap((s) => (s.kind === 'point' ? [[s.text, s.page]] : []));
const joined = (text: string) => linkPoints(text).map((s) => s.text).join('');

describe('odnośniki „pkt N”', () => {
  it('pojedynczy punkt', () => {
    expect(points('Zwrot wymaga postawy zasadniczej (pkt 11).')).toEqual([['11', 4]]);
  });

  it('lista punktów po jednym „pkt”: każdy numer osobnym odnośnikiem', () => {
    expect(points('pkt 22, 76, 83')).toEqual([
      ['22', 8],
      ['76', 28],
      ['83', 31],
    ]);
    expect(points('(pkt 22 i 30)')).toEqual([
      ['22', 8],
      ['30', 11],
    ]);
  });

  it('litera i zakres — strona pierwszego punktu', () => {
    expect(points('pkt 25b, 69')).toEqual([
      ['25b', 9],
      ['69', 26],
    ]);
    expect(points('pkt 57–59')).toEqual([['57–59', 22]]);
  });

  it('tekst bez zmian po złożeniu fragmentów', () => {
    const text = 'Z biegu nie zatrzymuje się drużyny: najpierw „Zwykły – KROK” (pkt 29), potem STÓJ (pkt 24, 30).';
    expect(joined(text)).toBe(text);
    expect(points(text)).toEqual([
      ['29', 11],
      ['24', 9],
      ['30', 11],
    ]);
  });

  it('liczby bez „pkt” i punkty spoza regulaminu nie są odnośnikami', () => {
    expect(points('Drużyna, dwa kroki – 9 żołnierzy, front 90°')).toEqual([]);
    expect(points('pkt 999')).toEqual([]);
    expect(joined('pkt 999')).toBe('pkt 999');
  });
});
