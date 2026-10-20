import type { CommandAst, Side } from '../grammar/ast';
import { LONE_SOLDIER_JOINS_LEFT_OF_LAST_PAIR, POSTURE_AFTER_CLOSE } from '../interpretations';
import { activity, planFor, shuffleTo } from './actions';
import { INTERVAL, MARCH_SPEED, STEP, TURN_TIME } from './constants';
import {
  fileGapsOf,
  hasRegulationSpacing,
  layoutFromPositions,
  layoutPositions,
  ranksOf,
  regularizedLayout,
} from './formation';
import { add, angleDelta, bearing, forward, rightOf, scale, type Vec2 } from './geometry';
import { PlanBuilder, speedOf, withPlan } from './plan';
import { resolveSoldier } from './roles';
import type { Effects, Head, Layout, SimState, Slot, Soldier } from './state';

/**
 * Wykonanie komend etapu E3 — równanie, odliczanie, zmiany szyku w miejscu, przesunięcie,
 * odstępowanie i łączenie (COMMANDS R, S, O). Warunki wstępne sprawdza `semantics/preconditions.ts`.
 */

/** Czas między liczbami w odliczaniu (COMMANDS R-2: dymki co ok. 0,5 s). */
export const COUNT_INTERVAL = 0.5;
/** Jak długo widać dymek z odzywką (SPEC 3.5: ok. 2 s). */
export const BUBBLE_TIME = 2;
/** Uniesienie lewej ręki przy „Jestem” (pkt 73: na sekundę). */
const ARM_TIME = 1;
/** Krok w miejscu, wykrok, przesunięcie o krok (s). */
const STEP_TIME = 0.55;

type Plans = Map<number, PlanBuilder>;

function startPlans(state: SimState): Plans {
  return new Map(state.soldiers.map((s) => [s.id, planFor(s)]));
}

function applyPlans(state: SimState, plans: Plans, update: (s: Soldier) => Soldier = (s) => s): Soldier[] {
  return state.soldiers.map((s) => {
    const plan = plans.get(s.id);
    return plan ? withPlan(update(s), plan.build()) : update(s);
  });
}

const plan = (plans: Plans, id: number): PlanBuilder => {
  const p = plans.get(id);
  if (!p) throw new Error(`Brak planu dla żołnierza nr ${String(id)}.`);
  return p;
};

/** Koniec najdłuższego planu. */
const endTime = (plans: Plans): number => Math.max(0, ...[...plans.values()].map((p) => p.time));

// ---------------------------------------------------------------------------- równanie (R-1, pkt 71)

function dress(state: SimState, side: Side): SimState {
  const { squad } = state;
  if (!squad.layout || squad.formation === 'DISPERSED') return state;
  const layout = regularizedLayout(squad.formation, squad.layout, {
    anchorSide: side,
    ...(squad.extension ? { fileGaps: fileGapsOf(squad.layout) } : {}),
  });
  // Głów nie zwracają skrzydłowi, do których się równa (prawy / lewy w każdym szeregu).
  const flanks = new Set(ranksOf(layout).map((rank) => (side === 'RIGHT' ? rank[0] : rank[rank.length - 1])?.id));
  const head: Head = side;
  const turned = { ...state, soldiers: state.soldiers.map((s) => (flanks.has(s.id) ? s : { ...s, head })) };
  const { soldiers, moved } = shuffleTo(turned, layout, {});
  return {
    ...state,
    soldiers,
    squad: { ...squad, layout, irregularSpacing: false, headsTurned: side, ...(moved ? { activity: activity('R-1') } : {}) },
  };
}

// ---------------------------------------------------------------------------- odliczanie (R-2, pkt 72)

/** Liczba dla żołnierza nr `index` (od 0) pierwszego szeregu: kolejno 1…k albo „do n” ((i−1) mod n)+1. */
export function countNumberFor(index: number, n: number | null): number {
  return n === null ? index + 1 : (index % n) + 1;
}

/** Strona, po której jest punkt `target` względem żołnierza (do zwrotu głowy). */
function sideTowards(soldier: Soldier, target: Vec2): Head {
  const delta = angleDelta(soldier.facing, bearing(soldier.position, target));
  if (Math.abs(delta) < 20) return 'FRONT';
  return delta > 0 ? 'RIGHT' : 'LEFT';
}

function countOff(state: SimState, n: number | null): SimState {
  const { squad } = state;
  if (!squad.layout) return state;
  const ranks = ranksOf(squad.layout);
  const front = ranks[0] ?? [];
  const rear = ranks[1] ?? [];
  const plans = startPlans(state);
  const start = 0.3;

  // Pkt 72: pierwszy szereg zwraca głowy w prawo, prawoskrzydłowy — w lewo i zaczyna odliczanie.
  front.forEach((slot, i) => plan(plans, slot.id).act({ head: i === 0 ? 'LEFT' : 'RIGHT' }));
  const numberOf = new Map<number, number>();
  front.forEach((slot, i) => {
    const t = start + i * COUNT_INTERVAL;
    const number = countNumberFor(i, n);
    numberOf.set(slot.id, number);
    plan(plans, slot.id)
      .waitUntil(t)
      .act({
        head: 'LEFT',
        countNumber: number,
        say: { text: String(number), tone: 'number', duration: BUBBLE_TIME },
        report: { text: String(number), kind: 'count' },
      })
      .wait(0.35)
      .act({ head: 'FRONT' });
  });
  const counted = start + front.length * COUNT_INTERVAL;

  // Drugi szereg przejmuje liczby poprzedników (kryjących się z nimi w jednej kolumnie).
  const coverOf = (slot: Slot): Slot | undefined =>
    front.reduce<Slot | undefined>(
      (best, f) => (!best || Math.abs(f.lateral - slot.lateral) < Math.abs(best.lateral - slot.lateral) ? f : best),
      undefined,
    );
  for (const slot of rear) {
    const predecessor = coverOf(slot);
    const index = predecessor ? front.indexOf(predecessor) : -1;
    const number = predecessor ? (numberOf.get(predecessor.id) ?? null) : null;
    plan(plans, slot.id)
      .waitUntil(start + Math.max(0, index) * COUNT_INTERVAL)
      .act({ countNumber: number });
  }

  // Pkt 72: w niepełnym dwuszeregu lewoskrzydłowy drugiego szeregu melduje „Niepełny”.
  let end = counted + 0.2;
  const lastRear = rear[rear.length - 1];
  if (squad.formation === 'DOUBLE_RANK' && rear.length > 0 && rear.length < front.length && lastRear) {
    const soldier = state.soldiers.find((s) => s.id === lastRear.id);
    const head = soldier ? sideTowards(soldier, state.commander.position) : 'FRONT';
    plan(plans, lastRear.id)
      .waitUntil(counted + 0.3)
      .act({ head, say: { text: 'Niepełny', tone: 'report', duration: BUBBLE_TIME }, report: { text: 'Niepełny', kind: 'incomplete' } })
      .wait(0.9)
      .act({ head: 'FRONT' });
    end = counted + 1.4;
  }
  // Po odliczeniu wszyscy przyjmują postawę swobodną (pkt 20, 72).
  for (const p of plans.values()) p.waitUntil(end).act({ posture: 'AT_EASE' });
  return {
    ...state,
    soldiers: applyPlans(state, plans, (s) => ({ ...s, countNumber: null })),
    squad: { ...squad, countMode: { n, inMarch: false }, activity: activity('R-2') },
  };
}

// ---------------------------------------------------------------------------- dwójki (S-1, S-2, pkt 76)

/** Wykrok z częściowym zwrotem: najpierw połowa zwrotu w miejscu, potem krok w skos z dokończeniem zwrotu. */
function stepAside(p: PlanBuilder, turn: number, to: Vec2): void {
  p.turn(turn / 2, TURN_TIME / 2).lerp(to, turn / 2, STEP_TIME, 'SIDESTEP', true);
}

function twosRight(state: SimState): SimState {
  const { squad } = state;
  if (!squad.layout) return state;
  const rank = ranksOf(squad.layout)[0] ?? [];
  const facing = squad.layout.facing + 90;
  const targets = layoutPositions(squad.layout);
  const plans = startPlans(state);
  const numbers = new Map(state.soldiers.map((s) => [s.id, s.countNumber]));
  rank.forEach((slot, i) => {
    const p = plan(plans, slot.id);
    const neighbour = rank[i - 1];
    const own = targets.get(slot.id);
    if (numbers.get(slot.id) === 2 && neighbour && own) {
      // Dwójka: część zwrotu w prawo, wykrok w lewo w skos — staje na lewo od swojego prawego sąsiada.
      const anchor = targets.get(neighbour.id) ?? own;
      const to = add(anchor, scale(forward(squad.layout?.facing ?? 0), INTERVAL));
      targets.set(slot.id, to);
      stepAside(p, 90, to);
    } else {
      p.turn(90);
    }
  });
  const layout = layoutFromPositions(targets, facing);
  return {
    ...state,
    soldiers: applyPlans(state, plans),
    squad: {
      ...squad,
      formation: 'COLUMN_OF_TWOS',
      layout,
      formedFromTwos: true,
      irregularSpacing: !hasRegulationSpacing('COLUMN_OF_TWOS', layout),
      extension: null,
      activity: activity('S-1'),
    },
  };
}

function rankFront(state: SimState): SimState {
  const { squad } = state;
  if (!squad.layout) return state;
  const oldFacing = squad.layout.facing;
  const facing = oldFacing - 90;
  const targets = layoutPositions(squad.layout);
  const plans = startPlans(state);
  const pairs = ranksOf(squad.layout);
  // Nowe prawo = dotychczasowy tył kolumny; nowe lewo = dotychczasowe czoło.
  const newRight = rightOf(facing);
  pairs.forEach((pair, i) => {
    const [right, left] = pair;
    if (right && left) {
      // Dwójka: zwrot w lewo w miejscu; jedynka staje na prawo od niej.
      plan(plans, left.id).turn(-90);
      const leftAt = targets.get(left.id);
      if (!leftAt) return;
      const to = add(leftAt, scale(newRight, INTERVAL));
      targets.set(right.id, to);
      stepAside(plan(plans, right.id), -90, to);
      return;
    }
    const lone = right ?? left;
    if (!lone) return;
    // I-8: samotna jedynka staje na lewo od ostatniej dwójki.
    const neighbour = pairs[i - 1] ?? pairs[i + 1];
    const anchorSlot = neighbour?.[1] ?? neighbour?.[0];
    const anchor = anchorSlot ? targets.get(anchorSlot.id) : undefined;
    if (!anchor || !LONE_SOLDIER_JOINS_LEFT_OF_LAST_PAIR) {
      plan(plans, lone.id).turn(-90);
      return;
    }
    const to = add(anchor, scale(newRight, -INTERVAL));
    targets.set(lone.id, to);
    stepAside(plan(plans, lone.id), -90, to);
  });
  const layout = layoutFromPositions(targets, facing);
  return {
    ...state,
    soldiers: applyPlans(state, plans),
    squad: {
      ...squad,
      formation: 'SINGLE_RANK',
      layout,
      formedFromTwos: false,
      irregularSpacing: !hasRegulationSpacing('SINGLE_RANK', layout),
      extension: null,
      activity: activity('S-2'),
    },
  };
}

// ---------------------------------------------------------------------------- przesunięcie (S-3, pkt 74)

function shift(state: SimState, steps: number, direction: 'FORWARD' | 'BACK'): SimState {
  const { squad } = state;
  if (!squad.layout) return state;
  const sign = direction === 'FORWARD' ? 1 : -1;
  const offset = scale(forward(squad.layout.facing), sign * steps * STEP);
  const plans = startPlans(state);
  for (const s of state.soldiers) {
    const p = plan(plans, s.id);
    if (steps === 1) {
      p.lerp(add(s.position, offset), 0, STEP_TIME, direction === 'FORWARD' ? 'QUICK' : 'BACKSTEP', true);
    } else {
      // Pkt 24: pierwsze trzy kroki defiladowe, dalej krok zwykły; zatrzymanie w postawie zasadniczej.
      const unit = forward(squad.layout.facing);
      const parade = Math.min(3, steps);
      p.move(add(s.position, scale(unit, parade * STEP)), MARCH_SPEED, 'PARADE');
      if (steps > parade) p.move(add(s.position, offset), MARCH_SPEED, 'QUICK');
    }
  }
  const layout: Layout = { ...squad.layout, origin: add(squad.layout.origin, offset) };
  return { ...state, soldiers: applyPlans(state, plans), squad: { ...squad, layout, activity: activity('S-3') } };
}

// ---------------------------------------------------------------------------- odstępowanie i łączenie (O-1, O-2, pkt 73)

interface LateralMove {
  readonly id: number;
  readonly delta: number;
}

/**
 * Przesunięcia boczne pierwszego szeregu: żołnierz `anchorId` zostaje, pozostali na stronie(-ach) `moving`
 * stają w odstępie `gap` od sąsiada. Zwraca przesunięcia (m, + w lewo) dla każdego żołnierza.
 */
function lateralMoves(layout: Layout, anchorId: number, gap: number, moving: Side | 'BOTH'): Map<number, number> {
  const ranks = ranksOf(layout);
  const front = ranks[0] ?? [];
  const anchorIndex = front.findIndex((s) => s.id === anchorId);
  const anchor = front[anchorIndex];
  const deltas = new Map<number, number>();
  if (!anchor) return deltas;
  front.forEach((slot, j) => {
    const toLeft = j > anchorIndex;
    const toRight = j < anchorIndex;
    const moves = (toLeft && moving !== 'RIGHT') || (toRight && moving !== 'LEFT');
    const target = anchor.lateral + (j - anchorIndex) * gap;
    deltas.set(slot.id, moves ? target - slot.lateral : 0);
  });
  // Drugi szereg kryje: przesuwa się tak jak poprzednik w tej samej kolumnie.
  for (const rank of ranks.slice(1)) {
    for (const slot of rank) {
      const cover = front.reduce<Slot | undefined>(
        (best, f) => (!best || Math.abs(f.lateral - slot.lateral) < Math.abs(best.lateral - slot.lateral) ? f : best),
        undefined,
      );
      deltas.set(slot.id, cover ? (deltas.get(cover.id) ?? 0) : 0);
    }
  }
  return deltas;
}

/**
 * Ruch boczny z pkt 73: zwrot w stronę ruchu, marsz (bieg), zatrzymanie, zwrot do frontu, postawa swobodna.
 * Wszyscy ruszają razem, więc dalsi zatrzymują się kolejno, gdy zrobią swoją liczbę kroków.
 */
function sideStep(
  state: SimState,
  layout: Layout,
  deltas: Map<number, number>,
  options: { running: boolean; start: number; posture: Effects['posture']; gestures?: ReadonlyMap<number, Effects> },
) {
  const { running, start, posture } = options;
  const plans = startPlans(state);
  const moves: LateralMove[] = [...deltas].map(([id, delta]) => ({ id, delta }));
  const left = scale(rightOf(layout.facing), -1);
  for (const { id, delta } of moves) {
    const p = plan(plans, id);
    const gesture = options.gestures?.get(id);
    if (gesture) p.act(gesture);
    p.waitUntil(start);
    if (Math.abs(delta) < 0.01) continue;
    const turn = delta > 0 ? -90 : 90;
    const to = add(p.position, scale(left, delta));
    p.turn(turn).move(to, speedOf(running), running ? 'RUN' : 'QUICK').turn(-turn);
  }
  const end = endTime(plans);
  for (const p of plans.values()) p.waitUntil(end).act({ ...(posture ? { posture } : {}) });
  const slots = layout.slots.map((s) => ({ ...s, lateral: s.lateral + (deltas.get(s.id) ?? 0) }));
  return { plans, layout: layoutFromPositions(layoutPositions({ ...layout, slots }), layout.facing) };
}

function extend(state: SimState, command: Extract<CommandAst, { id: 'O-1' }>): SimState {
  const { squad } = state;
  const anchor = resolveSoldier(state, command.from);
  if (!squad.layout || !anchor) return state;
  const moving: Side | 'BOTH' =
    command.from.kind === 'flank' ? (command.from.side === 'RIGHT' ? 'LEFT' : 'RIGHT') : (command.side ?? 'BOTH');
  const gap = INTERVAL + command.steps * STEP;
  const deltas = lateralMoves(squad.layout, anchor.id, gap, moving);
  const named = command.from.kind === 'soldier';
  const gestures = new Map<number, Effects>();
  if (named) {
    // Wskazany mówi „Jestem” i na sekundę unosi lewą rękę; w dwuszeregu także kryjący go żołnierz.
    gestures.set(anchor.id, {
      raiseLeftArm: ARM_TIME,
      say: { text: 'Jestem', tone: 'report', duration: BUBBLE_TIME },
      report: { text: 'Jestem', kind: 'present' },
    });
    const ranks = ranksOf(squad.layout);
    const slot = ranks[0]?.find((s) => s.id === anchor.id);
    const cover = slot ? ranks[1]?.find((s) => Math.abs(s.lateral - slot.lateral) < 0.3) : undefined;
    if (cover) gestures.set(cover.id, { raiseLeftArm: ARM_TIME });
  }
  const { plans, layout } = sideStep(state, squad.layout, deltas, {
    running: command.running,
    start: named ? 0.6 : 0,
    posture: 'AT_EASE',
    gestures,
  });
  return {
    ...state,
    soldiers: applyPlans(state, plans),
    squad: {
      ...squad,
      layout,
      extension: { fromId: anchor.id, steps: command.steps, side: moving },
      irregularSpacing: false,
      activity: activity('O-1'),
    },
  };
}

function close(state: SimState, command: Extract<CommandAst, { id: 'O-2' }>): SimState {
  const { squad } = state;
  const target = resolveSoldier(state, command.to);
  if (!squad.layout || !target) return state;
  // Łączenie przywraca odstępy regulaminowe w całym szyku względem wskazanego żołnierza (D-033).
  const deltas = lateralMoves(squad.layout, target.id, INTERVAL, 'BOTH');
  const { plans, layout } = sideStep(state, squad.layout, deltas, { running: command.running, start: 0, posture: POSTURE_AFTER_CLOSE });
  return {
    ...state,
    soldiers: applyPlans(state, plans),
    squad: { ...squad, layout, extension: null, irregularSpacing: false, activity: activity('O-2') },
  };
}

// ---------------------------------------------------------------------------- rozdział

export function executePlaceCommand(state: SimState, command: CommandAst): SimState {
  switch (command.id) {
    case 'R-1':
      return dress(state, command.side);
    case 'R-2':
      return countOff(state, command.countTo);
    case 'S-1':
      return twosRight(state);
    case 'S-2':
      return rankFront(state);
    case 'S-3':
      return command.direction === 'FORWARD' || command.direction === 'BACK' ? shift(state, command.steps, command.direction) : state;
    case 'O-1':
      return extend(state, command);
    case 'O-2':
      return close(state, command);
    default:
      return state;
  }
}
