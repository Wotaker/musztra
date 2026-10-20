import { pageOfPoint } from '../core/regulation';

/** Fragment tekstu: zwykły tekst albo numer punktu regulaminu z jego stroną w PDF. */
export type TextSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'point'; readonly text: string; readonly page: number };

const NUMBER = String.raw`\d{1,3}[a-z]?(?:\s*[–-]\s*\d{1,3})?`;
/** „pkt” i lista numerów: „pkt 22, 76, 83”, „pkt 22 i 30”, „pkt 25b”, „pkt 57–59”. */
const POINTS = new RegExp(String.raw`\bpkt\.?\s+${NUMBER}(?:\s*(?:,|\bi\b|\boraz\b)\s*${NUMBER})*`, 'g');
const SINGLE = new RegExp(NUMBER, 'g');

/** Podział tekstu na fragmenty — każdy numer punktu po „pkt” staje się odnośnikiem do strony PDF. */
export function linkPoints(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const push = (segment: TextSegment) => {
    const last = segments[segments.length - 1];
    if (segment.kind === 'text' && last?.kind === 'text') segments[segments.length - 1] = { kind: 'text', text: last.text + segment.text };
    else if (segment.text !== '') segments.push(segment);
  };
  let cursor = 0;
  for (const match of text.matchAll(POINTS)) {
    const start = match.index;
    push({ kind: 'text', text: text.slice(cursor, start) });
    let inner = 0;
    for (const number of match[0].matchAll(SINGLE)) {
      push({ kind: 'text', text: match[0].slice(inner, number.index) });
      const page = pageOfPoint(number[0]);
      push(page === null ? { kind: 'text', text: number[0] } : { kind: 'point', text: number[0], page });
      inner = number.index + number[0].length;
    }
    push({ kind: 'text', text: match[0].slice(inner) });
    cursor = start + match[0].length;
  }
  push({ kind: 'text', text: text.slice(cursor) });
  return segments;
}
