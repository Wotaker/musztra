import type { SquadOrdinal } from '../catalog';
import { SURNAMES } from '../roster/names';
import { distance, vec, type Vec2 } from './geometry';
import { Random } from './random';
import type { SimState, Soldier, Squad } from './state';

/** Stan początkowy (COMMANDS „Scenariusze akceptacyjne”): drużyna rozproszona wokół dowódcy w (0, 0). */

export interface InitialOptions {
  /** Liczebność drużyny, 3–12 (SPEC 3.8). */
  readonly size: number;
  readonly seed: number;
  readonly squad: SquadOrdinal | null;
}

export const DEFAULT_INITIAL: InitialOptions = { size: 9, seed: 1, squad: 1 };

/** Promień rozproszenia na starcie (m). */
export const START_RADIUS = 10;
const MIN_SEPARATION = 1.3;
const COMMANDER_CLEARANCE = 2;

/** Punkty w kole o promieniu `radius` wokół `center`, odległe od siebie i od punktów `avoid`. */
export function scatterPoints(
  rng: Random,
  count: number,
  center: Vec2,
  minRadius: number,
  maxRadius: number,
  avoid: readonly Vec2[] = [],
): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    let candidate = center;
    for (let attempt = 0; attempt < 200; attempt++) {
      const angle = rng.range(0, Math.PI * 2);
      // Pierwiastek daje równomierne rozmieszczenie na powierzchni pierścienia.
      const r = Math.sqrt(rng.range(minRadius * minRadius, maxRadius * maxRadius));
      candidate = vec(center.x + Math.sin(angle) * r, center.y + Math.cos(angle) * r);
      const clear =
        points.every((p) => distance(p, candidate) >= MIN_SEPARATION) &&
        avoid.every((p) => distance(p, candidate) >= COMMANDER_CLEARANCE);
      if (clear) break;
    }
    points.push(candidate);
  }
  return points;
}

/** Losowy skład bez powtórzeń nazwisk. */
function drawRoster(rng: Random, size: number) {
  const pool = [...SURNAMES];
  const roster = [];
  for (let i = 0; i < size && pool.length > 0; i++) {
    const [surname] = pool.splice(rng.int(pool.length), 1);
    if (surname) roster.push(surname);
  }
  return roster;
}

export function createInitialState(options: InitialOptions = DEFAULT_INITIAL): SimState {
  const size = Math.min(12, Math.max(3, Math.round(options.size)));
  const rng = new Random(options.seed);
  const roster = drawRoster(rng, size);
  const commander = vec(0, 0);
  const positions = scatterPoints(rng, size, commander, COMMANDER_CLEARANCE, START_RADIUS, [commander]);
  const soldiers: Soldier[] = roster.map((surname, i) => ({
    id: i + 1,
    surname,
    position: positions[i] ?? commander,
    facing: Math.round(rng.range(0, 360)),
    posture: 'AT_EASE',
    motion: 'STANDING',
    gait: 'STAND',
    stride: 0,
    countNumber: null,
    head: 'FRONT',
    bubble: null,
    armRaisedUntil: null,
    plan: [],
    planIndex: 0,
    segmentTime: 0,
    segmentStart: null,
  }));
  const squad: Squad = {
    name: options.squad,
    formation: 'DISPERSED',
    layout: null,
    attending: false,
    countMode: null,
    extension: null,
    irregularSpacing: false,
    formedFromTwos: false,
    headsTurned: null,
    lastAssembly: null,
    activity: null,
    march: null,
  };
  return {
    time: 0,
    tick: 0,
    accumulator: 0,
    rng: rng.seed,
    soldiers,
    squad,
    commander: {
      position: commander,
      facing: 0,
      heading: 0,
      input: { x: 0, y: 0, run: false },
      gait: 'STAND',
      stride: 0,
    },
    reports: [],
  };
}
