import type { CommandId } from '../grammar/ast';
import type { Formation, Motion, Posture, SimState } from './state';

/** Opis stanu drużyny po polsku — pasek stanu (SPEC 3.1), komunikaty, prompt LLM. */

export const FORMATION_NAMES: Readonly<Record<Formation, string>> = {
  SINGLE_RANK: 'szereg',
  DOUBLE_RANK: 'dwuszereg',
  FILE: 'rząd',
  COLUMN_OF_TWOS: 'kolumna dwójkowa',
  DISPERSED: 'rozproszona',
};

export const POSTURE_NAMES: Readonly<Record<Posture, string>> = {
  ATTENTION: 'zasadnicza',
  AT_EASE: 'swobodna',
};

export const MOTION_NAMES: Readonly<Record<Motion, string>> = {
  STANDING: 'stoi',
  MARCHING: 'marsz',
  MARCHING_IN_PLACE: 'marsz w miejscu',
  RUNNING: 'bieg',
};

/** Nazwa czynności w toku (pasek stanu). */
export const ACTIVITY_NAMES: Partial<Readonly<Record<CommandId, string>>> = {
  'P-1': 'zwrot do dowódcy',
  'P-2': 'postawa zasadnicza',
  'P-3': 'wyrównanie i krycie',
  'Z-1': 'zwrot',
  'ZB-1': 'zbiórka',
  'ZB-2': 'zbiórka',
  'ZB-3': 'zbiórka',
  'ZB-4': 'rozejście',
  'R-1': 'równanie',
  'R-2': 'odliczanie',
  'O-1': 'odstępowanie',
  'O-2': 'łączenie',
  'S-1': 'formowanie dwójek',
  'S-2': 'formowanie szeregu',
  'S-3': 'przesunięcie',
  'X-1': 'powrót (WRÓĆ)',
};

export interface StatusSummary {
  readonly formation: string;
  readonly posture: string;
  readonly motion: string;
  /** Front w stopniach albo `null` w stanie rozproszonym. */
  readonly facing: number | null;
  readonly activity: string | null;
  readonly flags: readonly string[];
}

export function describeStatus(state: SimState): StatusSummary {
  const { squad, soldiers } = state;
  const postures = new Set(soldiers.map((s) => s.posture));
  const motions = new Set(soldiers.map((s) => s.motion));
  const flags: string[] = [];
  if (squad.formation === 'DOUBLE_RANK' && soldiers.length % 2 === 1) flags.push('niepełny');
  if (squad.formation === 'COLUMN_OF_TWOS' && soldiers.length % 2 === 1) flags.push('niepełna');
  if (squad.countMode) flags.push(squad.countMode.n === null ? 'odliczona kolejno' : `odliczona do ${String(squad.countMode.n)}`);
  if (squad.extension) flags.push('odstąpiona');
  if (squad.irregularSpacing) flags.push('odstępy nieregulaminowe');
  if (squad.headsTurned) flags.push('głowy zwrócone');
  return {
    formation: FORMATION_NAMES[squad.formation],
    posture: postures.size === 1 ? POSTURE_NAMES[[...postures][0] ?? 'AT_EASE'] : 'różne',
    motion: motions.size === 1 ? MOTION_NAMES[[...motions][0] ?? 'STANDING'] : 'różny',
    facing: squad.layout ? Math.round(squad.layout.facing) % 360 : null,
    activity: squad.activity ? (ACTIVITY_NAMES[squad.activity.commandId] ?? 'wykonuje komendę') : null,
    flags,
  };
}
