import type { MessageCode } from '../messages';
import { fold, stripDiacritics, type NormalizedInput, type Span, type Token } from './normalize';
import type { CanonicalItem, WordRole } from './parse';

/**
 * Krok 3 potoku (SPEC 4.3): forma kanoniczna komendy i kontrola formy. W trybie ścisłym każda
 * rozbieżność to osobny błąd (E_STRICT_FORM albo E_GRAMMAR_AGREEMENT), w łagodnym — informacja
 * I_NORMALIZED z formą kanoniczną.
 */

export type FormIssueKind =
  | 'case-executive'
  | 'case-first'
  | 'case-surname'
  | 'case-preparatory'
  | 'diacritics'
  | 'digits'
  | 'agreement'
  | 'extra-word'
  | 'missing-addressee'
  | 'missing-word'
  | 'missing-comma'
  | 'missing-dash'
  | 'comma-instead-of-dash'
  | 'dash-instead-of-comma'
  | 'extra-separator'
  | 'dash-spacing'
  | 'trailing-punctuation';

export interface FormIssue {
  readonly kind: FormIssueKind;
  readonly code: Extract<MessageCode, 'E_STRICT_FORM' | 'E_GRAMMAR_AGREEMENT'>;
  readonly message: string;
  readonly span: Span;
  /** Dla rozbieżności w słowach: forma kanoniczna i wpisana. */
  readonly expected?: string;
  readonly found?: string;
}

interface CanonicalWord {
  readonly text: string;
  readonly role: WordRole;
  readonly tokens: readonly number[];
  /** Separator przed słowem w formie kanonicznej. */
  readonly before: '' | ' ' | ', ' | ' – ';
}

function cased(text: string, role: WordRole): string {
  if (role === 'exec') return text.toLocaleUpperCase('pl');
  if (role === 'proper') return text.charAt(0).toLocaleUpperCase('pl') + text.slice(1);
  return text;
}

/** Słowa formy kanonicznej z wielkością liter i separatorami (COMMANDS 0.1). */
export function canonicalWords(items: readonly CanonicalItem[]): CanonicalWord[] {
  const words: CanonicalWord[] = [];
  let pending: 'auto' | 'none' | null = null;
  for (const item of items) {
    if (item.kind === 'sep') {
      if (pending !== 'auto') pending = item.style;
      continue;
    }
    if (item.kind === 'drop') continue;
    let before: CanonicalWord['before'] = words.length === 0 ? '' : ' ';
    if (words.length > 0 && pending === 'auto') before = item.role === 'exec' ? ' – ' : ', ';
    let text = cased(item.text, item.role);
    if (words.length === 0) text = text.charAt(0).toLocaleUpperCase('pl') + text.slice(1);
    words.push({ text, role: item.role, tokens: item.tokens, before });
    pending = null;
  }
  return words;
}

export function renderCanonical(items: readonly CanonicalItem[]): string {
  return canonicalWords(items)
    .map((w) => w.before + w.text)
    .join('');
}

function q(text: string): string {
  return `„${text}”`;
}

function wordMessage(kind: FormIssueKind, expected: string, found: string): string {
  switch (kind) {
    case 'digits':
      return `Liczebnik słownie: ${q(expected)} zamiast ${q(found)}.`;
    case 'agreement':
      return `Odmiana: ${q(expected)} zamiast ${q(found)}.`;
    case 'case-executive':
      return `Hasło wielkimi literami: ${q(expected)}.`;
    case 'case-first':
      return `Komenda zaczyna się wielką literą: ${q(expected)}.`;
    case 'case-surname':
      return `Nazwisko wielką literą: ${q(expected)}.`;
    case 'case-preparatory':
      return `Zapowiedź małymi literami: ${q(expected)} zamiast ${q(found)}.`;
    default:
      return `Polskie znaki: ${q(expected)} zamiast ${q(found)}.`;
  }
}

function wordIssue(kind: FormIssueKind, token: Token, expected: string): FormIssue {
  return {
    kind,
    code: kind === 'agreement' ? 'E_GRAMMAR_AGREEMENT' : 'E_STRICT_FORM',
    span: { start: token.start, end: token.end },
    message: wordMessage(kind, expected, token.text),
    expected,
    found: token.text,
  };
}

function wordIssues(word: CanonicalWord, token: Token, isFirst: boolean): FormIssue[] {
  const original = token.text;
  const expected = word.text;
  if (original === expected) return [];
  if (/^\p{Nd}+$/u.test(original)) return [wordIssue('digits', token, expected)];
  if (fold(original) !== fold(expected)) return [wordIssue('agreement', token, expected)];
  const issues: FormIssue[] = [];
  const plainOriginal = stripDiacritics(original);
  const plainExpected = stripDiacritics(expected);
  if (plainOriginal !== plainExpected) {
    let kind: FormIssueKind = 'case-preparatory';
    if (word.role === 'exec') kind = 'case-executive';
    else if (isFirst && plainOriginal.slice(1) === plainExpected.slice(1)) kind = 'case-first';
    else if (word.role === 'proper') kind = 'case-surname';
    issues.push(wordIssue(kind, token, expected));
  }
  if (original.toLocaleLowerCase('pl') !== expected.toLocaleLowerCase('pl')) issues.push(wordIssue('diacritics', token, expected));
  return issues;
}

const MERGEABLE: ReadonlySet<FormIssueKind> = new Set(['case-executive', 'case-preparatory', 'diacritics', 'agreement']);

/** Sąsiednie słowa z tą samą rozbieżnością (np. „rozejsc sie”) to jeden komunikat. */
function mergeAdjacent(issues: readonly FormIssue[], input: string): FormIssue[] {
  const merged: FormIssue[] = [];
  for (const issue of issues) {
    const previous = merged.findLast((m) => m.kind === issue.kind);
    const adjacent =
      previous !== undefined &&
      MERGEABLE.has(issue.kind) &&
      previous.expected !== undefined &&
      issue.expected !== undefined &&
      previous.span.end <= issue.span.start &&
      input.slice(previous.span.end, issue.span.start).trim() === '';
    if (adjacent) {
      const expected = `${previous.expected ?? ''} ${issue.expected ?? ''}`;
      const found = input.slice(previous.span.start, issue.span.end);
      merged[merged.indexOf(previous)] = {
        ...previous,
        span: { start: previous.span.start, end: issue.span.end },
        message: wordMessage(issue.kind, expected, found),
        expected,
        found,
      };
    } else {
      merged.push(issue);
    }
  }
  return merged;
}

function separatorIssues(normalized: NormalizedInput, previous: CanonicalWord, word: CanonicalWord): FormIssue[] {
  const { tokens, input } = normalized;
  const lastOfPrevious = previous.tokens[previous.tokens.length - 1];
  const firstOfWord = word.tokens[0];
  if (lastOfPrevious === undefined || firstOfWord === undefined) return [];
  const a = tokens[lastOfPrevious];
  const b = tokens[firstOfWord];
  if (!a || !b) return [];
  const between = tokens.slice(lastOfPrevious + 1, firstOfWord).filter((t) => t.kind !== 'word');
  const commas = between.filter((t) => t.kind === 'comma');
  const dashes = between.filter((t) => t.kind === 'dash');
  const gap = { start: a.end, end: b.start };
  const gapSpan = gap.end > gap.start ? gap : { start: b.start, end: b.end };
  const sepSpan = (list: readonly Token[]) => {
    const first = list[0];
    const last = list[list.length - 1];
    return first && last ? { start: first.start, end: last.end } : gapSpan;
  };
  const pair = q(`${previous.text}${word.before}${word.text}`);

  if (word.before === ' – ') {
    if (dashes.length === 0 && commas.length === 0) {
      return [{ kind: 'missing-dash', code: 'E_STRICT_FORM', span: gapSpan, message: `Brak myślnika przed hasłem: ${pair}.` }];
    }
    if (dashes.length === 0) {
      return [{ kind: 'comma-instead-of-dash', code: 'E_STRICT_FORM', span: sepSpan(commas), message: `Przed hasłem myślnik, nie przecinek: ${pair}.` }];
    }
    const issues: FormIssue[] = [];
    if (commas.length > 0 || dashes.length > 1) {
      issues.push({ kind: 'extra-separator', code: 'E_STRICT_FORM', span: sepSpan(between), message: `Przed hasłem tylko jeden myślnik: ${pair}.` });
    }
    const dash = dashes[0];
    if (dash && (!/\s/.test(input.slice(a.end, dash.start)) || !/\s/.test(input.slice(dash.end, b.start)))) {
      issues.push({ kind: 'dash-spacing', code: 'E_STRICT_FORM', span: sepSpan(dashes), message: `Myślnik otoczony spacjami: ${pair}.` });
    }
    return issues;
  }
  if (word.before === ', ') {
    if (commas.length === 0 && dashes.length === 0) {
      return [{ kind: 'missing-comma', code: 'E_STRICT_FORM', span: gapSpan, message: `Brak przecinka: ${pair}.` }];
    }
    if (commas.length === 0) {
      return [{ kind: 'dash-instead-of-comma', code: 'E_STRICT_FORM', span: sepSpan(dashes), message: `Przecinek zamiast myślnika: ${pair}.` }];
    }
    if (commas.length > 1 || dashes.length > 0) {
      return [{ kind: 'extra-separator', code: 'E_STRICT_FORM', span: sepSpan(between), message: `Tylko jeden przecinek: ${pair}.` }];
    }
    return [];
  }
  if (between.length > 0) {
    const marks = between.map((t) => t.text).join(' ');
    return [{ kind: 'extra-separator', code: 'E_STRICT_FORM', span: sepSpan(between), message: `Zbędny znak ${q(marks)}: ${pair}.` }];
  }
  return [];
}

/** Rozbieżności między wpisanym tekstem a formą kanoniczną, każda osobno, w kolejności tekstu. */
export function formIssues(normalized: NormalizedInput, items: readonly CanonicalItem[]): FormIssue[] {
  const words = canonicalWords(items);
  const issues: FormIssue[] = [];
  const endOfInput = normalized.input.trimEnd().length;

  words.forEach((word, index) => {
    const previous = words[index - 1];
    if (previous) issues.push(...separatorIssues(normalized, previous, word));
    const tokenIndex = word.tokens[0];
    const token = tokenIndex === undefined ? undefined : normalized.tokens[tokenIndex];
    if (!token) {
      const next = words.slice(index + 1).find((w) => w.tokens.length > 0);
      const at = next?.tokens[0] === undefined ? endOfInput : (normalized.tokens[next.tokens[0]]?.start ?? endOfInput);
      const nextToken = next?.tokens[0] === undefined ? undefined : normalized.tokens[next.tokens[0]];
      const span = nextToken ? { start: nextToken.start, end: nextToken.end } : { start: at, end: at };
      const missingAddressee = index === 0 && word.role === 'plain';
      issues.push(
        missingAddressee
          ? {
              kind: 'missing-addressee',
              code: 'E_STRICT_FORM',
              span,
              message: `Brak adresata: regulamin podaje ${q(renderCanonical(items))} (pkt 100).`,
            }
          : { kind: 'missing-word', code: 'E_STRICT_FORM', span, message: `Brakuje słowa ${q(word.text)}.` },
      );
      return;
    }
    issues.push(...wordIssues(word, token, index === 0));
  });

  for (const item of items) {
    if (item.kind !== 'drop') continue;
    for (const t of item.tokens) {
      const token = normalized.tokens[t];
      if (token) {
        issues.push({
          kind: 'extra-word',
          code: 'E_STRICT_FORM',
          span: { start: token.start, end: token.end },
          message: `Zbędne słowo ${q(token.text)} — jeden krok to ${q('krok')}.`,
        });
      }
    }
  }

  if (normalized.trailingPunctuation) {
    issues.push({
      kind: 'trailing-punctuation',
      code: 'E_STRICT_FORM',
      span: normalized.trailingPunctuation,
      message: 'Komenda bez kropki i wykrzyknika na końcu.',
    });
  }
  return mergeAdjacent(
    issues.sort((x, y) => x.span.start - y.span.start),
    normalized.input,
  );
}
