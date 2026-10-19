import type { CommandAst, CommandId, FormationName } from './grammar/ast';
import type { SquadOrdinal } from './catalog';
import type { Addressee } from './grammar/ast';
import { COMMANDER_LEAD, INTERVAL } from './sim/constants';
import { add, rightOf, scale, forward, type Vec2 } from './sim/geometry';
import type { Formation, Posture } from './sim/state';

/**
 * Interpretacje regulaminu I-1…I-17 (SPEC 11), jeszcze niepotwierdzone z prowadzącym.
 * Każda jest jedną, wyraźnie wydzieloną regułą w tym pliku — zmiana interpretacji to zmiana
 * tej jednej funkcji (stałej) i odpowiadających jej testów, bez przebudowy reszty kodu.
 * Interpretacje dotyczące marszu (I-3, I-5, I-13, I-15, I-17) dojdą w etapie E4; I-16 działa od E1
 * (kontrola formy, `grammar/form.ts`).
 */

export interface Interpretation {
  readonly id: string;
  readonly situation: string;
  readonly decision: string;
  /** Etap, od którego interpretacja działa w symulatorze. */
  readonly stage: 'E1' | 'E2' | 'E3' | 'E4';
}

export const INTERPRETATIONS: readonly Interpretation[] = [
  { id: 'I-1', stage: 'E2', situation: 'Zwrot z rzędu (odległość 1,2 m) do szeregu', decision: 'powstają luki; flaga irregularSpacing, korekta na SPOCZNIJ lub „Równaj”' },
  { id: 'I-2', stage: 'E2', situation: 'Zwrot z szeregu do rzędu daje odległość 0,6 m', decision: 'po ruszeniu żołnierze rozwierają się do 1,2 m (marsz: E4)' },
  { id: 'I-3', stage: 'E4', situation: '„kierunek w lewo/prawo – MARSZ” w szyku rozwiniętym', decision: 'wykonanie indywidualne wg pkt 24 z uwagą W_DIRECTION_DEPLOYED' },
  { id: 'I-4', stage: 'E3', situation: 'Odliczanie', decision: 'w miejscu tylko w szyku rozwiniętym; w marszu tylko w rzędzie' },
  { id: 'I-5', stage: 'E4', situation: 'Zmiana kierunku kolumny', decision: 'po śladzie kierunkowego' },
  { id: 'I-6', stage: 'E2', situation: 'Miejsce prawoskrzydłowego na zbiórce', decision: 'rozwinięty: po lewej stronie dowódcy w odstępie 0,6 m; marszowy: 3 kroki za dowódcą' },
  { id: 'I-7', stage: 'E2', situation: 'Przydział żołnierzy do szeregów dwuszeregu', decision: 'pierwszy szereg: pierwsze ⌈N/2⌉ osób, od prawej; drugi: pozostali, od prawej' },
  { id: 'I-8', stage: 'E3', situation: '„W szereg, w lewo – FRONT”', decision: 'dwójki tylko się zwracają, jedynki dostawiają się po ich prawej stronie; samotna jedynka z końca staje na lewo od ostatniej dwójki' },
  { id: 'I-9', stage: 'E2', situation: 'Zbiórka bez wezwania i bez BACZNOŚĆ', decision: 'błąd E_PRECOND_ATTENTION; forma z adresatem pełni rolę wezwania' },
  { id: 'I-10', stage: 'E1', situation: 'Komenda do nieistniejącego pododdziału', decision: 'nikt nie reaguje, uwaga E_ADDRESSEE' },
  { id: 'I-11', stage: 'E2', situation: 'Komenda w trakcie czynności przejściowej', decision: 'E_BUSY, dozwolone WRÓĆ' },
  { id: 'I-12', stage: 'E2', situation: 'WRÓĆ', decision: 'powrót do migawki sprzed ostatniej wykonanej komendy (szybka animacja), także po jej zakończeniu' },
  { id: 'I-13', stage: 'E4', situation: 'Zachodzenie', decision: 'trwa aż do „Drużyna – STÓJ”, bez limitu kąta' },
  { id: 'I-14', stage: 'E3', situation: 'Postawa po ŁĄCZ', decision: 'swobodna, przez analogię do ODSTĄP' },
  { id: 'I-15', stage: 'E4', situation: '„Za mną – MARSZ” w szyku rozwiniętym', decision: 'niedozwolone (E_PRECOND_FORMATION)' },
  { id: 'I-16', stage: 'E1', situation: '„STÓJ” bez adresata', decision: 'tryb łagodny wykonuje z uwagą, ścisły odrzuca' },
  { id: 'I-17', stage: 'E4', situation: 'Postawa po „Czoło – STÓJ”', decision: 'wszyscy, łącznie z czołem, przyjmują postawę swobodną' },
];

const DEPLOYED: readonly Formation[] = ['SINGLE_RANK', 'DOUBLE_RANK'];

/**
 * I-1, I-2: po zwrocie zmieniającym ugrupowanie żołnierze zostają na swoich miejscach; jeśli wynikające
 * z geometrii odstępy (odległości) nie są regulaminowe, szyk dostaje flagę `irregularSpacing`
 * (korekta: SPOCZNIJ lub „Równaj”). Alternatywa — samoczynne dosunięcie — byłaby zmianą tej funkcji.
 */
export function irregularAfterTurn(spacingIsRegular: boolean): boolean {
  return !spacingIsRegular;
}

/** I-4: odliczanie w miejscu tylko w szyku rozwiniętym (w marszu tylko w rzędzie — E4). */
export function countAllowedInPlace(formation: Formation): boolean {
  return DEPLOYED.includes(formation);
}

/**
 * I-6: miejsce prawoskrzydłowego (kierunkowego) na zbiórce przy dowódcy: w szyku rozwiniętym po lewej
 * stronie dowódcy w odstępie 0,6 m; w szyku marszowym 3 kroki za dowódcą.
 */
export function assemblyAnchorNearCommander(formation: FormationName, commander: Vec2, heading: number): Vec2 {
  if (DEPLOYED.includes(formation)) return add(commander, scale(rightOf(heading), -INTERVAL));
  return add(commander, scale(forward(heading), -COMMANDER_LEAD));
}

/** I-7: liczba żołnierzy w pierwszym szeregu dwuszeregu: ⌈N/2⌉ (drugi szereg — pozostali, od prawej). */
export function frontRankSize(n: number): number {
  return Math.ceil(n / 2);
}

/**
 * I-8: przy „W szereg, w lewo – FRONT” samotna jedynka z końca kolumny staje na lewo od ostatniej dwójki
 * (pozostałe jedynki — na prawo od swoich dwójek, więc szyk przesuwa się o odstęp).
 */
export const LONE_SOLDIER_JOINS_LEFT_OF_LAST_PAIR = true;

/**
 * I-9: zbiórka bez adresata wymaga wcześniejszego wezwania lub BACZNOŚĆ (pkt 69); komenda z adresatem
 * w tej samej linii pełni rolę wezwania.
 */
export function assemblyNeedsSummons(command: CommandAst, attending: boolean): boolean {
  return command.addressee === null && !attending;
}

/**
 * I-10: komenda z adresatem innym niż drużyna na placu — nikt nie reaguje (E_ADDRESSEE).
 * „Drużyna” bez liczebnika dotyczy drużyny na placu niezależnie od jej nazwy (D-019).
 */
export function addresseeMismatch(addressee: Addressee | null, squad: SquadOrdinal | null): boolean {
  return addressee !== null && addressee.ordinal !== null && addressee.ordinal !== squad;
}

/** I-11: w trakcie czynności przejściowej dozwolone jest tylko WRÓĆ; inne komendy → E_BUSY. */
export function allowedWhileBusy(id: CommandId): boolean {
  return id === 'X-1';
}

/**
 * I-12: WRÓĆ cofa do migawki sprzed ostatniej wykonanej komendy — także po jej zakończeniu;
 * kolejne WRÓĆ cofa o kolejną komendę. Zwraca indeks migawki do przywrócenia albo `null`.
 */
export function revertTarget(historyLength: number): number | null {
  return historyLength > 0 ? historyLength - 1 : null;
}

/** Czas szybkiej animacji powrotu po WRÓĆ (I-12): najwyżej tyle sekund. */
export const REVERT_MAX_DURATION = 1.2;

/** I-14: postawa po ŁĄCZ — swobodna, przez analogię do ODSTĄP (pkt 73). */
export const POSTURE_AFTER_CLOSE: Posture = 'AT_EASE';
