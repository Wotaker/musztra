import { MARCH_SPEED, RUN_SPEED, TURN_TIME } from './constants';
import { angleDelta, distance, normalizeAngle, type Vec2 } from './geometry';
import type { Effects, Gait, Segment, Soldier } from './state';

/**
 * Plan ruchu żołnierza: ciąg odcinków (czekanie, przejście z obrotem, natychmiastowe skutki).
 * `PlanBuilder` śledzi przewidywane położenie, front i czas, więc odcinki można układać po kolei
 * i zsynchronizować między żołnierzami (`waitUntil`).
 */
export class PlanBuilder {
  private readonly segments: Segment[] = [];
  position: Vec2;
  facing: number;
  /** Czas od początku planu. */
  time = 0;

  constructor(start: { position: Vec2; facing: number }) {
    this.position = start.position;
    this.facing = start.facing;
  }

  wait(duration: number): this {
    if (duration > 1e-9) {
      this.segments.push({ kind: 'wait', duration });
      this.time += duration;
    }
    return this;
  }

  waitUntil(time: number): this {
    return this.wait(time - this.time);
  }

  /** Obrót w miejscu o `turn` stopni (ze znakiem: + w prawo). */
  turn(turn: number, duration: number = TURN_TIME): this {
    if (Math.abs(turn) < 1e-6) return this;
    return this.lerp(this.position, turn, duration, 'STAND', true);
  }

  /** Obrót najkrótszą drogą do frontu `facing`. */
  turnTo(facing: number, duration?: number): this {
    const delta = angleDelta(this.facing, facing);
    if (Math.abs(delta) < 1e-6) return this;
    return this.turn(delta, duration ?? Math.max(0.25, (TURN_TIME * Math.abs(delta)) / 90));
  }

  /** Przejście do punktu ze stałą prędkością, bez zmiany frontu. */
  move(to: Vec2, speed: number, gait: Gait): this {
    const d = distance(this.position, to);
    if (d < 1e-6) return this;
    return this.lerp(to, 0, d / speed, gait, false);
  }

  lerp(to: Vec2, turn: number, duration: number, gait: Gait, ease: boolean): this {
    this.segments.push({ kind: 'lerp', to, turn, duration: Math.max(duration, 1e-3), gait, ease });
    this.position = to;
    this.facing = normalizeAngle(this.facing + turn);
    this.time += Math.max(duration, 1e-3);
    return this;
  }

  act(effects: Effects): this {
    this.segments.push({ kind: 'act', effects });
    return this;
  }

  build(): Segment[] {
    return this.segments;
  }
}

export const speedOf = (running: boolean): number => (running ? RUN_SPEED : MARCH_SPEED);

/** Nadanie żołnierzowi nowego planu (przerywa bieżący). */
export function withPlan(soldier: Soldier, plan: readonly Segment[]): Soldier {
  return { ...soldier, plan, planIndex: 0, segmentTime: 0, segmentStart: null, gait: 'STAND' };
}

/** Czy żołnierz wykonuje jeszcze jakiś plan. */
export const isBusy = (soldier: Soldier): boolean => soldier.planIndex < soldier.plan.length;

/** Czas pozostały do końca planu (s). */
export function remainingTime(soldier: Soldier): number {
  let total = 0;
  soldier.plan.forEach((segment, i) => {
    if (i < soldier.planIndex || segment.kind === 'act') return;
    total += segment.duration - (i === soldier.planIndex ? soldier.segmentTime : 0);
  });
  return total;
}
