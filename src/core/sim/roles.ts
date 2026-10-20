import type { SoldierRef } from '../grammar/ast';
import { leftFlankId, rightFlankId } from './formation';
import type { SimState, Soldier } from './state';

/** Żołnierz wskazany w komendzie: skrzydłowy pierwszego szeregu albo po nazwisku (COMMANDS O-1, O-2). */
export function resolveSoldier(state: SimState, ref: SoldierRef): Soldier | undefined {
  const layout = state.squad.layout;
  if (ref.kind === 'flank') {
    if (!layout) return undefined;
    const id = ref.side === 'RIGHT' ? rightFlankId(layout) : leftFlankId(layout);
    return state.soldiers.find((s) => s.id === id);
  }
  const wanted = ref.surname.toLocaleLowerCase('pl');
  return state.soldiers.find((s) => s.surname.nominative.toLocaleLowerCase('pl') === wanted);
}
