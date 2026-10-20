import type { CommandAst, SoldierRef } from '../grammar/ast';
import {
  allowedWhileBusy,
  assemblyNeedsSummons,
  countAllowedInMarch,
  countAllowedInPlace,
  followAllowed,
} from '../interpretations';
import { formationAfterTurn, isDeployed, ranksOf } from '../sim/formation';
import { resolveSoldier } from '../sim/roles';
import { squadMotion } from '../sim/march';
import { FORMATION_NAMES } from '../sim/describe';
import type { SimState } from '../sim/state';
import type { RuleViolation } from './static';

/**
 * Warunki wstępne zależne od stanu drużyny (SPEC 4.3, krok 4; COMMANDS — pole „Warunki”).
 * Każda reguła jest osobną funkcją; wynik to pierwszy naruszony warunek (od najbardziej podstawowego:
 * czynność w toku, głowy zwrócone, szyk, postawa, odliczenie, stan) oraz uwagi.
 */

export interface StateContext {
  /** Liczba migawek w historii WRÓĆ. */
  readonly historyLength: number;
}

export interface StateVerdict {
  readonly errors: readonly RuleViolation[];
  readonly warnings: readonly RuleViolation[];
}

type Rule = (command: CommandAst, state: SimState, context: StateContext) => RuleViolation | null;

const violation = (code: RuleViolation['code'], message: string, points: readonly string[]): RuleViolation => ({
  code,
  message,
  points,
});

// ---------------------------------------------------------------------------- reguły ogólne

/** I-11: w trakcie czynności przejściowej tylko WRÓĆ. */
const notBusy: Rule = (command, state) =>
  state.squad.activity?.blocking && !allowedWhileBusy(command.id)
    ? violation(
        'E_BUSY',
        'Drużyna jeszcze wykonuje poprzednią komendę. Poczekaj na jej zakończenie albo przerwij ją komendą „WRÓĆ”.',
        ['13'],
      )
    : null;

/** Pkt 71: po „Równaj” do komendy BACZNOŚĆ dozwolone tylko BACZNOŚĆ, WRÓĆ i ROZEJŚĆ SIĘ. */
const headsStraight: Rule = (command, state) =>
  state.squad.headsTurned !== null && !['P-2', 'X-1', 'ZB-4'].includes(command.id)
    ? violation(
        'E_PRECOND_STATE',
        'Żołnierze mają zwrócone głowy po komendzie „Równaj”. Po wyrównaniu podaj „BACZNOŚĆ” — wtedy zwrócą głowy na wprost.',
        ['71'],
      )
    : null;

/** Szyk inny niż rozproszona. */
const inFormation: Rule = (_command, state) =>
  state.squad.formation === 'DISPERSED'
    ? violation(
        'E_PRECOND_FORMATION',
        'Drużyna jest rozproszona, nie stoi w szyku. Najpierw zarządź zbiórkę, np. „Pierwsza drużyna, w szeregu – ZBIÓRKA”.',
        ['69'],
      )
    : null;

/** Pkt 11: komendy w miejscu poprzedza się komendą BACZNOŚĆ (COMMANDS 0.2). */
const atAttention: Rule = (_command, state) =>
  state.squad.formation !== 'DISPERSED' && state.soldiers.some((s) => s.posture !== 'ATTENTION')
    ? violation(
        'E_PRECOND_POSTURE',
        'Drużyna stoi w postawie swobodnej. Komendy w miejscu poprzedza się komendą „BACZNOŚĆ” — najpierw BACZNOŚĆ.',
        ['11'],
      )
    : null;

const deployedOnly =
  (message: string, points: readonly string[]): Rule =>
  (_command, state) =>
    isDeployed(state.squad.formation) ? null : violation('E_PRECOND_FORMATION', message, points);

// ---------------------------------------------------------------------------- zbiórki

/** I-9: zbiórka bez adresata wymaga wcześniejszego wezwania lub BACZNOŚĆ. */
const summoned: Rule = (command, state) =>
  assemblyNeedsSummons(command, state.squad.attending)
    ? violation(
        'E_PRECOND_ATTENTION',
        'Drużyna nie została wezwana. Najpierw wezwij ją („Pierwsza drużyna”) albo podaj „BACZNOŚĆ”, albo umieść adresata w komendzie: „Pierwsza drużyna, w szeregu – ZBIÓRKA”.',
        ['69'],
      )
    : null;

const previousPlaceKnown: Rule = (_command, state) =>
  state.squad.lastAssembly === null
    ? violation(
        'E_PRECOND_STATE',
        'Nie było jeszcze zbiórki, więc nie ma „poprzedniego miejsca”. Zarządź zbiórkę przy sobie albo we wskazanym miejscu.',
        ['69'],
      )
    : null;

// ---------------------------------------------------------------------------- WRÓĆ

const hasHistory: Rule = (_command, _state, context) =>
  context.historyLength === 0
    ? violation('E_PRECOND_STATE', 'Nie ma czego cofać — nie wykonano jeszcze żadnej komendy.', ['13'])
    : null;

// ---------------------------------------------------------------------------- odliczanie, równanie, szyki (E3)

/** I-4: odliczanie w miejscu tylko w szyku rozwiniętym. */
const countFormation: Rule = (_command, state) =>
  countAllowedInPlace(state.squad.formation)
    ? null
    : violation(
        'E_PRECOND_FORMATION',
        'Odliczanie w miejscu wykonuje się w szeregu lub dwuszeregu (w marszu — w rzędzie).',
        ['72'],
      );

const dressFormation = deployedOnly(
  'Równanie dotyczy szeregu i dwuszeregu. W rzędzie i kolumnie żołnierze kryją, nie równają.',
  ['71'],
);

const extendFormation = deployedOnly('Odstępowanie wykonuje się w szeregu lub dwuszeregu.', ['73']);

const singleRankForTwos: Rule = (_command, state) => {
  if (state.squad.formation === 'SINGLE_RANK') return null;
  const hint =
    state.squad.formation === 'DOUBLE_RANK'
      ? ' Z dwuszeregu w kolumnę dwójkową przechodzi się komendą „W prawo – ZWROT”.'
      : '';
  return violation('E_PRECOND_FORMATION', `„W dwójki, w prawo – ZWROT” wykonuje się z szeregu.${hint}`, ['76']);
};

const countedByTwos: Rule = (_command, state) => {
  const mode = state.squad.countMode;
  return mode?.n === 2 && !mode.inMarch
    ? null
    : violation(
        'E_PRECOND_COUNT',
        'Do utworzenia dwójek potrzebne jest odliczenie „do dwóch” w tym szyku. Najpierw „Do dwóch – ODLICZ”, potem BACZNOŚĆ.',
        ['76'],
      );
};

const columnFromTwos: Rule = (_command, state) =>
  state.squad.formation === 'COLUMN_OF_TWOS' && state.squad.formedFromTwos
    ? null
    : violation(
        'E_PRECOND_FORMATION',
        state.squad.formation === 'COLUMN_OF_TWOS'
          ? 'Kolumnę dwójkową utworzoną z dwuszeregu zamienia się w dwuszereg komendą „W lewo – ZWROT”. „W szereg, w lewo – FRONT” dotyczy kolumny utworzonej komendą „W dwójki, w prawo – ZWROT”.'
          : '„W szereg, w lewo – FRONT” wykonuje się z kolumny dwójkowej utworzonej komendą „W dwójki, w prawo – ZWROT”.',
        ['76'],
      );

const soldierRefRule =
  (refOf: (command: CommandAst) => SoldierRef | null): Rule =>
  (command, state) => {
    const ref = refOf(command);
    if (!ref || ref.kind === 'flank') return null;
    const soldier = resolveSoldier(state, ref);
    if (!soldier) {
      const names = state.soldiers.map((s) => s.surname.nominative).join(', ');
      return violation('E_PRECOND_STATE', `Szeregowego ${ref.surname} nie ma w składzie drużyny. Skład: ${names}.`, ['73']);
    }
    const front = state.squad.layout ? ranksOf(state.squad.layout)[0] : undefined;
    if (front && !front.some((slot) => slot.id === soldier.id)) {
      return violation(
        'E_PRECOND_STATE',
        `Szeregowy ${soldier.surname.nominative} stoi w drugim szeregu. Wskazuje się żołnierza pierwszego szeregu.`,
        ['73'],
      );
    }
    return null;
  };

const notExtended: Rule = (_command, state) =>
  state.squad.extension
    ? violation('E_PRECOND_STATE', 'Drużyna już odstąpiła. Najpierw połącz szyk komendą „… – ŁĄCZ”.', ['73'])
    : null;

const extended: Rule = (_command, state) =>
  state.squad.extension
    ? null
    : violation('E_PRECOND_STATE', 'Nie było odstępowania, więc nie ma czego łączyć. Łączenie odwraca „… – ODSTĄP”.', ['73']);

// ---------------------------------------------------------------------------- ruch (E4)

const MOTION_NAMES: Readonly<Record<ReturnType<typeof squadMotion>, string>> = {
  STANDING: 'stoi',
  MARCHING: 'maszeruje',
  MARCHING_IN_PLACE: 'maszeruje w miejscu',
  RUNNING: 'biegnie',
  WHEELING: 'zachodzi',
};

const motionViolation = (state: SimState, hint: string, points: readonly string[]): RuleViolation =>
  violation('E_PRECOND_MOTION', `Drużyna ${MOTION_NAMES[squadMotion(state)]}. ${hint}`, points);

/** Komendy wykonywane w miejscu: drużyna musi stać (w marszu reguła BACZNOŚĆ nie obowiązuje, COMMANDS 0.2). */
const standing =
  (hint: string, points: readonly string[]): Rule =>
  (_command, state) =>
    squadMotion(state) === 'STANDING' ? null : motionViolation(state, hint, points);

const STOP_FIRST = 'Najpierw zatrzymaj ją: „Drużyna – STÓJ”.';

/** Dopuszczalne stany ruchu; w pozostałych E_PRECOND_MOTION z podpowiedzią. */
const motionIn =
  (allowed: readonly ReturnType<typeof squadMotion>[], hint: string, points: readonly string[]): Rule =>
  (_command, state) =>
    allowed.includes(squadMotion(state)) ? null : motionViolation(state, hint, points);

/** Z postoju — szyk i postawa zasadnicza (pkt 11, 24); w ruchu te warunki nie obowiązują. */
const fromStandingInFormation: Rule = (command, state, context) =>
  squadMotion(state) === 'STANDING' ? (inFormation(command, state, context) ?? atAttention(command, state, context)) : null;

const marchFormation =
  (message: string, points: readonly string[]): Rule =>
  (_command, state) =>
    state.squad.formation === 'FILE' || state.squad.formation === 'COLUMN_OF_TWOS'
      ? null
      : violation('E_PRECOND_FORMATION', message, points);

/** I-15: „Za mną” tylko w ugrupowaniu marszowym. */
const followFormation: Rule = (_command, state) =>
  followAllowed(state.squad.formation)
    ? null
    : violation(
        'E_PRECOND_FORMATION',
        '„Za mną – MARSZ” podaje się drużynie w rzędzie lub kolumnie dwójkowej. Z szeregu: najpierw „W prawo – ZWROT”; do zmiany frontu szyku rozwiniętego służy zachodzenie.',
        ['24', '100'],
      );

/** M-8: z biegu nie zatrzymuje się (pkt 29). */
const notRunning: Rule = (_command, state) =>
  squadMotion(state) === 'RUNNING'
    ? violation('E_RULE', 'Z biegu nie zatrzymuje się drużyny: najpierw „Zwykły – KROK”, potem „Drużyna – STÓJ” (pkt 29).', ['29'])
    : null;

/** M-6: z kroku defiladowego do zwykłego przechodzi się komendą SPOCZNIJ (pkt 26). */
const notParadeStep: Rule = (_command, state) =>
  state.squad.march?.step === 'PARADE' && squadMotion(state) === 'MARCHING'
    ? violation('E_RULE', 'Drużyna maszeruje krokiem defiladowym. Z kroku defiladowego na zwykły przechodzi się komendą „SPOCZNIJ”.', ['26'])
    : null;

const countedByTwosInMarch: Rule = (_command, state) => {
  const mode = state.squad.countMode;
  return mode?.n === 2 && mode.inMarch
    ? null
    : violation(
        'E_PRECOND_COUNT',
        'Do utworzenia dwójek w marszu potrzebne jest odliczenie „do dwóch” w marszu (w rzędzie): najpierw „Do dwóch – ODLICZ”.',
        ['72', '77'],
      );
};

/** I-4: w miejscu — szyk rozwinięty; w marszu — tylko rząd, w marszu (nie w biegu i nie w miejscu). */
const countRules: Rule = (command, state, context) => {
  const rules: readonly Rule[] =
    squadMotion(state) === 'STANDING'
      ? [inFormation, countFormation, atAttention]
      : [
          motionIn(['MARCHING'], 'Odliczanie w ruchu wykonuje się w marszu (nie w biegu ani w miejscu).', ['72']),
          (_c, s) =>
            countAllowedInMarch(s.squad.formation)
              ? null
              : violation('E_PRECOND_FORMATION', 'Odliczanie w marszu wykonuje się w rzędzie (I-4) — z rzędu tworzy się dwójki komendą „W dwójki – W PRZÓD”.', ['72']),
        ];
  for (const rule of rules) {
    const r = rule(command, state, context);
    if (r) return r;
  }
  return null;
};

/** I-13: w czasie zachodzenia dozwolone tylko zatrzymanie, rozejście, WRÓĆ i postawy. */
const notWheeling: Rule = (command, state) =>
  squadMotion(state) === 'WHEELING' && !['M-8', 'ZB-4', 'X-1', 'P-1', 'P-2', 'P-3'].includes(command.id)
    ? violation('E_PRECOND_MOTION', 'Drużyna zachodzi — zachodzenie trwa do komendy „Drużyna – STÓJ” (pkt 75).', ['75'])
    : null;

const onlyFormation =
  (formation: SimState['squad']['formation'], message: string, points: readonly string[]): Rule =>
  (_command, state) =>
    state.squad.formation === formation ? null : violation('E_PRECOND_FORMATION', message, points);

// ---------------------------------------------------------------------------- warunki komend

const extendRef = (c: CommandAst): SoldierRef | null => (c.id === 'O-1' ? c.from : null);
const closeRef = (c: CommandAst): SoldierRef | null => (c.id === 'O-2' ? c.to : null);

const IN_PLACE = `Komendy w miejscu podaje się drużynie stojącej. ${STOP_FIRST}`;
const NO_ASSEMBLY_IN_MARCH = `Zbiórka w marszu jest poza zakresem symulatora. ${STOP_FIRST}`;

const RULES: Partial<Record<CommandAst['id'], readonly Rule[]>> = {
  'Z-1': [
    standing(`Zwroty w miejscu wykonuje drużyna stojąca; w marszu kierunek zmienia się komendą „Kierunek – W PRAWO” (pkt 30). ${STOP_FIRST}`, ['22', '30']),
    inFormation,
    atAttention,
  ],
  'ZB-1': [standing(NO_ASSEMBLY_IN_MARCH, ['69']), summoned],
  'ZB-2': [standing(NO_ASSEMBLY_IN_MARCH, ['69']), summoned],
  'ZB-3': [standing(NO_ASSEMBLY_IN_MARCH, ['69']), summoned, previousPlaceKnown],
  'R-1': [standing(IN_PLACE, ['71']), inFormation, dressFormation, atAttention],
  'R-2': [countRules],
  'O-1': [standing(IN_PLACE, ['73']), inFormation, extendFormation, atAttention, notExtended, soldierRefRule(extendRef)],
  'O-2': [standing(IN_PLACE, ['73']), extended, atAttention, soldierRefRule(closeRef)],
  'S-1': [standing(IN_PLACE, ['76']), inFormation, singleRankForTwos, atAttention, countedByTwos],
  'S-2': [standing(IN_PLACE, ['76']), inFormation, columnFromTwos, atAttention],
  'S-3': [standing(IN_PLACE, ['74']), inFormation, atAttention],
  'S-4': [
    standing(`Zachodzenie rozpoczyna się z postoju; w marszu kierunek zmienia się komendą „Kierunek – W PRAWO (W LEWO)”. ${STOP_FIRST}`, ['75']),
    inFormation,
    deployedOnly('Zachodzenie (zmiana frontu) dotyczy szeregu i dwuszeregu. Kolumna zmienia kierunek w marszu: „Kierunek – W PRAWO”.', ['75']),
    atAttention,
  ],
  'M-1': [standing('W marszu kierunek zmienia się komendą „Kierunek – W LEWO (W PRAWO…)” (pkt 30).', ['24', '30']), inFormation, atAttention],
  'M-2': [
    inFormation,
    followFormation,
    motionIn(['STANDING', 'MARCHING'], '„Za mną – MARSZ” podaje się drużynie stojącej albo maszerującej.', ['24']),
    fromStandingInFormation,
  ],
  'M-3': [
    motionIn(['STANDING', 'MARCHING', 'MARCHING_IN_PLACE'], 'Z biegu najpierw „Zwykły – KROK”, potem „W miejscu – MARSZ”.', ['27', '28']),
    fromStandingInFormation,
  ],
  'M-4': [
    motionIn(['STANDING', 'MARCHING_IN_PLACE'], '„Na wprost – MARSZ” podaje się drużynie maszerującej w miejscu albo stojącej.', ['27']),
    fromStandingInFormation,
  ],
  'M-5': [fromStandingInFormation],
  'M-6': [
    motionIn(
      ['MARCHING', 'MARCHING_IN_PLACE', 'RUNNING'],
      '„Zwykły – KROK” zmienia krok w ruchu. Z miejsca: „Drużyna, kierunek na wprost – MARSZ”.',
      ['28'],
    ),
    notParadeStep,
  ],
  'M-7': [motionIn(['MARCHING'], '„Dowolny – KROK” podaje się drużynie maszerującej (nie w biegu ani w miejscu).', ['102'])],
  'M-8': [notRunning, motionIn(['MARCHING', 'MARCHING_IN_PLACE', 'WHEELING'], 'Nie ma czego zatrzymywać.', ['29'])],
  'M-9': [motionIn(['MARCHING', 'RUNNING'], 'Z miejsca kierunek podaje się w komendzie marszu: „Drużyna, kierunek w lewo – MARSZ”.', ['30', '24'])],
  'M-10': [
    marchFormation('„Czoło – STÓJ” dotyczy kolumny (rząd, kolumna dwójkowa). Szyk rozwinięty zatrzymuje się komendą „Drużyna – STÓJ”.', ['100']),
    motionIn(['MARCHING'], '„Czoło – STÓJ” podaje się kolumnie maszerującej.', ['100']),
  ],
  'M-11': [
    marchFormation('„Stawaj – W LEWO (W PRAWO)” dotyczy kolumny (rząd, kolumna dwójkowa).', ['100']),
    motionIn(['MARCHING'], '„Stawaj – W LEWO (W PRAWO)” podaje się kolumnie maszerującej.', ['100']),
  ],
  'MS-1': [
    onlyFormation('COLUMN_OF_TWOS', '„W rząd – W TYŁ” wykonuje kolumna dwójkowa w marszu.', ['77']),
    motionIn(['MARCHING'], '„W rząd – W TYŁ” wykonuje się w marszu.', ['77']),
  ],
  'MS-2': [
    onlyFormation('FILE', '„W dwójki – W PRZÓD” wykonuje rząd w marszu.', ['77']),
    motionIn(['MARCHING'], '„W dwójki – W PRZÓD” wykonuje się w marszu (z miejsca, w szeregu: „W dwójki, w prawo – ZWROT”).', ['77']),
    countedByTwosInMarch,
  ],
  'X-1': [hasHistory],
};

// ---------------------------------------------------------------------------- uwagi

const noEffect = (message: string, points: readonly string[]): RuleViolation[] => [violation('W_NO_EFFECT', message, points)];

/** I-3: zmiana kierunku w szyku rozwiniętym — wykonanie indywidualne, szyk staje się marszowym. */
function directionDeployed(): RuleViolation {
  return violation(
    'W_DIRECTION_DEPLOYED',
    'Szyk rozwinięty zmienia kierunek marszu indywidualnie (pkt 24) — szereg staje się rzędem, dwuszereg kolumną. Do zmiany frontu szyku rozwiniętego służy zachodzenie: „Drużyna, w prawo zachodź – MARSZ” (pkt 75).',
    ['24', '75'],
  );
}

const sideways = (direction: string): boolean => direction !== 'FORWARD' && direction !== 'ABOUT_LEFT' && direction !== 'ABOUT_RIGHT';

function marchWarnings(command: CommandAst, state: SimState): RuleViolation[] | null {
  const march = state.squad.march;
  if (!march) return null;
  const motion = squadMotion(state);
  switch (command.id) {
    case 'P-1':
      return noEffect('Drużyna jest w ruchu — wezwanie niczego nie zmienia.', ['69']);
    case 'P-2':
      if (motion !== 'MARCHING') return noEffect(`Drużyna ${MOTION_NAMES[motion]} — BACZNOŚĆ zmienia krok tylko w marszu.`, ['25']);
      return march.step === 'PARADE' ? noEffect('Drużyna już maszeruje krokiem defiladowym.', ['25']) : [];
    case 'P-3':
      return march.step === 'PARADE' ? [] : noEffect('Drużyna nie maszeruje krokiem defiladowym — SPOCZNIJ niczego nie zmienia.', ['26']);
    case 'M-3':
      return motion === 'MARCHING_IN_PLACE' ? noEffect('Drużyna już maszeruje w miejscu.', ['27']) : [];
    case 'M-5':
      return motion === 'RUNNING' ? noEffect('Drużyna już biegnie.', ['28']) : [];
    case 'M-6':
      if (motion === 'RUNNING' || march.step === 'ROUTE' || march.awaitingQuickStep) return [];
      return noEffect('Drużyna już maszeruje krokiem zwykłym.', ['28']);
    case 'M-7':
      return march.step === 'ROUTE' ? noEffect('Drużyna już maszeruje krokiem dowolnym.', ['102']) : [];
    case 'M-9':
      return isDeployed(state.squad.formation) && sideways(command.direction) ? [directionDeployed()] : [];
    default:
      return [];
  }
}

function warningsFor(command: CommandAst, state: SimState): RuleViolation[] {
  const inMarch = marchWarnings(command, state);
  if (inMarch) return inMarch;
  const { squad, soldiers } = state;
  const inRanks = squad.formation !== 'DISPERSED';
  const allAttention = soldiers.every((s) => s.posture === 'ATTENTION');
  const allAtEase = soldiers.every((s) => s.posture === 'AT_EASE');
  switch (command.id) {
    case 'M-1':
      return isDeployed(squad.formation) && sideways(command.direction) ? [directionDeployed()] : [];
    case 'P-1':
    case 'P-2':
      if (inRanks && allAttention && squad.headsTurned === null) {
        return [violation('W_NO_EFFECT', 'Drużyna już stoi w postawie zasadniczej.', ['18'])];
      }
      return [];
    case 'P-3':
      if (allAtEase && (!inRanks || !squad.irregularSpacing)) {
        return [violation('W_NO_EFFECT', 'Drużyna już stoi w postawie swobodnej.', ['20'])];
      }
      return [];
    case 'Z-1': {
      if (squad.formation === 'DISPERSED' || command.direction === 'ABOUT') return [];
      const after = formationAfterTurn(squad.formation, command.direction);
      if (after.regular) return [];
      const message = isDeployed(squad.formation)
        ? `Rząd i kolumnę z szeregu (dwuszeregu) formuje się zwrotem w prawo — „W prawo – ZWROT”. Zwrot w lewo daje ${FORMATION_NAMES[after.formation]} z czołem na dotychczasowym lewym skrzydle.`
        : `Szereg i dwuszereg z rzędu (kolumny) formuje się zwrotem w lewo — „W lewo – ZWROT”. Zwrot w prawo daje ${FORMATION_NAMES[after.formation]} frontem w przeciwną stronę.`;
      return [violation('W_FORMATION_DIRECTION', message, ['76'])];
    }
    default:
      return [];
  }
}

export function checkState(command: CommandAst, state: SimState, context: StateContext): StateVerdict {
  const rules: Rule[] = [notBusy, headsStraight, notWheeling, ...(RULES[command.id] ?? [])];
  for (const rule of rules) {
    const result = rule(command, state, context);
    if (result) return { errors: [result], warnings: [] };
  }
  return { errors: [], warnings: warningsFor(command, state) };
}
