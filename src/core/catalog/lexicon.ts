/**
 * Słownictwo komend: obiekty terenowe, liczebniki, nazwy pododdziałów (COMMANDS 0.3 i „Dane pomocnicze”).
 * Formy odmiany są zapisane w danych, nie generowane algorytmicznie.
 */

export type TerrainObjectId = 'MAST' | 'STAND' | 'BARRACKS' | 'GARAGES' | 'HANGAR' | 'WAREHOUSE';

export interface TerrainObject {
  readonly id: TerrainObjectId;
  readonly nominative: string;
  readonly genitive: string;
  /** Położenie orientacyjne w metrach (x na wschód, y na północ). */
  readonly position: { readonly x: number; readonly y: number };
}

export const TERRAIN_OBJECTS: readonly TerrainObject[] = [
  { id: 'MAST', nominative: 'maszt', genitive: 'masztu', position: { x: 0, y: 25 } },
  { id: 'STAND', nominative: 'trybuna', genitive: 'trybuny', position: { x: -30, y: 20 } },
  { id: 'BARRACKS', nominative: 'koszary', genitive: 'koszar', position: { x: 0, y: 60 } },
  { id: 'GARAGES', nominative: 'garaże', genitive: 'garaży', position: { x: 45, y: 10 } },
  { id: 'HANGAR', nominative: 'hangar', genitive: 'hangaru', position: { x: 60, y: -40 } },
  { id: 'WAREHOUSE', nominative: 'magazyn', genitive: 'magazynu', position: { x: -50, y: -30 } },
];

export interface Numeral {
  readonly value: number;
  /** Mianownik/biernik: „dwa kroki”, „pięć kroków”. */
  readonly nominative: string;
  /** Dopełniacz: „Do dwóch – ODLICZ”. */
  readonly genitive: string;
}

export const NUMERALS: readonly Numeral[] = [
  { value: 1, nominative: 'jeden', genitive: 'jednego' },
  { value: 2, nominative: 'dwa', genitive: 'dwóch' },
  { value: 3, nominative: 'trzy', genitive: 'trzech' },
  { value: 4, nominative: 'cztery', genitive: 'czterech' },
  { value: 5, nominative: 'pięć', genitive: 'pięciu' },
  { value: 6, nominative: 'sześć', genitive: 'sześciu' },
  { value: 7, nominative: 'siedem', genitive: 'siedmiu' },
  { value: 8, nominative: 'osiem', genitive: 'ośmiu' },
  { value: 9, nominative: 'dziewięć', genitive: 'dziewięciu' },
  { value: 10, nominative: 'dziesięć', genitive: 'dziesięciu' },
];

/** Najmniejsza i największa liczba w odliczaniu „Do … – ODLICZ” (COMMANDS 0.3). */
export const COUNT_OFF_RANGE = { min: 2, max: 10 } as const;
/** Największa liczba kroków w przesunięciu i odstępowaniu (COMMANDS 0.3). */
export const MAX_STEPS = 10;

/** Forma rzeczownika „krok” po liczebniku (COMMANDS 0.3). */
export function stepsNoun(value: number): string {
  if (value === 1) return 'krok';
  return value >= 2 && value <= 4 ? 'kroki' : 'kroków';
}

/** Kanoniczny zapis liczby kroków: „krok”, „dwa kroki”, „pięć kroków”. */
export function stepsPhrase(value: number): string {
  if (value === 1) return 'krok';
  const numeral = NUMERALS.find((n) => n.value === value);
  if (!numeral) throw new RangeError(`Brak liczebnika dla ${String(value)}.`);
  return `${numeral.nominative} ${stepsNoun(value)}`;
}

export type SquadOrdinal = 1 | 2 | 3 | 4;

/** Liczebniki porządkowe w nazwie drużyny (COMMANDS 0.1). */
export const SQUAD_ORDINALS: readonly { readonly value: SquadOrdinal; readonly word: string }[] = [
  { value: 1, word: 'pierwsza' },
  { value: 2, word: 'druga' },
  { value: 3, word: 'trzecia' },
  { value: 4, word: 'czwarta' },
];

/**
 * Nazwy pododdziałów i oddziałów wyższego szczebla oraz liczebniki porządkowe w obu rodzajach —
 * komendy do nich są rozpoznawane jako poza zakresem MVP (pkt 78–130).
 */
export const OTHER_UNITS: readonly string[] = ['pluton', 'kompania', 'batalion', 'brygada'];
export const OTHER_UNIT_ORDINALS: readonly string[] = [
  'pierwszy',
  'drugi',
  'trzeci',
  'czwarty',
  'pierwsza',
  'druga',
  'trzecia',
  'czwarta',
];

/** Nazwa drużyny w formie kanonicznej: „Pierwsza drużyna” albo „Drużyna”. */
export function squadName(ordinal: SquadOrdinal | null): string {
  const word = SQUAD_ORDINALS.find((o) => o.value === ordinal)?.word;
  return word ? `${word.charAt(0).toUpperCase()}${word.slice(1)} drużyna` : 'Drużyna';
}
