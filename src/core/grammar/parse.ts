import * as ohm from 'ohm-js';
import {
  COMMANDS,
  COUNT_OFF_RANGE,
  entryByRule,
  MAX_STEPS,
  NUMERALS,
  OTHER_UNIT_ORDINALS,
  OTHER_UNITS,
  SQUAD_ORDINALS,
  stepsNoun,
  TERRAIN_OBJECTS,
  type CatalogEntry,
  type SquadOrdinal,
  type TerrainObjectId,
} from '../catalog';
import { RANK, SURNAMES } from '../roster/names';
import type {
  Addressee,
  CommandAst,
  FormationName,
  MarchDirection,
  ParsedCommand,
  ShiftDirection,
  Side,
  SoldierRef,
  TurnDirection,
} from './ast';
import grammarSource from './musztra.ohm?raw';
import { fold, normalize, spanOfTokens, tokenIndexAt, type NormalizedInput, type Span } from './normalize';

/**
 * Krok 2 potoku (SPEC 4.3): rozbiór komendy gramatyką `musztra.ohm` do typowanego drzewa składni
 * albo diagnoza błędu składni. Dodatkowo ciąg słów formy kanonicznej (do kontroli formy).
 */

// ---------------------------------------------------------------------------- wczytanie gramatyki

/** Literał gramatyki w postaci złożonej: dopasowuje się do całego słowa w tekście złożonym. */
function literal(text: string): string {
  return JSON.stringify(`${fold(text)} `);
}

function alternatives(words: readonly string[]): string {
  const unique = [...new Set(words.map((w) => fold(w)))];
  return unique.map(literal).join(' | ');
}

const DIGITS = (from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

const numeralsIn = (min: number, max: number) => NUMERALS.filter((n) => n.value >= min && n.value <= max);

/** Opisy slotów — klucze opisów reguł gramatyki słownictwa i ich czytelna postać w komunikatach. */
const SLOT_DESCRIPTIONS: Readonly<Record<string, string>> = {
  obiekt: `nazwa obiektu (${TERRAIN_OBJECTS.map((o) => o.genitive).join(', ')})`,
  kroki: 'liczba kroków (krok, dwa kroki … dziesięć kroków)',
  liczebnik: `liczebnik w dopełniaczu (${numeralsIn(COUNT_OFF_RANGE.min, COUNT_OFF_RANGE.max)
    .map((n) => n.genitive)
    .join(', ')})`,
  nazwisko: 'nazwisko żołnierza w dopełniaczu',
};

/** Gramatyka słownictwa, generowana z danych katalogu — jedno źródło list obiektów, liczebników itd. */
export const LEXICON_SOURCE = `MusztraLexicon {
  squadOrdinal = ${alternatives(SQUAD_ORDINALS.map((o) => o.word))}
  terrainObject (obiekt) = ${alternatives(TERRAIN_OBJECTS.flatMap((o) => [o.genitive, o.nominative]))}
  stepNumeral (kroki) = ${alternatives([...numeralsIn(1, MAX_STEPS).flatMap((n) => [n.nominative, n.genitive]), ...DIGITS(1, MAX_STEPS)])}
  countNumeral (liczebnik) = ${alternatives([
    ...numeralsIn(COUNT_OFF_RANGE.min, COUNT_OFF_RANGE.max).flatMap((n) => [n.genitive, n.nominative]),
    ...DIGITS(COUNT_OFF_RANGE.min, COUNT_OFF_RANGE.max),
  ])}
  surname (nazwisko) = letter+ " "
  unitNoun = ${alternatives(OTHER_UNITS)}
  unitOrdinal = ${alternatives(OTHER_UNIT_ORDINALS)}
  anyWord = (~" " any)+ " "
}`;

const STRING_LITERAL = /"((?:[^"\\]|\\.)*)"/g;

/** Literały `musztra.ohm` w zapisie źródłowym (forma kanoniczna). */
export const GRAMMAR_LITERALS: readonly string[] = [...grammarSource.matchAll(STRING_LITERAL)].map((m) => m[1] ?? '');

/** `musztra.ohm` z literałami w postaci złożonej (zob. komentarz na początku pliku gramatyki). */
export const COMPILED_GRAMMAR_SOURCE = grammarSource.replace(STRING_LITERAL, (_m, text: string) => literal(text));

const lexicon = ohm.grammar(LEXICON_SOURCE);
export const grammar = ohm.grammar(COMPILED_GRAMMAR_SOURCE, { MusztraLexicon: lexicon });

/** Nazwy reguł zdefiniowanych w gramatyce komend i słownictwa (bez reguł wbudowanych Ohm). */
export function definedRules(): string[] {
  const own = (g: ohm.Grammar) => Object.keys(g.rules).filter((name) => Object.hasOwn(g.rules, name));
  return [...own(grammar), ...own(lexicon)];
}

// ---------------------------------------------------------------------------- słownik form

/** Słowo w postaci złożonej → pisownia kanoniczna (małe litery, polskie znaki). */
const DICTIONARY = new Map<string, Set<string>>();

function addWords(text: string): void {
  for (const word of text.split(/\s+/)) {
    if (!/\p{L}/u.test(word)) continue;
    const key = fold(word);
    const lower = word.toLocaleLowerCase('pl');
    const set = DICTIONARY.get(key) ?? new Set<string>();
    set.add(lower);
    DICTIONARY.set(key, set);
  }
}

GRAMMAR_LITERALS.forEach(addWords);
SQUAD_ORDINALS.forEach((o) => {
  addWords(o.word);
});
TERRAIN_OBJECTS.forEach((o) => {
  addWords(`${o.nominative} ${o.genitive}`);
});
NUMERALS.forEach((n) => {
  addWords(`${n.nominative} ${n.genitive}`);
});
OTHER_UNITS.forEach(addWords);
OTHER_UNIT_ORDINALS.forEach(addWords);
addWords(`${RANK.nominative} ${RANK.genitive}`);

/** Słowa, które w postaci złożonej mają więcej niż jedną pisownię (test: lista ma być pusta). */
export function dictionaryCollisions(): string[][] {
  return [...DICTIONARY.values()].filter((set) => set.size > 1).map((set) => [...set]);
}

function canonicalWord(foldedWord: string): string {
  const set = DICTIONARY.get(foldedWord);
  return set ? ([...set][0] ?? foldedWord) : foldedWord;
}

/** Literały zapisane w gramatyce wielkimi literami to hasła; literał złożony → pisownia źródłowa. */
const LITERAL_DISPLAY = new Map<string, Set<string>>();
for (const raw of GRAMMAR_LITERALS) {
  const key = `${fold(raw)} `;
  const set = LITERAL_DISPLAY.get(key) ?? new Set<string>();
  set.add(raw);
  LITERAL_DISPLAY.set(key, set);
}

const isUpper = (text: string) => text === text.toLocaleUpperCase('pl') && text !== text.toLocaleLowerCase('pl');

/** Czy literał w postaci złożonej występuje w gramatyce wyłącznie jako hasło. */
function isExecutiveLiteral(foldedLiteral: string): boolean {
  const raws = LITERAL_DISPLAY.get(foldedLiteral);
  return raws !== undefined && [...raws].every(isUpper);
}

function displayLiteral(foldedLiteral: string): string {
  const raws = [...(LITERAL_DISPLAY.get(foldedLiteral) ?? [])];
  if (raws.length === 0) return foldedLiteral.trim();
  return raws.every(isUpper) ? (raws[0] ?? '') : (raws.find((r) => !isUpper(r)) ?? '').toLocaleLowerCase('pl');
}

// ---------------------------------------------------------------------------- dane słownictwa

const OBJECT_BY_FORM = new Map<string, { id: TerrainObjectId; genitive: string }>();
for (const o of TERRAIN_OBJECTS) {
  OBJECT_BY_FORM.set(fold(o.nominative), { id: o.id, genitive: o.genitive });
  OBJECT_BY_FORM.set(fold(o.genitive), { id: o.id, genitive: o.genitive });
}

const NUMERAL_BY_FORM = new Map<string, number>();
for (const n of NUMERALS) {
  NUMERAL_BY_FORM.set(fold(n.nominative), n.value);
  NUMERAL_BY_FORM.set(fold(n.genitive), n.value);
  NUMERAL_BY_FORM.set(String(n.value), n.value);
}

const SURNAME_BY_FORM = new Map<string, { nominative: string; genitive: string }>();
for (const s of SURNAMES) {
  SURNAME_BY_FORM.set(fold(s.nominative), s);
  SURNAME_BY_FORM.set(fold(s.genitive), s);
}

const ORDINAL_BY_WORD = new Map<string, SquadOrdinal>(SQUAD_ORDINALS.map((o) => [fold(o.word), o.value]));

// ---------------------------------------------------------------------------- forma kanoniczna

/** Rola słowa w komendzie decyduje o wielkości liter formy kanonicznej (COMMANDS 0.1). */
export type WordRole = 'plain' | 'exec' | 'proper';

/**
 * Element formy kanonicznej. Słowo wskazuje słowa tekstu wejściowego, które zastępuje
 * (puste — słowo dopisane, np. brakujący adresat). Separator `auto` to przecinek albo myślnik
 * (myślnik przed hasłem), `none` — miejsce bez znaku.
 */
export type CanonicalItem =
  | { readonly kind: 'word'; readonly text: string; readonly role: WordRole; readonly tokens: readonly number[] }
  | { readonly kind: 'sep'; readonly style: 'auto' | 'none'; readonly tokens: readonly number[] }
  | { readonly kind: 'drop'; readonly tokens: readonly number[] };

interface Ops {
  items(role: WordRole): CanonicalItem[];
  ast(): ParsedCommand;
  addressee(): Addressee;
  soldier(): { ref: SoldierRef; side: Side | null };
  rules(): string[];
}

const op = (node: ohm.Node): Ops => node as unknown as Ops;
const opt = (node: ohm.Node): ohm.Node | undefined => node.children[0];
const key = (node: ohm.Node): string => node.sourceString.trim();

/** Rozbiór bieżącej komendy — operacje semantyczne potrzebują mapy pozycji słów. */
let current: NormalizedInput | null = null;

function tokensOf(node: ohm.Node): number[] {
  if (!current || node.sourceString.trim() === '') return [];
  const first = tokenIndexAt(current, node.source.startIdx);
  const count = node.sourceString.trim().split(' ').length;
  return Array.from({ length: count }, (_, i) => first + i);
}

function word(text: string, role: WordRole, tokens: readonly number[]): CanonicalItem {
  return { kind: 'word', text, role, tokens };
}

const semantics = grammar.createSemantics();

semantics.addOperation<CanonicalItem[]>('items(role)', {
  _nonterminal(...children) {
    const role = (this.args as { role: WordRole }).role;
    return children.flatMap((c) => op(c).items(role));
  },
  _iter(...children) {
    const role = (this.args as { role: WordRole }).role;
    return children.flatMap((c) => op(c).items(role));
  },
  _terminal() {
    const role = (this.args as { role: WordRole }).role;
    const tokens = tokensOf(this);
    return key(this)
      .split(' ')
      .filter((w) => w !== '')
      .map((w, i) => word(canonicalWord(w), role, tokens.slice(i, i + 1)));
  },
  Exec(inner) {
    return op(inner).items('exec');
  },
  Sep(_mark) {
    return [{ kind: 'sep', style: 'auto', tokens: tokensOf(this) }];
  },
  Gap(_mark) {
    return [{ kind: 'sep', style: 'none', tokens: tokensOf(this) }];
  },
  terrainObject(_form) {
    const object = OBJECT_BY_FORM.get(key(this));
    return [word(object?.genitive ?? key(this), 'plain', tokensOf(this))];
  },
  countNumeral(_form) {
    const value = NUMERAL_BY_FORM.get(key(this)) ?? 0;
    const numeral = NUMERALS.find((n) => n.value === value);
    return [word(numeral?.genitive ?? key(this), 'plain', tokensOf(this))];
  },
  surname(_letters, _space) {
    const known = SURNAME_BY_FORM.get(key(this));
    const typed = current?.tokens[tokensOf(this)[0] ?? -1]?.text.toLocaleLowerCase('pl') ?? key(this);
    return [word(known ? known.genitive.toLocaleLowerCase('pl') : typed, 'proper', tokensOf(this))];
  },
  StepCount(numeral, noun) {
    const numeralNode = opt(numeral);
    const value = numeralNode ? (NUMERAL_BY_FORM.get(key(numeralNode)) ?? 1) : 1;
    const nounTokens = tokensOf(noun);
    if (value === 1) {
      const dropped: CanonicalItem[] = numeralNode ? [{ kind: 'drop', tokens: tokensOf(numeralNode) }] : [];
      return [...dropped, word('krok', 'plain', nounTokens)];
    }
    const nominative = NUMERALS.find((n) => n.value === value)?.nominative ?? String(value);
    return [word(nominative, 'plain', numeralNode ? tokensOf(numeralNode) : []), word(stepsNoun(value), 'plain', nounTokens)];
  },
});

// Drzewo składni: wartości wyliczeniowe z tekstu złożonego (klucze to literały gramatyki).

const TURN: Readonly<Record<string, TurnDirection>> = { 'w lewo': 'LEFT', 'w prawo': 'RIGHT', 'w tyl': 'ABOUT' };
const SIDE: Readonly<Record<string, Side>> = { 'w prawo': 'RIGHT', 'w lewo': 'LEFT' };
const FORMATION: Readonly<Record<string, FormationName>> = {
  'w szeregu': 'SINGLE_RANK',
  'w dwuszeregu': 'DOUBLE_RANK',
  'w rzedzie': 'FILE',
  'w kolumnie dwojkowej': 'COLUMN_OF_TWOS',
};
const MARCH: Readonly<Record<string, MarchDirection>> = {
  'na wprost': 'FORWARD',
  'w prawo': 'RIGHT',
  'w lewo': 'LEFT',
  'w tyl na prawo': 'ABOUT_RIGHT',
  'w tyl na lewo': 'ABOUT_LEFT',
  'w prawo w skos': 'HALF_RIGHT',
  'w lewo w skos': 'HALF_LEFT',
};
const SHIFT: Readonly<Record<string, ShiftDirection>> = {
  'na wprost': 'FORWARD',
  'w tyl': 'BACK',
  'w prawo': 'RIGHT',
  'w lewo': 'LEFT',
};
const FLANK: Readonly<Record<string, Side>> = { prawoskrzydlowego: 'RIGHT', lewoskrzydlowego: 'LEFT' };

function lookup<T>(table: Readonly<Record<string, T>>, node: ohm.Node): T {
  const value = table[key(node)];
  if (value === undefined) throw new Error(`Nieznana wartość „${key(node)}” w regule ${node.ctorName}.`);
  return value;
}

function objectId(node: ohm.Node): TerrainObjectId {
  const object = OBJECT_BY_FORM.get(key(node));
  if (!object) throw new Error(`Nieznany obiekt „${key(node)}”.`);
  return object.id;
}

function stepsOf(node: ohm.Node): number {
  const numeral = opt(node.child(0));
  return numeral ? (NUMERAL_BY_FORM.get(key(numeral)) ?? 1) : 1;
}

const lead = (node: ohm.Node): Addressee | null => {
  const inner = opt(node);
  return inner ? op(inner).addressee() : null;
};

/** Komendy bez parametrów poza adresatem: drzewo składni wynika z samej reguły. */
const SIMPLE_RULES = new Set([
  'P2_Attention',
  'P3_AtEase',
  'S1_TwosRight',
  'S2_RankFront',
  'M2_FollowMe',
  'M3_MarkTime',
  'M4_Forward',
  'M5_Run',
  'M6_QuickStep',
  'M7_RouteStep',
  'M8_Halt',
  'M10_HeadHalt',
  'MS1_FileBack',
  'MS2_TwosForward',
  'X1_Revert',
]);

semantics.addOperation<unknown>('addressee', {
  Lead(addressee, _sep) {
    return op(addressee).addressee();
  },
  Addressee(ordinal, _squad) {
    const ordinalNode = opt(ordinal);
    return { ordinal: ordinalNode ? (ORDINAL_BY_WORD.get(key(ordinalNode)) ?? null) : null };
  },
});

semantics.addOperation<unknown>('soldier', {
  ExtendFrom_flank(flank) {
    return { ref: { kind: 'flank', side: lookup(FLANK, flank) }, side: null };
  },
  ExtendFrom_soldier(_rank, surname, _sepOpt, sideOpt) {
    return soldierRef(surname, sideOpt);
  },
  CloseTo_flank(flank) {
    return { ref: { kind: 'flank', side: lookup(FLANK, flank) }, side: null };
  },
  CloseTo_soldier(_rank, surname, _gapOpt, sideOpt) {
    return soldierRef(surname, sideOpt);
  },
});

function soldierRef(surname: ohm.Node, sideOpt: ohm.Node): { ref: SoldierRef; side: Side | null } {
  const known = SURNAME_BY_FORM.get(key(surname));
  const typed = current?.tokens[tokensOf(surname)[0] ?? -1]?.text ?? key(surname);
  const ref: SoldierRef = known
    ? { kind: 'soldier', surname: known.nominative, known: true }
    : { kind: 'soldier', surname: typed.charAt(0).toLocaleUpperCase('pl') + typed.slice(1), known: false };
  const sideNode = opt(sideOpt);
  return { ref, side: sideNode ? lookup(SIDE, sideNode) : null };
}

const commandActions: ohm.ActionDict<ParsedCommand> = {
  Command(command, _end) {
    const entry = entryByRule(command.ctorName);
    if (!entry) throw new Error(`Reguła ${command.ctorName} nie ma wpisu w katalogu.`);
    if (entry.group === 'N') return { id: 'OUT_OF_SCOPE', entryId: entry.id };
    if (SIMPLE_RULES.has(entry.rule)) return { id: entry.id, addressee: lead(command.child(0)) } as CommandAst;
    return op(command).ast();
  },
  P1_Summons(addressee) {
    return { id: 'P-1', addressee: op(addressee).addressee() };
  },
  Z1_Turn(l, direction, _sep, _exec) {
    return { id: 'Z-1', addressee: lead(l), direction: lookup(TURN, direction) };
  },
  ZB1_Assembly(l, formation, _sep, _exec) {
    return { id: 'ZB-1', addressee: lead(l), formation: lookup(FORMATION, formation) };
  },
  ZB2_AssemblyPlace(l, formation, _sep1, terrainOpt, _sep2, anchor, _sep3, frontOpt, _sep4, _exec) {
    const terrainNode = opt(terrainOpt);
    const frontNode = opt(frontOpt);
    return {
      id: 'ZB-2',
      addressee: lead(l),
      formation: lookup(FORMATION, formation),
      terrain: terrainNode ? (key(terrainNode) === 'na placu' ? 'PLAZA' : 'ROAD') : null,
      anchor: {
        part: key(anchor.child(0)) === 'czolo' ? 'HEAD' : 'RIGHT_FLANK',
        object: objectId(anchor.child(2)),
      },
      frontTo: frontNode ? objectId(frontNode.child(1)) : null,
    };
  },
  ZB3_AssemblyPrevious(l, formation, _sep1, _words, _sep2, _exec) {
    return { id: 'ZB-3', addressee: lead(l), formation: lookup(FORMATION, formation) };
  },
  ZB4_Dismiss(l, placeOpt, _sepOpt, _exec) {
    const place = opt(placeOpt);
    return {
      id: 'ZB-4',
      addressee: lead(l),
      destination: place ? objectId(place.child(1)) : null,
      running: place ? place.child(2).children.length > 0 : false,
    };
  },
  R1_Dress(l, _word, _sep, exec) {
    return { id: 'R-1', addressee: lead(l), side: lookup(SIDE, exec) };
  },
  R2_Count(l, spec, _sep, _exec) {
    const byN = spec.child(0).ctorName === 'CountSpec_byN' ? spec.child(0).child(1) : null;
    return { id: 'R-2', addressee: lead(l), countTo: byN ? (NUMERAL_BY_FORM.get(key(byN)) ?? null) : null };
  },
  O1_Extend(l, _od, from, _sep1, steps, running, _sep2, _exec) {
    const { ref, side } = op(from).soldier();
    return { id: 'O-1', addressee: lead(l), from: ref, side, steps: stepsOf(steps), running: running.children.length > 0 };
  },
  O2_Close(l, _do, to, running, _sep, _exec) {
    const { ref, side } = op(to).soldier();
    return { id: 'O-2', addressee: lead(l), to: ref, side, running: running.children.length > 0 };
  },
  S3_Shift(l, steps, direction, _sep, _exec) {
    return { id: 'S-3', addressee: lead(l), steps: stepsOf(steps), direction: lookup(SHIFT, direction) };
  },
  S4_Wheel(l, side, _word, _sep, _exec) {
    return { id: 'S-4', addressee: lead(l), side: lookup(SIDE, side) };
  },
  M1_March(l, _word, direction, _sep, _exec) {
    return { id: 'M-1', addressee: lead(l), direction: lookup(MARCH, direction) };
  },
  M9_Direction(l, _word, _sep, exec) {
    const value = lookup(MARCH, exec);
    if (value === 'FORWARD') throw new Error('„Kierunek – NA WPROST” nie jest komendą.');
    return { id: 'M-9', addressee: lead(l), direction: value };
  },
  M11_HaltFace(l, _word, _sep, exec) {
    return { id: 'M-11', addressee: lead(l), side: lookup(SIDE, exec) };
  },
};

semantics.addOperation<ParsedCommand>('ast', commandActions);

semantics.addOperation<string[]>('rules', {
  _nonterminal(...children) {
    return [this.ctorName, ...children.flatMap((c) => op(c).rules())];
  },
  _iter(...children) {
    return children.flatMap((c) => op(c).rules());
  },
  _terminal() {
    return [];
  },
});

// ---------------------------------------------------------------------------- rozbiór i diagnoza

export interface ParseSuccess {
  readonly ok: true;
  readonly normalized: NormalizedInput;
  readonly command: ParsedCommand;
  readonly entry: CatalogEntry;
  /** Forma kanoniczna jako ciąg elementów; `null` dla komend spoza MVP. */
  readonly items: readonly CanonicalItem[] | null;
}

export type SyntaxCode = 'E_SYNTAX_UNKNOWN' | 'E_SYNTAX_EXPECTED' | 'E_SYNTAX_INCOMPLETE';

export interface ParseFailure {
  readonly ok: false;
  readonly normalized: NormalizedInput;
  readonly code: SyntaxCode;
  /** Fragment tekstu wejściowego do podkreślenia. */
  readonly span: Span;
  /** Oczekiwane elementy w formie kanonicznej (słowa, hasła, opisy slotów). */
  readonly expected: readonly string[];
  /** Fragment, który znaleziono w miejscu błędu (`null` na końcu tekstu). */
  readonly found: string | null;
  /** Wpis katalogu, którego hasło rozpoznano (do komunikatu), jeśli jest. */
  readonly candidates: readonly CatalogEntry[];
}

export type ParseResult = ParseSuccess | ParseFailure;

interface FailureInfo {
  readonly pos: number;
  readonly literals: readonly string[];
  readonly descriptions: readonly string[];
}

interface OhmFailure {
  getText(): string;
  getType(): string;
  isFluffy(): boolean;
}

function failureInfo(match: ohm.MatchResult): FailureInfo {
  const result = match as ohm.FailedMatchResult & { getRightmostFailures(): OhmFailure[] };
  const failures = result.getRightmostFailures().filter((f) => !f.isFluffy());
  const literals = failures.filter((f) => f.getType() === 'string').map((f) => f.getText());
  const descriptions = failures
    .filter((f) => f.getType() === 'description')
    .map((f) => f.getText())
    .filter((d) => d in SLOT_DESCRIPTIONS || d === 'end of input');
  return { pos: result.getRightmostFailurePosition(), literals, descriptions };
}

interface ExecutiveMatch {
  readonly start: number;
  readonly entries: readonly CatalogEntry[];
}

/** Hasło na końcu komendy (najdłuższe pasujące), z wpisami katalogu, które go używają. */
function findExecutive(folded: string): ExecutiveMatch | null {
  let best: { text: string; entries: CatalogEntry[] } | null = null;
  for (const entry of COMMANDS) {
    for (const executive of entry.executives) {
      const text = `${fold(executive)} `;
      const atEnd = folded === text || folded.endsWith(` ${text}`);
      if (!atEnd) continue;
      if (!best || text.length > best.text.length) best = { text, entries: [entry] };
      else if (text === best.text && !best.entries.includes(entry)) best.entries.push(entry);
    }
  }
  return best ? { start: folded.length - best.text.length, entries: best.entries } : null;
}

function display(info: FailureInfo): string[] {
  // Ohm podaje oczekiwane elementy od ostatnio sprawdzonej alternatywy — odwracamy do kolejności gramatyki.
  const words = [...info.literals]
    .reverse()
    .filter((l) => !/^[,-] $/.test(l))
    .map(displayLiteral);
  const slots = info.descriptions.map((d) => (d === 'end of input' ? 'koniec komendy' : (SLOT_DESCRIPTIONS[d] ?? d)));
  const all = [...new Set([...words, ...slots])];
  return all.length > 0 ? all : [...new Set(info.literals.map(displayLiteral))];
}

function failure(
  normalized: NormalizedInput,
  code: SyntaxCode,
  info: FailureInfo,
  candidates: readonly CatalogEntry[],
  spanOverride?: Span,
): ParseFailure {
  const index = tokenIndexAt(normalized, info.pos);
  let span: Span;
  if (spanOverride) span = spanOverride;
  else if (index >= normalized.tokens.length) span = spanOfTokens(normalized, normalized.tokens.length);
  else {
    // Podkreślenie obejmuje tyle słów, ile ma najdłuższy oczekiwany element, do najbliższego separatora.
    const width = Math.max(1, ...info.literals.map((l) => l.trim().split(' ').length));
    let last = index;
    while (last + 1 < normalized.tokens.length && last + 1 < index + width && normalized.tokens[last + 1]?.kind === 'word') last++;
    span = spanOfTokens(normalized, index, last);
  }
  const found = span.end > span.start ? normalized.input.slice(span.start, span.end) : null;
  return { ok: false, normalized, code, span, expected: display(info), found, candidates };
}

function diagnose(normalized: NormalizedInput, match: ohm.MatchResult): ParseFailure {
  const { folded, tokens } = normalized;
  const global = failureInfo(match);
  if (global.pos >= folded.length) return failure(normalized, 'E_SYNTAX_INCOMPLETE', global, []);

  const executive = findExecutive(folded);
  if (executive) {
    const execIndex = tokenIndexAt(normalized, executive.start);
    const execSpan = spanOfTokens(normalized, execIndex, tokens.length - 1);
    // Zapowiedź pasuje do innej komendy, a hasło jest złe: „W prawo – MARSZ” → oczekiwano ZWROT.
    if (global.pos === executive.start && global.literals.length > 0 && global.literals.every(isExecutiveLiteral)) {
      const expectedEntries = COMMANDS.filter((e) => e.executives.some((x) => global.literals.includes(`${fold(x)} `)));
      return failure(normalized, 'E_SYNTAX_EXPECTED', global, expectedEntries, execSpan);
    }
    // Hasło jest dobre: szukamy błędu w zapowiedzi komend z tym hasłem (najdalej dopasowanych).
    let guided: FailureInfo | null = null;
    let closest: CatalogEntry[] = [];
    for (const entry of executive.entries) {
      const info = failureInfo(grammar.match(folded, entry.rule));
      if (!guided || info.pos > guided.pos) {
        guided = info;
        closest = [entry];
      } else if (info.pos === guided.pos) {
        guided = {
          pos: info.pos,
          literals: [...guided.literals, ...info.literals],
          descriptions: [...guided.descriptions, ...info.descriptions],
        };
        closest.push(entry);
      }
    }
    if (guided && guided.pos === executive.start) {
      return failure(normalized, 'E_SYNTAX_INCOMPLETE', guided, closest, execSpan);
    }
    if (guided && guided.pos > 0) return failure(normalized, 'E_SYNTAX_EXPECTED', guided, closest);
  }
  if (global.pos === 0) {
    return failure(normalized, 'E_SYNTAX_UNKNOWN', global, [], spanOfTokens(normalized, 0, tokens.length - 1));
  }
  return failure(normalized, 'E_SYNTAX_EXPECTED', global, []);
}

export function parse(input: string): ParseResult {
  const normalized = normalize(input);
  if (normalized.tokens.length === 0) {
    return {
      ok: false,
      normalized,
      code: 'E_SYNTAX_INCOMPLETE',
      span: { start: 0, end: 0 },
      expected: [],
      found: null,
      candidates: [],
    };
  }
  const match = grammar.match(normalized.folded, 'Command');
  if (match.failed()) return diagnose(normalized, match);

  current = normalized;
  try {
    const node = semantics(match);
    const command = (node as unknown as Ops).ast();
    const rule = match.succeeded() ? commandRule(node) : '';
    const entry = entryByRule(rule);
    if (!entry) throw new Error(`Reguła ${rule} nie ma wpisu w katalogu.`);
    const items = command.id === 'OUT_OF_SCOPE' ? null : withImpliedAddressee(command, (node as unknown as Ops).items('plain'));
    return { ok: true, normalized, command, entry, items };
  } finally {
    current = null;
  }
}

/** Samo „STÓJ”: regulamin podaje „Drużyna – STÓJ” (pkt 100, I-16) — forma kanoniczna z adresatem. */
function withImpliedAddressee(command: CommandAst, items: CanonicalItem[]): CanonicalItem[] {
  if (command.id !== 'M-8' || command.addressee !== null) return items;
  return [word('drużyna', 'plain', []), { kind: 'sep', style: 'auto', tokens: [] }, ...items];
}

function commandRule(node: unknown): string {
  return (node as { rules(): string[] }).rules()[1] ?? '';
}

/** Nazwy reguł użytych w rozbiorze (do testu pokrycia gramatyki przykładami). */
export function rulesUsed(input: string): string[] {
  const normalized = normalize(input);
  const match = grammar.match(normalized.folded, 'Command');
  if (match.failed()) return [];
  current = normalized;
  try {
    return (semantics(match) as unknown as Ops).rules();
  } finally {
    current = null;
  }
}
