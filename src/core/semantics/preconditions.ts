import type { CommandAst, SoldierRef } from '../grammar/ast';
import {
  allowedWhileBusy,
  assemblyNeedsSummons,
  countAllowedInPlace,
} from '../interpretations';
import { formationAfterTurn, isDeployed, ranksOf } from '../sim/formation';
import { resolveSoldier } from '../sim/roles';
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

// ---------------------------------------------------------------------------- warunki komend

const extendRef = (c: CommandAst): SoldierRef | null => (c.id === 'O-1' ? c.from : null);
const closeRef = (c: CommandAst): SoldierRef | null => (c.id === 'O-2' ? c.to : null);

const RULES: Partial<Record<CommandAst['id'], readonly Rule[]>> = {
  'Z-1': [inFormation, atAttention],
  'ZB-1': [summoned],
  'ZB-2': [summoned],
  'ZB-3': [summoned, previousPlaceKnown],
  'R-1': [inFormation, dressFormation, atAttention],
  'R-2': [inFormation, countFormation, atAttention],
  'O-1': [inFormation, extendFormation, atAttention, notExtended, soldierRefRule(extendRef)],
  'O-2': [extended, atAttention, soldierRefRule(closeRef)],
  'S-1': [inFormation, singleRankForTwos, atAttention, countedByTwos],
  'S-2': [inFormation, columnFromTwos, atAttention],
  'S-3': [inFormation, atAttention],
  'X-1': [hasHistory],
};

// ---------------------------------------------------------------------------- uwagi

function warningsFor(command: CommandAst, state: SimState): RuleViolation[] {
  const { squad, soldiers } = state;
  const inRanks = squad.formation !== 'DISPERSED';
  const allAttention = soldiers.every((s) => s.posture === 'ATTENTION');
  const allAtEase = soldiers.every((s) => s.posture === 'AT_EASE');
  switch (command.id) {
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
  const rules: Rule[] = [notBusy, headsStraight, ...(RULES[command.id] ?? [])];
  for (const rule of rules) {
    const result = rule(command, state, context);
    if (result) return { errors: [result], warnings: [] };
  }
  return { errors: [], warnings: warningsFor(command, state) };
}
