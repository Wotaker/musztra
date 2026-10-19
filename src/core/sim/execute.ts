import type { CommandAst, FormationName } from '../grammar/ast';
import { assemblyAnchorNearCommander, irregularAfterTurn, REVERT_MAX_DURATION } from '../interpretations';
import {
  fileGapsOf,
  formationAfterTurn,
  hasRegulationSpacing,
  layoutFromPositions,
  layoutPositions,
  regularizedLayout,
  regulationSlots,
  turnAngle,
} from './formation';
import { add, angleDelta, bearing, distance, dot, normalizeAngle, scale, sub, type Vec2 } from './geometry';
import { speedOf, withPlan } from './plan';
import { Random } from './random';
import type { Layout, SimState, Soldier, Squad } from './state';
import { anchorPoint, worldObject } from './world';
import { activity, halted, planFor, shuffleTo } from './actions';

/**
 * Wykonanie komendy (SPEC 4.3, krok 5): komenda zamieniana na plan działań dla każdego żołnierza (SIMD).
 * Zakłada, że warunki wstępne zostały sprawdzone (`semantics/preconditions.ts`). Pola drużyny opisują
 * stan docelowy od razu; żołnierze dochodzą do niego zgodnie z planami.
 */

/** Migawka stanu drużyny dla WRÓĆ (SPEC 5.3, „Historia”); dowódca nie jest cofany. */
export interface Snapshot {
  readonly squad: Squad;
  readonly soldiers: readonly Soldier[];
}

export function snapshotOf(state: SimState): Snapshot {
  return { squad: { ...state.squad, activity: null }, soldiers: state.soldiers };
}

const ASSEMBLY_TURN = 0.3;

// ---------------------------------------------------------------------------- postawy

function summon(state: SimState, commandId: CommandAst['id']): SimState {
  const { squad, commander } = state;
  if (squad.formation === 'DISPERSED') {
    // Pkt 69: żołnierze zwracają się frontem do dowódcy i przyjmują postawę zasadniczą.
    const soldiers = state.soldiers.map((s) => {
      const plan = planFor(s).turnTo(bearing(s.position, commander.position)).act({ posture: 'ATTENTION' });
      return withPlan(halted(s), plan.build());
    });
    return { ...state, soldiers, squad: { ...squad, attending: true, activity: activity(commandId) } };
  }
  const soldiers = state.soldiers.map((s) => ({ ...s, posture: 'ATTENTION' as const, head: 'FRONT' as const }));
  return { ...state, soldiers, squad: { ...squad, attending: true, headsTurned: null } };
}

function atEase(state: SimState): SimState {
  const { squad } = state;
  if (squad.formation === 'DISPERSED' || !squad.layout) {
    return { ...state, soldiers: state.soldiers.map((s) => ({ ...s, posture: 'AT_EASE' as const })) };
  }
  // Pkt 71: po SPOCZNIJ żołnierze samoczynnie wyrównują i kryją — względem prawego skrzydła (czoła).
  const layout = regularizedLayout(squad.formation, squad.layout, squad.extension ? { fileGaps: fileGapsOf(squad.layout) } : {});
  const { soldiers, moved } = shuffleTo(state, layout, { posture: 'AT_EASE' });
  return {
    ...state,
    soldiers,
    squad: { ...squad, layout, irregularSpacing: false, ...(moved ? { activity: activity('P-3') } : {}) },
  };
}

// ---------------------------------------------------------------------------- zwroty

function turn(state: SimState, command: Extract<CommandAst, { id: 'Z-1' }>): SimState {
  const { squad } = state;
  if (!squad.layout || squad.formation === 'DISPERSED') return state;
  const angle = turnAngle(command.direction);
  const { formation } = formationAfterTurn(squad.formation, command.direction);
  const layout = layoutFromPositions(layoutPositions(squad.layout), squad.layout.facing + angle);
  const changesGrouping = command.direction !== 'ABOUT';
  const irregularSpacing = changesGrouping
    ? irregularAfterTurn(hasRegulationSpacing(formation, layout))
    : squad.irregularSpacing;
  const soldiers = state.soldiers.map((s) => withPlan({ ...s, countNumber: null }, planFor(s).turn(angle).build()));
  return {
    ...state,
    soldiers,
    squad: {
      ...squad,
      formation,
      layout,
      irregularSpacing,
      // Zwrot unieważnia odliczenie (R-2; DECISIONS.md, D-027) i oznaczenie kolumny z dwójek (Z-1).
      countMode: null,
      formedFromTwos: false,
      extension: changesGrouping ? null : squad.extension,
      activity: activity('Z-1'),
    },
  };
}

// ---------------------------------------------------------------------------- zbiórki

/** Punkt na drodze z `from` do `to`, omijający dowódcę, jeśli droga przechodzi zbyt blisko niego. */
function detour(from: Vec2, to: Vec2, obstacle: Vec2): Vec2 | null {
  const d = sub(to, from);
  const len = Math.hypot(d.x, d.y);
  if (len < 1) return null;
  const t = dot(sub(obstacle, from), d) / (len * len);
  if (t <= 0.1 || t >= 0.9) return null;
  const closest = add(from, scale(d, t));
  const gap = distance(closest, obstacle);
  const clearance = 0.9;
  if (gap >= clearance) return null;
  const side = sub(closest, obstacle);
  const sideLen = Math.hypot(side.x, side.y);
  const normal = sideLen > 1e-6 ? scale(side, 1 / sideLen) : { x: -d.y / len, y: d.x / len };
  return add(obstacle, scale(normal, clearance));
}

function assemble(state: SimState, command: CommandAst, formation: FormationName, anchor: Vec2, facing: number): SimState {
  const ids = [...state.soldiers].map((s) => s.id).sort((a, b) => a - b);
  const layout: Layout = { facing: normalizeAngle(facing), origin: anchor, slots: regulationSlots(formation, ids) };
  const targets = layoutPositions(layout);
  const commander = state.commander.position;
  const soldiers = state.soldiers.map((s) => {
    const target = targets.get(s.id) ?? s.position;
    const plan = planFor(s);
    if (distance(s.position, target) > 0.05) {
      // Pkt 69: na hasło „ZBIÓRKA” żołnierze biegną na miejsca.
      const via = detour(s.position, target, commander);
      for (const point of via ? [via, target] : [target]) {
        plan.turnTo(bearing(plan.position, point), ASSEMBLY_TURN).move(point, speedOf(true), 'RUN');
      }
    }
    plan.turnTo(layout.facing).act({ posture: 'ATTENTION' });
    return withPlan({ ...halted(s), countNumber: null, head: 'FRONT' as const }, plan.build());
  });
  return {
    ...state,
    soldiers,
    squad: {
      ...state.squad,
      formation,
      layout,
      attending: true,
      countMode: null,
      extension: null,
      irregularSpacing: false,
      formedFromTwos: false,
      headsTurned: null,
      lastAssembly: { anchor, facing: layout.facing },
      activity: activity(command.id),
    },
  };
}

// ---------------------------------------------------------------------------- rozejście

const DISMISS_MIN = 8;
const DISMISS_MAX = 15;
const DISMISS_SEPARATION = 1.4;

function dismiss(state: SimState, command: Extract<CommandAst, { id: 'ZB-4' }>): SimState {
  const rng = new Random(state.rng);
  const targets: Vec2[] = [];
  const destination = command.destination ? worldObject(command.destination).anchor : null;
  for (const s of state.soldiers) {
    const center = destination ?? s.position;
    const [min, max] = destination ? [1.5, 6] : [DISMISS_MIN, DISMISS_MAX];
    let candidate = center;
    for (let attempt = 0; attempt < 100; attempt++) {
      const angle = rng.range(0, Math.PI * 2);
      const r = rng.range(min, max);
      candidate = { x: center.x + Math.sin(angle) * r, y: center.y + Math.cos(angle) * r };
      if (targets.every((t) => distance(t, candidate) >= DISMISS_SEPARATION)) break;
    }
    targets.push(candidate);
  }
  const soldiers = state.soldiers.map((s, i) => {
    const target = targets[i] ?? s.position;
    const plan = planFor(s)
      .turnTo(bearing(s.position, target), ASSEMBLY_TURN)
      .move(target, speedOf(command.running), command.running ? 'RUN' : 'QUICK')
      .turnTo(normalizeAngle(Math.round(rng.range(0, 360))), 0.5);
    return withPlan({ ...halted(s), posture: 'AT_EASE' as const, countNumber: null, head: 'FRONT' as const }, plan.build());
  });
  return {
    ...state,
    rng: rng.seed,
    soldiers,
    squad: {
      ...state.squad,
      formation: 'DISPERSED',
      layout: null,
      attending: false,
      countMode: null,
      extension: null,
      irregularSpacing: false,
      formedFromTwos: false,
      headsTurned: null,
      // Rozejście nie jest czynnością przejściową: można od razu wezwać drużynę.
      activity: activity('ZB-4', false),
    },
  };
}

// ---------------------------------------------------------------------------- WRÓĆ

/** I-12: szybki powrót do migawki; przerywa bieżącą czynność. */
export function revert(state: SimState, snapshot: Snapshot): SimState {
  const byId = new Map(snapshot.soldiers.map((s) => [s.id, s]));
  const soldiers = state.soldiers.map((s) => {
    const target = byId.get(s.id) ?? s;
    const d = distance(s.position, target.position);
    const turnBy = angleDelta(s.facing, target.facing);
    const plan = planFor(s);
    if (d > 0.01 || Math.abs(turnBy) > 0.5) {
      const duration = Math.min(REVERT_MAX_DURATION, Math.max(0.4, d / 4, (Math.abs(turnBy) / 180) * 0.6));
      plan.lerp(target.position, turnBy, duration, d > 1.5 ? 'RUN' : d > 0.01 ? 'SHUFFLE' : 'STAND', true);
    }
    plan.act({ posture: target.posture, head: target.head, countNumber: target.countNumber });
    return withPlan({ ...s, bubble: null, armRaisedUntil: null }, plan.build());
  });
  return { ...state, soldiers, squad: { ...snapshot.squad, activity: activity('X-1') } };
}

// ---------------------------------------------------------------------------- rozdział

export function execute(state: SimState, command: CommandAst): SimState {
  switch (command.id) {
    case 'P-1':
    case 'P-2':
      return summon(state, command.id);
    case 'P-3':
      return atEase(state);
    case 'Z-1':
      return turn(state, command);
    case 'ZB-1':
      return assemble(
        state,
        command,
        command.formation,
        assemblyAnchorNearCommander(command.formation, state.commander.position, state.commander.heading),
        state.commander.heading,
      );
    case 'ZB-2': {
      const anchor = anchorPoint(command.anchor.object, command.terrain);
      const facing = command.frontTo ? bearing(anchor, worldObject(command.frontTo).position) : state.commander.heading;
      return assemble(state, command, command.formation, anchor, facing);
    }
    case 'ZB-3': {
      const place = state.squad.lastAssembly;
      return place ? assemble(state, command, command.formation, place.anchor, place.facing) : state;
    }
    case 'ZB-4':
      return dismiss(state, command);
    default:
      // Komendy kolejnych etapów (SPEC 10) nie zmieniają jeszcze stanu.
      return state;
  }
}
