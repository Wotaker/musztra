/**
 * Krok 1 potoku (SPEC 4.3): podział tekstu komendy na słowa i znaki oraz postać złożona,
 * na której działa gramatyka. Mapa pozycji pozwala wskazać błąd w oryginalnym tekście.
 */

export type TokenKind = 'word' | 'comma' | 'dash' | 'other';

export interface Token {
  readonly kind: TokenKind;
  /** Tekst w oryginalnej postaci. */
  readonly text: string;
  /** Postać złożona: małe litery, bez znaków diakrytycznych, myślnik jako „-”. */
  readonly folded: string;
  /** Pozycja w tekście wejściowym (indeksy znaków, koniec wyłącznie). */
  readonly start: number;
  readonly end: number;
}

export interface Span {
  readonly start: number;
  readonly end: number;
}

export interface NormalizedInput {
  readonly input: string;
  readonly tokens: readonly Token[];
  /** Tekst dla gramatyki: każde słowo i znak w postaci złożonej, z jedną spacją na końcu. */
  readonly folded: string;
  /** Początek każdego słowa w tekście `folded`. */
  readonly foldedStarts: readonly number[];
  /** Kropka lub wykrzyknik na końcu komendy (pomijane przy rozbiorze). */
  readonly trailingPunctuation: Span | null;
}

/** Wszystkie znaki traktowane jako myślnik (COMMANDS 0.1: dowolny myślnik). */
const DASHES = '-–—−‐‑‒';
const DIACRITICS = /\p{M}/gu;

/** Postać złożona słowa: małe litery, bez polskich znaków (także ł), myślniki ujednolicone. */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase('pl')
    .replaceAll('ł', 'l')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(new RegExp(`[${DASHES}]+`, 'g'), '-');
}

/** Usuwa znaki diakrytyczne, zachowując wielkość liter (do porównań w kontroli formy). */
export function stripDiacritics(text: string): string {
  return text.replaceAll('ł', 'l').replaceAll('Ł', 'L').normalize('NFD').replace(DIACRITICS, '');
}

const TOKEN_PATTERN = new RegExp(`([\\p{L}\\p{M}]+)|(\\p{Nd}+)|(,)|([${DASHES}]+)|(\\S)`, 'gu');

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  for (const match of input.matchAll(TOKEN_PATTERN)) {
    const text = match[0];
    const start = match.index;
    let kind: TokenKind;
    if (match[1] !== undefined || match[2] !== undefined) kind = 'word';
    else if (match[3] !== undefined) kind = 'comma';
    else if (match[4] !== undefined) kind = 'dash';
    else kind = 'other';
    tokens.push({ kind, text, folded: fold(text), start, end: start + text.length });
  }
  return tokens;
}

export function normalize(input: string): NormalizedInput {
  const all = tokenize(input);
  // Kropka lub wykrzyknik po ostatnim słowie nie należą do komendy.
  let cut = all.length;
  while (cut > 0 && all[cut - 1]?.kind === 'other' && /^[.!]$/.test(all[cut - 1]?.text ?? '')) cut--;
  const tokens = all.slice(0, cut);
  const first = all[cut];
  const last = all[all.length - 1];
  const trailingPunctuation = first && last ? { start: first.start, end: last.end } : null;

  const foldedStarts: number[] = [];
  let folded = '';
  for (const token of tokens) {
    foldedStarts.push(folded.length);
    folded += `${token.folded} `;
  }
  return { input, tokens, folded, foldedStarts, trailingPunctuation };
}

/** Indeks słowa zawierającego pozycję `pos` tekstu złożonego; `tokens.length` dla końca tekstu. */
export function tokenIndexAt(normalized: NormalizedInput, pos: number): number {
  const { foldedStarts } = normalized;
  let index = 0;
  while (index + 1 < foldedStarts.length && (foldedStarts[index + 1] ?? Infinity) <= pos) index++;
  if (foldedStarts.length === 0 || pos >= normalized.folded.length) return foldedStarts.length;
  return index;
}

/** Fragment oryginalnego tekstu od słowa `from` do słowa `to` (włącznie). */
export function spanOfTokens(normalized: NormalizedInput, from: number, to: number = from): Span {
  const { tokens, input } = normalized;
  const a = tokens[from];
  const b = tokens[Math.min(to, tokens.length - 1)];
  if (!a || !b) return { start: input.trimEnd().length, end: input.trimEnd().length };
  return { start: a.start, end: b.end };
}
