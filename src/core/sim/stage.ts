import type { Stage } from '../catalog';

/**
 * Najwyższy etap (SPEC 10), którego komendy są już wykonywane na placu. Komendy późniejszych etapów
 * są rozpoznawane i sprawdzane, ale nie zmieniają stanu — panel informuje, w którym etapie dojdą;
 * przykłady katalogu zależne od ich stanu pozostają testami „do zrobienia”.
 */
export const SIMULATED_STAGE: Stage = 'E3';

const ORDER: readonly Stage[] = ['E2', 'E3', 'E4'];

export function isSimulated(stage: Stage | null): boolean {
  return stage !== null && ORDER.indexOf(stage) <= ORDER.indexOf(SIMULATED_STAGE);
}
