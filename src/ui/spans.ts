import type { Span } from '../core/grammar/normalize';

/** Fragmenty tekstu do podkreślenia: zakresy błędów scalone i posortowane. */
export function mergeSpans(spans: readonly Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, span.end) };
    else merged.push({ ...span });
  }
  return merged;
}
