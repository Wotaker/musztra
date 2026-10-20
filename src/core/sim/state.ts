import type { SquadOrdinal } from '../catalog';
import type { CommandId, FormationName, Side } from '../grammar/ast';
import type { MessageCode } from '../messages';
import type { Surname } from '../roster/names';
import type { Vec2 } from './geometry';

/** Model stanu (SPEC 5.3). Stan jest niezmienny: symulacja i komendy tworzą nowe obiekty. */

export type Formation = FormationName | 'DISPERSED';
export type Posture = 'ATTENTION' | 'AT_EASE';
export type Motion = 'STANDING' | 'MARCHING' | 'MARCHING_IN_PLACE' | 'RUNNING';
/** Sposób poruszania się w danej chwili — dla animacji (krok defiladowy, zwykły, bieg, wykrok, cofanie). */
export type Gait = 'STAND' | 'QUICK' | 'PARADE' | 'RUN' | 'SIDESTEP' | 'BACKSTEP' | 'SHUFFLE' | 'MARK' | 'ROUTE';
/** Położenie głowy (równanie, odliczanie). */
export type Head = 'FRONT' | 'LEFT' | 'RIGHT';

export interface Bubble {
  readonly text: string;
  /** `number` — liczba z odliczania, `report` — meldunek („Niepełny”, „Jestem”). */
  readonly tone: 'number' | 'report';
  readonly from: number;
  readonly until: number;
}

/** Odzywki żołnierzy i uwagi symulacji (np. W_FOLLOW_HALT, W_AWAIT_QUICK_STEP) do Dziennika. */
export type ReportKind = 'count' | 'incomplete' | 'present' | 'note';

/** Natychmiastowe skutki w planie żołnierza. */
export interface Effects {
  readonly posture?: Posture;
  readonly head?: Head;
  readonly say?: { readonly text: string; readonly tone: Bubble['tone']; readonly duration: number };
  readonly report?: { readonly text: string; readonly kind: ReportKind };
  /** Uniesiona lewa ręka (pkt 73) na `duration` s. */
  readonly raiseLeftArm?: number;
  readonly countNumber?: number | null;
}

/** Odcinek planu ruchu żołnierza. */
export type Segment =
  | { readonly kind: 'wait'; readonly duration: number }
  /** Przejście do punktu `to` z obrotem o `turn` stopni (ze znakiem) w czasie `duration`. */
  | {
      readonly kind: 'lerp';
      readonly to: Vec2;
      readonly turn: number;
      readonly duration: number;
      readonly gait: Gait;
      /** Profil prędkości: stała (marsz, bieg) albo z łagodnym startem i końcem (zwrot, wykrok, WRÓĆ). */
      readonly ease: boolean;
    }
  | { readonly kind: 'act'; readonly effects: Effects };

export interface Soldier {
  /** Numer w składzie: 1 = prawoskrzydłowy (kierunkowy) przy zbiórce. */
  readonly id: number;
  readonly surname: Surname;
  readonly position: Vec2;
  readonly facing: number;
  readonly posture: Posture;
  readonly motion: Motion;
  readonly gait: Gait;
  /** Droga przebyta od początku (m) — faza kroku w animacji. */
  readonly stride: number;
  /** Liczba z ostatniego odliczania. */
  readonly countNumber: number | null;
  readonly head: Head;
  readonly bubble: Bubble | null;
  /** Do kiedy uniesiona lewa ręka (czas symulacji). */
  readonly armRaisedUntil: number | null;
  readonly plan: readonly Segment[];
  readonly planIndex: number;
  /** Czas, który upłynął w bieżącym odcinku planu. */
  readonly segmentTime: number;
  /** Położenie i front na początku bieżącego odcinka. */
  readonly segmentStart: { readonly position: Vec2; readonly facing: number } | null;
}

/** Miejsce w szyku: współrzędne względem punktu odniesienia (prawe skrzydło / czoło), w lewo i w głąb. */
export interface Slot {
  readonly id: number;
  readonly lateral: number;
  readonly depth: number;
}

/**
 * Układ szyku: front, punkt odniesienia i miejsca żołnierzy w kolejności od prawego skrzydła (czoła):
 * najpierw pierwszy szereg (para czołowa) od prawej, potem kolejne.
 */
export interface Layout {
  readonly facing: number;
  readonly origin: Vec2;
  readonly slots: readonly Slot[];
}

export interface CountMode {
  /** `null` — „Kolejno – ODLICZ”, liczba — „Do n – ODLICZ”. */
  readonly n: number | null;
  readonly inMarch: boolean;
}

export interface Extension {
  /** Żołnierz, od którego odstąpiono. */
  readonly fromId: number;
  readonly steps: number;
  readonly side: Side | 'BOTH';
}

export interface Activity {
  readonly commandId: CommandId;
  /** Czynność przejściowa (SPEC 5.5): w jej trakcie dozwolone tylko WRÓĆ (I-11). */
  readonly blocking: boolean;
}

export interface Squad {
  readonly name: SquadOrdinal | null;
  readonly formation: Formation;
  /** `null` w stanie rozproszonym. */
  readonly layout: Layout | null;
  /** Drużyna wezwana (P-1) lub po BACZNOŚĆ — może przyjąć zbiórkę bez adresata (pkt 69). */
  readonly attending: boolean;
  readonly countMode: CountMode | null;
  readonly extension: Extension | null;
  /** Odstępy (odległości) nieregulaminowe po zwrocie — do korekty przez SPOCZNIJ lub „Równaj” (I-1). */
  readonly irregularSpacing: boolean;
  /** Kolumna dwójkowa utworzona komendą „W dwójki, w prawo – ZWROT” (S-1). */
  readonly formedFromTwos: boolean;
  /** Głowy zwrócone po „Równaj” (R-1) — do komendy BACZNOŚĆ. */
  readonly headsTurned: Side | null;
  /** Miejsce ostatniej zbiórki: punkt prawoskrzydłowego (kierunkowego) i front (ZB-3). */
  readonly lastAssembly: { readonly anchor: Vec2; readonly facing: number } | null;
  readonly activity: Activity | null;
  /** Ruch ciągły; `null` — drużyna stoi (albo jest rozproszona). */
  readonly march: MarchState | null;
}

export interface CommanderInput {
  /** Kierunek ruchu: składowe −1, 0, 1 (WASD / strzałki). */
  readonly x: number;
  readonly y: number;
  readonly run: boolean;
}

export interface Commander {
  readonly position: Vec2;
  /** Front widoczny na placu (płynnie podąża za `heading`). */
  readonly facing: number;
  /** Front docelowy — wielokrotność 45°; według niego ustawia się zbiórka (pkt 69). */
  readonly heading: number;
  readonly input: CommanderInput;
  readonly gait: Gait;
  readonly stride: number;
}

export interface Report {
  readonly time: number;
  /** Żołnierz, który melduje; `null` — uwaga dotycząca całej drużyny. */
  readonly soldierId: number | null;
  readonly text: string;
  readonly kind: ReportKind;
  /** Kod uwagi (SPEC 4.4) dla `kind: 'note'`. */
  readonly code?: MessageCode;
}

/** Punkt śladu prowadzącego: położenie i droga od początku śladu (m). */
export interface TrailPoint {
  readonly s: number;
  readonly p: Vec2;
}

/** Żołnierz w kolumnie idącej po śladzie (SPEC 5.5, „Prowadzenie kolumny”). */
export interface Follower {
  readonly id: number;
  /** Droga po śladzie (m). */
  readonly s: number;
  /** Przesunięcie w lewo od śladu (m). */
  readonly lateral: number;
  /** Docelowa odległość za prowadzącym, mierzona po śladzie (m). */
  readonly depth: number;
  readonly targetLateral: number;
}

/** Zaplanowana zmiana w marszu: po przejściu przez prowadzącego drogi `at` (albo po czasie). */
export type MarchEvent =
  | { readonly kind: 'TURN'; readonly delta: number }
  | { readonly kind: 'RUN' }
  | { readonly kind: 'QUICK' }
  | { readonly kind: 'FORWARD' }
  | { readonly kind: 'MARK_TIME' }
  | { readonly kind: 'HALT' };

export interface PendingMarchEvent {
  /** Droga prowadzącego (`distance`) albo czas symulacji, po którym zdarzenie zachodzi. */
  readonly at: number;
  readonly basis: 'distance' | 'time';
  readonly event: MarchEvent;
}

/** Ruch ciągły drużyny (SPEC 5.5): marsz, marsz w miejscu, bieg, zachodzenie, „Za mną”. */
export interface MarchState {
  /**
   * `RIGID` — cały szyk przesuwa się równolegle (szyk rozwinięty, wykonanie indywidualne);
   * `TRAIL` — kolumna po śladzie kierunkowego (albo dowódcy przy „Za mną”); `WHEEL` — zachodzenie.
   */
  readonly kind: 'RIGID' | 'TRAIL' | 'WHEEL';
  readonly motion: Exclude<Motion, 'STANDING'>;
  readonly step: 'PARADE' | 'QUICK' | 'ROUTE';
  /** Kierunek ruchu prowadzącego (szyku). */
  readonly heading: number;
  /** Pozostały obrót prowadzącego (°, ze znakiem) przy zmianie kierunku po łuku. */
  readonly turnLeft: number;
  /** Droga przebyta przez prowadzącego od rozpoczęcia marszu. */
  readonly distance: number;
  /** Do tej drogi prowadzący idzie krokiem defiladowym (pkt 24: pierwsze trzy kroki). */
  readonly paradeUntil: number;
  readonly trail: readonly TrailPoint[];
  readonly followers: readonly Follower[];
  /** „Za mną”: prowadzi dowódca, kierunkowy 3 kroki za nim (M-2). */
  readonly follow: boolean;
  readonly followHalted: boolean;
  /** Po „W dwójki – W PRZÓD” czoło skraca krok do „Zwykły – KROK” (pkt 77). */
  readonly awaitingQuickStep: boolean;
  readonly quickStepWarned: boolean;
  /** Zatrzymanie niejednoczesne: czoło stoi, reszta dochodzi (M-10), opcjonalnie ze zwrotem (M-11). */
  readonly headHalt: { readonly face: number | null } | null;
  readonly wheel: { readonly pivot: Vec2; readonly sign: 1 | -1; readonly rate: number; readonly pivotId: number } | null;
  readonly pending: readonly PendingMarchEvent[];
}

export interface SimState {
  /** Czas symulacji (s) i liczba wykonanych kroków. */
  readonly time: number;
  readonly tick: number;
  /** Niewykorzystany czas krótszy niż jeden krok symulacji. */
  readonly accumulator: number;
  /** Stan generatora liczb losowych. */
  readonly rng: number;
  readonly soldiers: readonly Soldier[];
  readonly squad: Squad;
  readonly commander: Commander;
  /** Meldunki i odzywki od początku (SPEC 3.5). */
  readonly reports: readonly Report[];
}
