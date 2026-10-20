import { DT, MARCH_SPEED, RUN_SPEED } from './constants';
import { angleDelta, bearing, distance, easeInOut, lerpVec, normalizeAngle, vec } from './geometry';
import { marchTransitional, stepMarch } from './march';
import { isBusy } from './plan';
import type { Commander, Report, SimState, Soldier } from './state';

/**
 * Symulacja ze stałym krokiem czasu (SPEC 5.5): `step` wykonuje jeden krok 1/60 s,
 * `simulate` — tyle kroków, ile mieści się w podanym czasie (reszta czeka w akumulatorze).
 * Wynik nie zależy od liczby klatek ani prędkości symulacji.
 */

/** Prędkość obrotu dowódcy w stronę ruchu (°/s). */
const COMMANDER_TURN_RATE = 540;

function stepSoldier(soldier: Soldier, time: number, reports: Report[]): Soldier {
  let s = soldier;
  let remaining = DT;
  let guard = 0;
  while (remaining > 1e-12 && s.planIndex < s.plan.length && guard++ < 64) {
    const segment = s.plan[s.planIndex];
    if (!segment) break;
    const now = time + (DT - remaining);
    if (segment.kind === 'act') {
      const e = segment.effects;
      s = {
        ...s,
        ...(e.posture ? { posture: e.posture } : {}),
        ...(e.head ? { head: e.head } : {}),
        ...(e.countNumber !== undefined ? { countNumber: e.countNumber } : {}),
        ...(e.say ? { bubble: { text: e.say.text, tone: e.say.tone, from: now, until: now + e.say.duration } } : {}),
        ...(e.raiseLeftArm !== undefined ? { armRaisedUntil: now + e.raiseLeftArm } : {}),
        planIndex: s.planIndex + 1,
        segmentTime: 0,
        segmentStart: null,
      };
      if (e.report) reports.push({ time: now, soldierId: s.id, text: e.report.text, kind: e.report.kind });
      continue;
    }
    const start = s.segmentStart ?? { position: s.position, facing: s.facing };
    const used = Math.min(segment.duration - s.segmentTime, remaining);
    const segmentTime = s.segmentTime + used;
    remaining -= used;
    const done = segmentTime >= segment.duration - 1e-9;
    if (segment.kind === 'wait') {
      s = done
        ? { ...s, gait: 'STAND', planIndex: s.planIndex + 1, segmentTime: 0, segmentStart: null }
        : { ...s, gait: 'STAND', segmentTime, segmentStart: start };
      continue;
    }
    const t = done ? 1 : segmentTime / segment.duration;
    const k = segment.ease ? easeInOut(t) : t;
    const position = done ? segment.to : lerpVec(start.position, segment.to, k);
    const facing = normalizeAngle(start.facing + segment.turn * k);
    const stride = s.stride + distance(s.position, position);
    s = done
      ? { ...s, position, facing, stride, gait: segment.gait, planIndex: s.planIndex + 1, segmentTime: 0, segmentStart: null }
      : { ...s, position, facing, stride, gait: segment.gait, segmentTime, segmentStart: start };
  }
  if (!isBusy(s) && (s.plan.length > 0 || s.gait !== 'STAND')) {
    s = { ...s, plan: [], planIndex: 0, segmentTime: 0, segmentStart: null, gait: 'STAND' };
  }
  const end = time + DT;
  if (s.bubble && s.bubble.until <= end) s = { ...s, bubble: null };
  if (s.armRaisedUntil !== null && s.armRaisedUntil <= end) s = { ...s, armRaisedUntil: null };
  return s;
}

function stepCommander(c: Commander): Commander {
  const { x, y, run } = c.input;
  let { position, heading, stride } = c;
  let gait: Commander['gait'];
  if (x !== 0 || y !== 0) {
    const norm = Math.hypot(x, y);
    const speed = run ? RUN_SPEED : MARCH_SPEED;
    const next = vec(position.x + (x / norm) * speed * DT, position.y + (y / norm) * speed * DT);
    stride += distance(position, next);
    position = next;
    heading = normalizeAngle(Math.round(bearing(vec(0, 0), vec(x, y)) / 45) * 45);
    gait = run ? 'RUN' : 'QUICK';
  } else {
    gait = 'STAND';
  }
  const delta = angleDelta(c.facing, heading);
  const maxTurn = COMMANDER_TURN_RATE * DT;
  const facing = Math.abs(delta) <= maxTurn ? heading : normalizeAngle(c.facing + Math.sign(delta) * maxTurn);
  return { ...c, position, heading, facing, stride, gait };
}

export function step(state: SimState): SimState {
  const reports: Report[] = [];
  const soldiers = state.soldiers.map((s) => stepSoldier(s, state.time, reports));
  const commander = stepCommander(state.commander);
  // Ruch ciągły (marsz, zachodzenie) po planach żołnierzy — dowódca już przesunięty („Za mną”).
  const moved = stepMarch({ ...state, soldiers, commander }, reports);
  const busy = moved.soldiers.some(isBusy) || marchTransitional(moved);
  const activity = moved.squad.activity && busy ? moved.squad.activity : null;
  return {
    ...moved,
    time: state.time + DT,
    tick: state.tick + 1,
    squad: activity === moved.squad.activity ? moved.squad : { ...moved.squad, activity },
    reports: reports.length > 0 ? [...state.reports, ...reports] : state.reports,
  };
}

/** `simulate(state, dt)` (SPEC 5.5): czas `dt` (już pomnożony przez prędkość symulacji). */
export function simulate(state: SimState, dt: number): SimState {
  const total = state.accumulator + dt;
  const steps = Math.floor(total / DT + 1e-6);
  let s = state;
  for (let i = 0; i < steps; i++) s = step(s);
  return { ...s, accumulator: Math.max(0, total - steps * DT) };
}

/** Czy drużyna wykonuje czynność przejściową albo ktoś jeszcze realizuje plan ruchu. */
export function isSettled(state: SimState): boolean {
  return state.squad.activity === null && !state.soldiers.some(isBusy);
}

/** Symulacja aż do zakończenia wszystkich planów (najwyżej `limit` s). */
export function settle(state: SimState, limit = 120): SimState {
  let s = state;
  const end = state.time + limit;
  while (!isSettled(s) && s.time < end) s = step(s);
  return s;
}
