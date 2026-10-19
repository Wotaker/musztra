import type { CommandAst } from '../grammar/ast';
import { layoutPositions } from './formation';
import { distance } from './geometry';
import { PlanBuilder, withPlan } from './plan';
import type { Activity, Effects, Layout, SimState, Soldier } from './state';

/** Wspólne elementy wykonania komend: czynność w toku, plany, drobne korekty miejsca. */

/** Prędkość drobnych korekt miejsca (wyrównanie, krycie). */
export const SHUFFLE_SPEED = 0.9;

export function activity(commandId: CommandAst['id'], blocking = true): Activity {
  return { commandId, blocking };
}

export function planFor(soldier: Soldier): PlanBuilder {
  return new PlanBuilder({ position: soldier.position, facing: soldier.facing });
}

/** Zatrzymanie żołnierza w miejscu (przerwanie planu) z zachowaniem bieżącego położenia. */
export const halted = (s: Soldier): Soldier => withPlan(s, []);

/** Plan przejścia na miejsca układu drobnymi krokami, bez zmiany frontu, i skutki na końcu. */
export function shuffleTo(state: SimState, layout: Layout, finalEffects: Effects): { soldiers: Soldier[]; moved: boolean } {
  const targets = layoutPositions(layout);
  let moved = false;
  const soldiers = state.soldiers.map((s) => {
    const target = targets.get(s.id) ?? s.position;
    const plan = planFor(s);
    const d = distance(s.position, target);
    if (d > 0.01) {
      moved = true;
      plan.lerp(target, 0, Math.max(0.5, d / SHUFFLE_SPEED), 'SHUFFLE', true);
    }
    plan.act(finalEffects);
    return withPlan(s, plan.build());
  });
  return { soldiers, moved };
}
