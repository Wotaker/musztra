import type { FormationName, MarchDirection } from '../grammar/ast';
import {
  COLUMN_DEPTH_WHEN_HALTING_FACED,
  deployedDirectionIsIndividual,
  marchDepth,
  POSTURE_AFTER_HEAD_HALT,
} from '../interpretations';
import { COLUMN_INTERVAL, COMMANDER_LEAD, DT, MARCH_SPEED, RUN_SPEED, STEP } from './constants';
import { filesOf, formationAfterTurn, hasRegulationSpacing, isDeployed, layoutFromPositions, ranksOf } from './formation';
import { add, angleDelta, bearing, distance, forward, normalizeAngle, rightOf, scale, sub, type Vec2 } from './geometry';
import { PlanBuilder, isBusy, withPlan } from './plan';
import type {
  Follower,
  Formation,
  Gait,
  Layout,
  MarchEvent,
  MarchState,
  Motion,
  PendingMarchEvent,
  Report,
  SimState,
  Soldier,
  TrailPoint,
} from './state';

/**
 * Ruch ciągły drużyny (SPEC 5.5, COMMANDS M, MS, S-4): marsz, marsz w miejscu, bieg, zmiany kierunku,
 * „Za mną”, zachodzenie, zatrzymania i zmiany szyku w marszu. Kolumna idzie po śladzie kierunkowego
 * (I-5): każdy żołnierz ma drogę po śladzie i przesunięcie w bok; szyk rozwinięty przesuwa się równolegle.
 */

/** Promień łuku, po którym kierunkowy zmienia kierunek (m). */
const ARC_RADIUS = 0.6;
/** Najwyższa prędkość doganiania przez idących w kolumnie (krotność tempa). */
const CATCH_UP = 1.3;
/** Prędkość przesunięcia w bok przy zmianach szyku w marszu (m/s). */
const LATERAL_SPEED = 0.8;
/** Skrócony krok czoła po „W dwójki – W PRZÓD” (krotność tempa, pkt 77). */
const SHORT_STEP = 0.55;
/** Prędkość obrotu żołnierza w marszu (°/s). */
const FACING_RATE = 300;
/** Tolerancja osiągnięcia miejsca w kolumnie (m). */
const CONVERGED = 0.03;
/** Pierwsze trzy kroki defiladowe (pkt 24). */
export const THREE_STEPS = 3 * STEP;
/** Czas jednego kroku w miejscu (s). */
export const STEP_TIME = 60 / 114;

export const DIRECTION_ANGLE: Readonly<Record<MarchDirection, number>> = {
  FORWARD: 0,
  RIGHT: 90,
  LEFT: -90,
  ABOUT_RIGHT: 180,
  ABOUT_LEFT: -180,
  HALF_RIGHT: 45,
  HALF_LEFT: -45,
};

// ---------------------------------------------------------------------------- ślad

const left = (heading: number): Vec2 => scale(rightOf(heading), -1);

/** Punkt i kierunek śladu w drodze `s` (poza końcami — przedłużenie wzdłuż skrajnych odcinków). */
export function trailAt(trail: readonly TrailPoint[], s: number, fallback: number): { p: Vec2; heading: number } {
  const first = trail[0];
  const last = trail[trail.length - 1];
  if (!first || !last) return { p: { x: 0, y: 0 }, heading: fallback };
  const segmentHeading = (i: number): number => {
    const a = trail[i];
    const b = trail[i + 1];
    if (!a || !b || distance(a.p, b.p) < 1e-6) return fallback;
    return bearing(a.p, b.p);
  };
  if (s <= first.s) {
    const h = trail.length > 1 ? segmentHeading(0) : fallback;
    return { p: add(first.p, scale(forward(h), s - first.s)), heading: h };
  }
  if (s >= last.s) {
    const h = trail.length > 1 ? segmentHeading(trail.length - 2) : fallback;
    return { p: add(last.p, scale(forward(h), s - last.s)), heading: h };
  }
  let lo = 0;
  let hi = trail.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((trail[mid]?.s ?? 0) <= s) lo = mid;
    else hi = mid;
  }
  const a = trail[lo] ?? first;
  const b = trail[hi] ?? last;
  const k = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
  return { p: add(a.p, scale(sub(b.p, a.p), k)), heading: segmentHeading(lo) };
}

const followerPosition = (march: MarchState, f: Follower): { p: Vec2; heading: number } => {
  const at = trailAt(march.trail, f.s, march.heading);
  return { p: add(at.p, scale(left(at.heading), f.lateral)), heading: at.heading };
};

/** Prowadzący porusza się o `ds` (po łuku, gdy trwa zmiana kierunku); ślad dostaje nowy punkt. */
function advanceLeader(march: MarchState, ds: number): MarchState {
  if (ds <= 0) return march;
  let { heading, turnLeft } = march;
  let turned = 0;
  if (turnLeft !== 0) {
    const maxTurn = (ds / ARC_RADIUS) * (180 / Math.PI);
    turned = Math.sign(turnLeft) * Math.min(Math.abs(turnLeft), maxTurn);
    turnLeft -= turned;
    if (Math.abs(turnLeft) < 1e-6) turnLeft = 0;
  }
  const mid = heading + turned / 2;
  heading = normalizeAngle(heading + turned);
  const last = march.trail[march.trail.length - 1];
  if (!last) return march;
  const point = { s: last.s + ds, p: add(last.p, scale(forward(mid), ds)) };
  const prev = march.trail[march.trail.length - 2];
  // Na prostym odcinku przesuwamy ostatni punkt zamiast dokładać nowe.
  const straight = turned === 0 && prev && Math.abs(angleDelta(bearing(prev.p, last.p), mid)) < 1e-6;
  const trail = straight ? [...march.trail.slice(0, -1), point] : [...march.trail, point];
  return { ...march, heading, turnLeft, trail, distance: march.distance + ds };
}

/** Usunięcie punktów śladu daleko za ostatnim żołnierzem (zawsze zostają co najmniej dwa). */
function pruneTrail(march: MarchState): MarchState {
  const minS = Math.min(...march.followers.map((f) => f.s)) - 4;
  let start = 0;
  while (start < march.trail.length - 2 && (march.trail[start + 1]?.s ?? Infinity) < minS) start++;
  return start === 0 ? march : { ...march, trail: march.trail.slice(start) };
}

// ---------------------------------------------------------------------------- rozpoczęcie marszu

function baseMarch(heading: number, kind: MarchState['kind'], motion: MarchState['motion']): MarchState {
  return {
    kind,
    motion,
    step: 'QUICK',
    heading,
    turnLeft: 0,
    distance: 0,
    paradeUntil: 0,
    trail: [],
    followers: [],
    follow: false,
    followHalted: false,
    awaitingQuickStep: false,
    quickStepWarned: false,
    headHalt: null,
    wheel: null,
    pending: [],
  };
}

/**
 * Kolumna po śladzie z bieżących pozycji: kierunkowy (prawy żołnierz pary czołowej) prowadzi, pozostali
 * na śladzie z przesunięciem w bok. Odległości docelowe — regulaminowe (I-2: rozwieranie po ruszeniu).
 */
export function trailFromPositions(
  soldiers: readonly Soldier[],
  heading: number,
  formation: FormationName,
  march: MarchState,
): MarchState {
  const positions = new Map(soldiers.map((s) => [s.id, s.position]));
  const layout = layoutFromPositions(positions, heading);
  const files = filesOf(layout);
  const ranks = ranksOf(layout);
  const maxDepth = Math.max(0, ...layout.slots.map((s) => s.depth));
  const base = maxDepth + 4;
  const tail = add(layout.origin, scale(forward(heading), -base));
  const followers: Follower[] = layout.slots.map((slot) => {
    const rankIndex = ranks.findIndex((r) => r.some((x) => x.id === slot.id));
    const fileIndex = files.findIndex((f) => f.some((x) => x.id === slot.id));
    const index = layout.slots.indexOf(slot);
    return {
      id: slot.id,
      s: base - slot.depth,
      lateral: slot.lateral,
      depth: marchDepth(formation, index, rankIndex),
      targetLateral: formation === 'COLUMN_OF_TWOS' ? fileIndex * COLUMN_INTERVAL : 0,
    };
  });
  return {
    ...march,
    kind: 'TRAIL',
    heading,
    trail: [
      { s: 0, p: tail },
      { s: base, p: layout.origin },
    ],
    followers,
  };
}

export interface StartOptions {
  readonly direction: MarchDirection;
  readonly motion: MarchState['motion'];
  readonly follow: boolean;
}

/** Rozpoczęcie marszu (M-1, M-2, M-3, M-4, M-5) z postoju. */
export function startMarch(state: SimState, options: StartOptions): SimState {
  const { squad } = state;
  if (!squad.layout || squad.formation === 'DISPERSED') return state;
  const heading = squad.layout.facing;
  const formation = squad.formation;
  const motion = options.motion;
  let march = baseMarch(heading, isDeployed(formation) ? 'RIGID' : 'TRAIL', motion);
  if (march.kind === 'TRAIL') march = trailFromPositions(state.soldiers, heading, formation, march);
  // Pkt 24: po każdej komendzie pierwsze trzy kroki defiladowe na wprost (poza marszem w miejscu i biegiem).
  if (motion === 'MARCHING') march = { ...march, paradeUntil: THREE_STEPS };
  const angle = DIRECTION_ANGLE[options.direction];
  if (angle !== 0) march = schedule(march, { at: THREE_STEPS, basis: 'distance', event: { kind: 'TURN', delta: angle } });
  if (options.follow) march = startFollow(state, march);
  const soldiers = state.soldiers.map((s) => withPlan({ ...s, motion }, []));
  return { ...state, soldiers, squad: { ...squad, march } };
}

/** „Za mną – MARSZ” (M-2): prowadzi dowódca, kierunkowy idzie jego śladem 3 kroki za nim. */
export function startFollow(state: SimState, march: MarchState): MarchState {
  const guide = [...march.followers].sort((a, b) => b.s - a.s)[0];
  const last = march.trail[march.trail.length - 1];
  if (!guide || !last) return march;
  // Ślad dotychczasowy aż do kierunkowego, potem prosto do dowódcy.
  const upToGuide = march.trail.filter((p) => p.s < guide.s);
  const guideAt = trailAt(march.trail, guide.s, march.heading);
  const commander = state.commander.position;
  const toCommander = distance(guideAt.p, commander);
  const trail: TrailPoint[] = [...upToGuide, { s: guide.s, p: guideAt.p }];
  if (toCommander > 0.01) trail.push({ s: guide.s + toCommander, p: commander });
  // Dowódca bliżej niż 3 kroki: kierunkowy maszeruje w miejscu, aż dowódca odejdzie.
  return {
    ...march,
    follow: true,
    followHalted: false,
    trail,
    heading: toCommander > 0.01 ? bearing(guideAt.p, commander) : march.heading,
    turnLeft: 0,
    pending: march.pending.filter((p) => p.event.kind !== 'TURN'),
  };
}

export function schedule(march: MarchState, item: PendingMarchEvent): MarchState {
  return { ...march, pending: [...march.pending, item] };
}

// ---------------------------------------------------------------------------- zachodzenie (S-4)

/** „Drużyna, w prawo (w lewo) zachodź – MARSZ”: obrót szyku wokół skrzydłowego nieruchomego skrzydła. */
export function startWheel(state: SimState, pivotId: number, sign: 1 | -1): SimState {
  const { squad } = state;
  if (!squad.layout) return state;
  const pivot = state.soldiers.find((s) => s.id === pivotId)?.position;
  if (!pivot) return state;
  // Pkt 75: tempo takie, by skrajny maszerujący po okręgu szedł krokiem zwykłym.
  const radius = Math.max(0.6, ...state.soldiers.map((s) => distance(s.position, pivot)));
  const rate = (MARCH_SPEED / radius) * (180 / Math.PI);
  const march: MarchState = { ...baseMarch(squad.layout.facing, 'WHEEL', 'MARCHING'), wheel: { pivot, sign, rate, pivotId } };
  return { ...state, soldiers: state.soldiers.map((s) => withPlan({ ...s, motion: 'MARCHING' }, [])), squad: { ...squad, march } };
}

/** Obrót punktu `p` wokół `c` zgodnie z ruchem wskazówek zegara o `deg` stopni. */
function rotateAround(p: Vec2, c: Vec2, deg: number): Vec2 {
  const r = (deg * Math.PI) / 180;
  const x = p.x - c.x;
  const y = p.y - c.y;
  return { x: c.x + x * Math.cos(r) + y * Math.sin(r), y: c.y - x * Math.sin(r) + y * Math.cos(r) };
}

// ---------------------------------------------------------------------------- zatrzymanie

/** Zatrzymanie marszu: szyk z bieżących pozycji, postawa `posture` (M-8: zasadnicza). */
export function halt(state: SimState, posture: Soldier['posture']): SimState {
  const { squad } = state;
  const march = squad.march;
  if (!march || squad.formation === 'DISPERSED') return { ...state, squad: { ...squad, march: null } };
  const heading = normalizeAngle(march.kind === 'WHEEL' ? (squad.layout?.facing ?? march.heading) : march.heading);
  const soldiers = state.soldiers.map((s) => {
    const facing = Math.abs(angleDelta(s.facing, heading)) < 6 ? heading : s.facing;
    return { ...s, facing, posture, motion: 'STANDING' as const, gait: 'STAND' as const };
  });
  const layout = layoutFromPositions(new Map(soldiers.map((s) => [s.id, s.position])), heading);
  const formation = squad.formation;
  return {
    ...state,
    soldiers,
    squad: {
      ...squad,
      layout,
      march: null,
      irregularSpacing: !hasRegulationSpacing(formation, layout),
    },
  };
}

// ---------------------------------------------------------------------------- krok symulacji

function leaderSpeed(march: MarchState): number {
  if (march.headHalt) return 0;
  switch (march.motion) {
    case 'RUNNING':
      return RUN_SPEED;
    case 'MARCHING_IN_PLACE':
      return 0;
    case 'MARCHING':
      return MARCH_SPEED * (march.awaitingQuickStep ? SHORT_STEP : 1);
  }
}

function marchingGait(march: MarchState): Gait {
  if (march.motion === 'RUNNING') return 'RUN';
  if (march.step === 'PARADE' || march.distance < march.paradeUntil) return 'PARADE';
  if (march.step === 'ROUTE') return 'ROUTE';
  return 'QUICK';
}

/** Czy wszyscy w kolumnie są na swoich miejscach (odległość i przesunięcie w bok). */
export function followersConverged(march: MarchState, leaderS: number): boolean {
  const lead = march.follow ? COMMANDER_LEAD : 0;
  return march.followers.every((f) => {
    const gap = leaderS - lead - f.depth - f.s;
    // Przy zatrzymaniu niejednoczesnym nikt się nie cofa: kto stoi bliżej poprzednika, już doszedł.
    const arrived = march.headHalt ? gap <= CONVERGED : Math.abs(gap) <= CONVERGED;
    return arrived && Math.abs(f.targetLateral - f.lateral) <= CONVERGED;
  });
}

const leaderS = (march: MarchState): number => march.trail[march.trail.length - 1]?.s ?? 0;

/** Odcinki śladu różniące się kierunkiem od kierunku marszu o więcej niż tyle stopni należą do zakrętu. */
const STRAIGHT_TOLERANCE = 0.5;
/** Ponowne sprawdzenie, gdy czoło jest jeszcze na łuku (m drogi). */
const RECHECK = 0.2;

/**
 * Ile drogi musi jeszcze przejść kolumna, by ostatni żołnierz minął zakręt (D-055): 0, gdy cała kolumna
 * idzie po prostej w kierunku marszu.
 */
export function turnRemaining(march: MarchState): number {
  if (march.kind !== 'TRAIL') return 0;
  if (march.turnLeft !== 0) return RECHECK;
  const tail = Math.min(...march.followers.map((f) => f.s));
  let end = -Infinity;
  for (let i = 0; i + 1 < march.trail.length; i++) {
    const a = march.trail[i];
    const b = march.trail[i + 1];
    if (!a || !b || distance(a.p, b.p) < 1e-6) continue;
    if (Math.abs(angleDelta(bearing(a.p, b.p), march.heading)) > STRAIGHT_TOLERANCE) end = b.s;
  }
  return Math.max(0, end - tail);
}

function applyEvent(state: SimState, event: MarchEvent, reports: Report[]): SimState {
  const march = state.squad.march;
  if (!march) return state;
  const set = (m: Partial<MarchState>): SimState => ({ ...state, squad: { ...state.squad, march: { ...march, ...m } } });
  switch (event.kind) {
    case 'RUN':
      return set({ motion: 'RUNNING', step: 'QUICK', paradeUntil: 0 });
    case 'QUICK':
      return set({ motion: 'MARCHING', step: 'QUICK' });
    case 'FORWARD':
      return set({ motion: 'MARCHING', paradeUntil: march.distance + THREE_STEPS });
    case 'MARK_TIME':
      return set({ motion: 'MARCHING_IN_PLACE' });
    case 'HALT': {
      // D-055: STÓJ w trakcie zakrętu kolumny — kolumna kończy zmianę kierunku i staje dopiero na prostej
      // (inaczej stanęłaby wygięta, z różnymi frontami). W marszu w miejscu zakręt i tak się nie posuwa.
      const remaining = turnRemaining(march);
      if (remaining > 0 && !event.inPlace && leaderSpeed(march) > 0) {
        if (!event.deferred) {
          reports.push(note(state.time, undefined, 'Kolumna kończy zmianę kierunku — zatrzyma się, gdy ostatni żołnierz minie zakręt.'));
        }
        return set({ pending: [...march.pending, { at: march.distance + remaining, basis: 'distance', event: { kind: 'HALT', deferred: true } }] });
      }
      return halt(state, 'ATTENTION');
    }
    case 'TURN':
      return turnMarch(state, event.delta);
  }
}

/** Zmiana kierunku w marszu: kolumna — kierunkowy po łuku, reszta po śladzie (I-5); szyk rozwinięty — indywidualnie (I-3). */
function turnMarch(state: SimState, delta: number): SimState {
  const { squad } = state;
  const march = squad.march;
  if (!march) return state;
  if (march.kind === 'TRAIL') {
    return { ...state, squad: { ...squad, march: { ...march, turnLeft: march.turnLeft + delta } } };
  }
  const heading = normalizeAngle(march.heading + delta);
  if (squad.formation !== 'DISPERSED' && Math.abs(delta) === 90 && deployedDirectionIsIndividual()) {
    // Każdy żołnierz zwraca się indywidualnie: szereg staje się rzędem, dwuszereg kolumną dwójkową.
    const { formation } = formationAfterTurn(squad.formation, delta > 0 ? 'RIGHT' : 'LEFT');
    const trail = trailFromPositions(state.soldiers, heading, formation, march);
    return { ...state, squad: { ...squad, formation, irregularSpacing: true, countMode: null, march: trail } };
  }
  // Zwrot o 45° (lub w tył) w szyku rozwiniętym: każdy idzie w nowym kierunku; przy 45° szyk staje się
  // ukośny (rzut) — odstępy nieregularne do zatrzymania i SPOCZNIJ (D-046).
  const oblique = Math.abs(delta) % 180 !== 0;
  return {
    ...state,
    squad: { ...squad, irregularSpacing: oblique || squad.irregularSpacing, march: { ...march, heading } },
  };
}

function turnToward(facing: number, target: number, dt: number): number {
  const d = angleDelta(facing, target);
  const max = FACING_RATE * dt;
  return Math.abs(d) <= max ? normalizeAngle(target) : normalizeAngle(facing + Math.sign(d) * max);
}

/** Pozycja, front i chód żołnierza w ruchu — tylko gdy nie wykonuje własnego przejścia (np. WRÓĆ). */
function moves(s: Soldier): boolean {
  const segment = s.plan[s.planIndex];
  return !isBusy(s) || segment?.kind !== 'lerp';
}

function note(time: number, code: Report['code'], text: string): Report {
  return { time, soldierId: null, text, kind: 'note', ...(code ? { code } : {}) };
}

/**
 * Jeden krok ruchu ciągłego (wywoływany z `step` po planach żołnierzy). Zwraca stan i nowe uwagi.
 */
export function stepMarch(state: SimState, reports: Report[]): SimState {
  let current = state;
  const march0 = current.squad.march;
  if (!march0) return current;
  // WRÓĆ: szybki powrót przerywa ruch, który wznawia się po powrocie z migawki.
  if (current.squad.activity?.commandId === 'X-1') return current;

  // Zaplanowane zdarzenia (trzy kroki, jeszcze jeden krok…).
  for (const item of march0.pending) {
    const m = current.squad.march;
    if (!m) break;
    const due = item.basis === 'distance' ? m.distance >= item.at - 1e-9 : current.time >= item.at - 1e-9;
    if (!due) continue;
    current = {
      ...current,
      squad: current.squad.march ? { ...current.squad, march: { ...current.squad.march, pending: current.squad.march.pending.filter((p) => p !== item) } } : current.squad,
    };
    current = applyEvent(current, item.event, reports);
  }
  const march = current.squad.march;
  if (!march) return current;

  switch (march.kind) {
    case 'RIGID':
      return stepRigid(current, march);
    case 'WHEEL':
      return stepWheel(current, march);
    case 'TRAIL':
      return stepTrail(current, march, reports);
  }
}

function soldierMotion(march: MarchState, moved: boolean): Motion {
  if (march.motion === 'RUNNING' && moved) return 'RUNNING';
  return moved ? 'MARCHING' : 'MARCHING_IN_PLACE';
}

function stepRigid(state: SimState, march: MarchState): SimState {
  const ds = leaderSpeed(march) * DT;
  const offset = scale(forward(march.heading), ds);
  const gait: Gait = ds > 0 ? marchingGait(march) : 'MARK';
  const soldiers = state.soldiers.map((s) => {
    if (!moves(s)) return s;
    const stride = s.stride + (ds > 0 ? ds : MARCH_SPEED * DT * 0.6);
    return {
      ...s,
      position: add(s.position, offset),
      facing: turnToward(s.facing, march.heading, DT),
      gait: routeGait(march, gait),
      stride,
      motion: soldierMotion(march, ds > 0),
    };
  });
  const layout = layoutFromPositions(new Map(soldiers.map((s) => [s.id, s.position])), march.heading);
  return { ...state, soldiers, squad: { ...state.squad, layout, march: { ...march, distance: march.distance + ds } } };
}

/** Krok dowolny (marsz nie w nogę): faza kroku przesuwana w rendererze według numeru żołnierza. */
function routeGait(march: MarchState, gait: Gait): Gait {
  return march.step === 'ROUTE' && gait === 'QUICK' ? 'ROUTE' : gait;
}

function stepWheel(state: SimState, march: MarchState): SimState {
  const wheel = march.wheel;
  if (!wheel) return state;
  const dθ = wheel.sign * wheel.rate * DT;
  const soldiers = state.soldiers.map((s) => {
    if (!moves(s)) return s;
    const position = rotateAround(s.position, wheel.pivot, dθ);
    const moved = distance(position, s.position);
    const pivot = s.id === wheel.pivotId;
    return {
      ...s,
      position,
      facing: normalizeAngle(s.facing + dθ),
      gait: pivot ? ('MARK' as const) : ('QUICK' as const),
      stride: s.stride + (pivot ? MARCH_SPEED * DT * 0.6 : moved),
      motion: pivot ? ('MARCHING_IN_PLACE' as const) : ('MARCHING' as const),
    };
  });
  const layout = state.squad.layout
    ? { ...state.squad.layout, origin: rotateAround(state.squad.layout.origin, wheel.pivot, dθ), facing: normalizeAngle(state.squad.layout.facing + dθ) }
    : null;
  return { ...state, soldiers, squad: { ...state.squad, layout, march: { ...march, heading: normalizeAngle(march.heading + dθ) } } };
}

function stepTrail(state: SimState, march0: MarchState, reports: Report[]): SimState {
  let march = march0;
  const following = march0.follow;
  // Prowadzący: dowódca przy „Za mną”, w pozostałych przypadkach punkt przed kierunkowym.
  if (march.follow) {
    const last = march.trail[march.trail.length - 1];
    const commander = state.commander.position;
    if (last && distance(last.p, commander) > 0.02) {
      const d = distance(last.p, commander);
      march = {
        ...march,
        trail: [...march.trail, { s: last.s + d, p: commander }],
        heading: bearing(last.p, commander),
        distance: march.distance + d,
      };
    }
  } else {
    march = advanceLeader(march, leaderSpeed(march) * DT);
  }
  const head = leaderS(march);
  const lead = march.follow ? COMMANDER_LEAD : 0;
  const vmax = (march.motion === 'RUNNING' ? RUN_SPEED : MARCH_SPEED) * CATCH_UP;
  const byId = new Map(state.soldiers.map((s) => [s.id, s]));
  const followers = march.followers.map((f) => {
    const soldier = byId.get(f.id);
    if (soldier && !moves(soldier)) return f;
    const gap = head - lead - f.depth - f.s;
    const lateralGap = f.targetLateral - f.lateral;
    // Do przodu: najpierw w bok, potem dogonienie; do tyłu: najpierw odstęp, potem w bok.
    const forwardAllowed = gap <= 0.3 || Math.abs(lateralGap) < 0.05;
    const lateralAllowed = gap >= -0.3;
    const ds = forwardAllowed ? Math.min(Math.max(gap, 0), vmax * DT) : 0;
    const dl = lateralAllowed ? Math.sign(lateralGap) * Math.min(Math.abs(lateralGap), LATERAL_SPEED * DT) : 0;
    return { ...f, s: f.s + ds, lateral: f.lateral + dl };
  });
  const guideMoved = followers.some((f, i) => f.depth === 0 && f.s > (march.followers[i]?.s ?? f.s) + 1e-6);
  march = { ...march, followers };

  const gait = marchingGait(march);
  const soldiers = state.soldiers.map((s) => {
    const f = followers.find((x) => x.id === s.id);
    if (!f || !moves(s)) return s;
    const at = followerPosition(march, f);
    const moved = distance(at.p, s.position);
    const walking = moved > 1e-5;
    return {
      ...s,
      position: at.p,
      facing: turnToward(s.facing, at.heading, DT),
      gait: walking ? routeGait(march, gait) : ('MARK' as const),
      stride: s.stride + (walking ? moved : MARCH_SPEED * DT * 0.6),
      motion: soldierMotion(march, walking),
    };
  });

  // Uwagi: dowódca stanął przy „Za mną” (W_FOLLOW_HALT); kolumna wyrównana po „W dwójki – W PRZÓD” (W_AWAIT_QUICK_STEP).
  const converged = followersConverged(march, head);
  if (following) {
    const halted = !guideMoved && converged;
    // Uwaga dopiero, gdy dowódca ruszył i stanął (na starcie kolumna czeka, aż dowódca odejdzie).
    if (halted && !march.followHalted && march.distance > 0) {
      reports.push(note(state.time, 'W_FOLLOW_HALT', 'Dowódca stanął — drużyna maszeruje w miejscu. Do zatrzymania służy „Drużyna – STÓJ”.'));
    }
    march = { ...march, followHalted: halted };
  }
  if (march.awaitingQuickStep && converged && !march.quickStepWarned) {
    reports.push(note(state.time, 'W_AWAIT_QUICK_STEP', 'Kolumna wyrównała odstępy i odległości — podaj „Zwykły – KROK” (pkt 77).'));
    march = { ...march, quickStepWarned: true };
  }

  const layout = trailLayout(march, state.squad.layout);
  // I-2: po rozwarciu kolumny do odległości regulaminowych flaga odstępów nieregularnych znika.
  const formation = state.squad.formation;
  const regular =
    converged && layout !== null && formation !== 'DISPERSED' && hasRegulationSpacing(formation, layout);
  let next: SimState = {
    ...state,
    soldiers,
    squad: {
      ...state.squad,
      march: pruneTrail(march),
      layout,
      irregularSpacing: regular ? false : state.squad.irregularSpacing,
    },
  };
  if (march.headHalt && converged) next = finishHeadHalt(next, march.headHalt.face);
  return next;
}

/** Układ szyku w układzie śladu: kierunkowy jako punkt odniesienia, w głąb — droga po śladzie. */
function trailLayout(march: MarchState, previous: Layout | null): Layout | null {
  const guide = [...march.followers].sort((a, b) => b.s - a.s || a.lateral - b.lateral)[0];
  if (!guide) return previous;
  const origin = trailAt(march.trail, guide.s, march.heading).p;
  const slots = [...march.followers]
    .map((f) => ({ id: f.id, lateral: round(f.lateral), depth: round(guide.s - f.s) }))
    .sort((a, b) => a.depth - b.depth || a.lateral - b.lateral);
  return { facing: normalizeAngle(trailAt(march.trail, guide.s, march.heading).heading), origin, slots };
}

const round = (v: number): number => Math.round(v * 1e6) / 1e6;

/** Koniec zatrzymania niejednoczesnego: „Czoło – STÓJ” (I-17) albo „Stawaj” ze zwrotem i nowym szykiem. */
function finishHeadHalt(state: SimState, face: number | null): SimState {
  const stopped = halt(state, POSTURE_AFTER_HEAD_HALT);
  if (face === null) return stopped;
  const { squad } = stopped;
  const formation: Formation = squad.formation === 'FILE' ? 'SINGLE_RANK' : squad.formation === 'COLUMN_OF_TWOS' ? 'DOUBLE_RANK' : squad.formation;
  const heading = squad.layout?.facing ?? 0;
  const facing = normalizeAngle(heading + face);
  const order = squad.layout?.slots.map((s) => s.id) ?? [];
  const soldiers = stopped.soldiers.map((s) => {
    // Kolejni dochodzą i robią zwrot — od czoła do końca kolumny.
    const index = Math.max(0, order.indexOf(s.id));
    const plan = new PlanBuilder({ position: s.position, facing: s.facing })
      .wait(index * 0.12)
      .turn(face)
      .act({ posture: POSTURE_AFTER_HEAD_HALT });
    return withPlan({ ...s, posture: 'ATTENTION' as const }, plan.build());
  });
  const layout = layoutFromPositions(new Map(soldiers.map((s) => [s.id, s.position])), facing);
  return {
    ...stopped,
    soldiers,
    squad: {
      ...squad,
      formation,
      layout,
      irregularSpacing: formation === 'SINGLE_RANK' || formation === 'DOUBLE_RANK' ? !hasRegulationSpacing(formation, layout) : squad.irregularSpacing,
      activity: { commandId: 'M-11', blocking: true },
    },
  };
}

/** Zatrzymanie niejednoczesne (M-10, M-11): czoło staje, reszta dochodzie na odległość `depthStep`. */
export function startHeadHalt(state: SimState, face: number | null): SimState {
  const march = state.squad.march;
  if (march?.kind !== 'TRAIL') return state;
  const formation = state.squad.formation;
  const followers = march.followers.map((f) => {
    if (face === null) return f;
    // „Stawaj”: dochodzą do poprzedników na odstęp szeregu (żołnierze staną obok siebie po zwrocie).
    const order = [...march.followers].sort((a, b) => b.s - a.s || a.lateral - b.lateral);
    const index = order.indexOf(f);
    const rank = formation === 'COLUMN_OF_TWOS' ? Math.floor(index / 2) : index;
    return { ...f, depth: rank * COLUMN_DEPTH_WHEN_HALTING_FACED };
  });
  return {
    ...state,
    squad: {
      ...state.squad,
      march: { ...march, followers, headHalt: { face }, follow: false, pending: [] },
      activity: { commandId: face === null ? 'M-10' : 'M-11', blocking: true },
    },
  };
}

/** Kolumna nadal zmienia szyk (MS-1, MS-2) albo zatrzymuje się niejednocześnie — czynność przejściowa. */
export function marchTransitional(state: SimState): boolean {
  const march = state.squad.march;
  if (!march) return false;
  if (march.headHalt) return true;
  const id = state.squad.activity?.commandId;
  return (id === 'MS-1' || id === 'MS-2') && march.kind === 'TRAIL' && !followersConverged(march, leaderS(march));
}

/** Ruch drużyny w danej chwili (warunki wstępne). */
export function squadMotion(state: SimState): Motion | 'WHEELING' {
  const march = state.squad.march;
  if (!march) return 'STANDING';
  if (march.kind === 'WHEEL') return 'WHEELING';
  return march.motion;
}

/** Ślad kierunkowego (do testów i interfejsu). */
export function guideTrail(state: SimState): readonly TrailPoint[] {
  return state.squad.march?.trail ?? [];
}

