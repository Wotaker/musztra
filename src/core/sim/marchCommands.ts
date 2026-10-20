import type { CommandAst } from '../grammar/ast';
import { activity } from './actions';
import { DISTANCE, COLUMN_INTERVAL, STEP } from './constants';
import { BUBBLE_TIME, COUNT_INTERVAL, countNumberFor } from './executePlace';
import { leftFlankId, rightFlankId } from './formation';
import {
  DIRECTION_ANGLE,
  STEP_TIME,
  schedule,
  startFollow,
  startHeadHalt,
  startMarch,
  startWheel,
  THREE_STEPS,
  trailAt,
  halt,
} from './march';
import { PlanBuilder, withPlan } from './plan';
import type { Follower, MarchState, SimState } from './state';

/**
 * Wykonanie komend marszowych (COMMANDS M, MS, S-4; R-2 w marszu). Warunki sprawdza
 * `semantics/preconditions.ts`; tu tylko skutki.
 */

/** Długość kroku biegu (pkt 28). */
const RUN_STEP = 0.9;

const withMarch = (state: SimState, march: MarchState): SimState => ({ ...state, squad: { ...state.squad, march } });

/** Koniec „Za mną”: kierunkowy prowadzi dalej sam, od swojego miejsca na śladzie. */
function endFollow(march: MarchState): MarchState {
  if (!march.follow) return march;
  const guide = [...march.followers].sort((a, b) => b.s - a.s)[0];
  if (!guide) return { ...march, follow: false };
  const at = trailAt(march.trail, guide.s, march.heading);
  const trail = [...march.trail.filter((p) => p.s < guide.s), { s: guide.s, p: at.p }];
  return { ...march, follow: false, followHalted: false, trail, heading: at.heading, turnLeft: 0 };
}

/** Zdarzenie po jeszcze jednym kroku: w marszu — po drodze, w miejscu — po czasie. */
function afterOneStep(state: SimState, march: MarchState, event: Parameters<typeof schedule>[1]['event'], length = STEP): MarchState {
  const inPlace = march.motion === 'MARCHING_IN_PLACE' || (march.follow && march.followHalted);
  return schedule(
    march,
    inPlace
      ? { at: state.time + STEP_TIME, basis: 'time', event: event.kind === 'HALT' ? { ...event, inPlace: true } : event }
      : { at: march.distance + length, basis: 'distance', event },
  );
}

function countInMarch(state: SimState, n: number | null): SimState {
  const march = state.squad.march;
  if (!march) return state;
  // Pkt 72: żołnierze odliczają nie zmieniając tempa marszu i kolejno zwracają głowy w lewo — od czoła.
  const order = [...march.followers].sort((a, b) => b.s - a.s || a.lateral - b.lateral);
  const soldiers = state.soldiers.map((s) => {
    const index = order.findIndex((f) => f.id === s.id);
    if (index < 0) return s;
    const number = countNumberFor(index, n);
    const plan = new PlanBuilder({ position: s.position, facing: s.facing })
      .wait(0.3 + index * COUNT_INTERVAL)
      .act({
        head: 'LEFT',
        countNumber: number,
        say: { text: String(number), tone: 'number', duration: BUBBLE_TIME },
        report: { text: String(number), kind: 'count' },
      })
      .wait(0.4)
      .act({ head: 'FRONT' });
    return withPlan({ ...s, countNumber: null }, plan.build());
  });
  return { ...state, soldiers, squad: { ...state.squad, countMode: { n, inMarch: true }, activity: activity('R-2') } };
}

/** „W rząd – W TYŁ” (MS-1): lewy rząd przechodzi za prawych sąsiadów, reszta skraca krok. */
function fileBack(state: SimState): SimState {
  const march = state.squad.march;
  if (!march) return state;
  const order = [...march.followers].sort((a, b) => b.s - a.s || a.lateral - b.lateral);
  const followers: Follower[] = march.followers.map((f) => ({ ...f, depth: order.indexOf(f) * DISTANCE, targetLateral: 0 }));
  return {
    ...state,
    squad: {
      ...state.squad,
      formation: 'FILE',
      formedFromTwos: false,
      march: { ...march, followers },
      activity: activity('MS-1'),
    },
  };
}

/** „W dwójki – W PRZÓD” (MS-2): dwójki przesuwają się w przód na lewo od poprzedników; czoło skraca krok. */
function twosForward(state: SimState): SimState {
  const march = state.squad.march;
  if (!march) return state;
  const order = [...march.followers].sort((a, b) => b.s - a.s);
  const numbers = new Map(state.soldiers.map((s) => [s.id, s.countNumber]));
  const targets = new Map<number, { depth: number; lateral: number }>();
  let pair = -1;
  let open = false;
  for (const f of order) {
    if (numbers.get(f.id) === 2 && open) {
      targets.set(f.id, { depth: pair * DISTANCE, lateral: COLUMN_INTERVAL });
      open = false;
    } else {
      pair++;
      targets.set(f.id, { depth: pair * DISTANCE, lateral: 0 });
      open = true;
    }
  }
  const followers = march.followers.map((f) => {
    const t = targets.get(f.id);
    return t ? { ...f, depth: t.depth, targetLateral: t.lateral } : f;
  });
  return {
    ...state,
    squad: {
      ...state.squad,
      formation: 'COLUMN_OF_TWOS',
      march: { ...march, followers, awaitingQuickStep: true, quickStepWarned: false },
      activity: activity('MS-2'),
    },
  };
}

export function executeMarchCommand(state: SimState, command: CommandAst): SimState {
  const march = state.squad.march;
  switch (command.id) {
    case 'M-1':
      return startMarch(state, { direction: command.direction, motion: 'MARCHING', follow: false });
    case 'M-2':
      if (march) return withMarch(state, { ...startFollow(state, endFollow(march)), motion: 'MARCHING' });
      return startMarch(state, { direction: 'FORWARD', motion: 'MARCHING', follow: true });
    case 'M-3':
      if (!march) return startMarch(state, { direction: 'FORWARD', motion: 'MARCHING_IN_PLACE', follow: false });
      return withMarch(state, afterOneStep(state, endFollow(march), { kind: 'MARK_TIME' }));
    case 'M-4':
      if (!march) return startMarch(state, { direction: 'FORWARD', motion: 'MARCHING', follow: false });
      return withMarch(state, afterOneStep(state, march, { kind: 'FORWARD' }));
    case 'M-5':
      if (!march) return startMarch(state, { direction: 'FORWARD', motion: 'RUNNING', follow: false });
      return withMarch(state, afterOneStep(state, march, { kind: 'RUN' }));
    case 'M-6':
      if (!march) return state;
      // Pkt 28: z biegu jeszcze trzy kroki biegiem, potem krok zwykły.
      if (march.motion === 'RUNNING') return withMarch(state, schedule(march, { at: march.distance + 3 * RUN_STEP, basis: 'distance', event: { kind: 'QUICK' } }));
      return withMarch(state, { ...march, step: 'QUICK', awaitingQuickStep: false });
    case 'M-7':
      return march ? withMarch(state, { ...march, step: 'ROUTE' }) : state;
    case 'M-8':
      if (!march) return state;
      if (march.kind === 'WHEEL') return halt(state, 'ATTENTION');
      // Pkt 29, 100: jeszcze jeden krok i zatrzymanie, wszyscy jednocześnie.
      return withMarch(state, endFollow(afterOneStep(state, march, { kind: 'HALT' })));
    case 'M-9':
      if (!march) return state;
      // Pkt 30: kierunkowy robi trzy kroki na wprost, potem zmienia kierunek.
      return withMarch(
        state,
        schedule(endFollow(march), {
          at: march.distance + 3 * (march.motion === 'RUNNING' ? RUN_STEP : STEP),
          basis: 'distance',
          event: { kind: 'TURN', delta: DIRECTION_ANGLE[command.direction] },
        }),
      );
    case 'M-10':
      return march ? startHeadHalt(withMarch(state, endFollow(march)), null) : state;
    case 'M-11':
      return march ? startHeadHalt(withMarch(state, endFollow(march)), command.side === 'LEFT' ? -90 : 90) : state;
    case 'MS-1':
      return fileBack(state);
    case 'MS-2':
      return twosForward(state);
    case 'S-4': {
      const layout = state.squad.layout;
      if (!layout) return state;
      const pivot = command.side === 'RIGHT' ? rightFlankId(layout) : leftFlankId(layout);
      return pivot === undefined ? state : startWheel(state, pivot, command.side === 'RIGHT' ? 1 : -1);
    }
    case 'R-2':
      return countInMarch(state, command.countTo);
    default:
      return state;
  }
}

export { THREE_STEPS };
