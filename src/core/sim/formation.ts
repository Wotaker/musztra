import type { FormationName, TurnDirection } from '../grammar/ast';
import { frontRankSize } from '../interpretations';
import { COLUMN_INTERVAL, DISTANCE, INTERVAL } from './constants';
import { fromFormationFrame, normalizeAngle, toFormationFrame, type Vec2 } from './geometry';
import type { Formation, Layout, Slot } from './state';

/**
 * Geometria szyków: miejsca żołnierzy względem punktu odniesienia (prawe skrzydło pierwszego szeregu,
 * czoło kolumny), zwroty układu, szeregi i rzędy wyznaczane geometrycznie.
 */

export const DEPLOYED_FORMATIONS: readonly Formation[] = ['SINGLE_RANK', 'DOUBLE_RANK'];
export const MARCH_FORMATIONS: readonly Formation[] = ['FILE', 'COLUMN_OF_TWOS'];

export const isDeployed = (f: Formation): boolean => DEPLOYED_FORMATIONS.includes(f);
export const isMarchFormation = (f: Formation): boolean => MARCH_FORMATIONS.includes(f);

/** Miejsca w szyku regulaminowym dla żołnierzy `ids` w kolejności składu (nr 1 = prawoskrzydłowy). */
export function regulationSlots(formation: FormationName, ids: readonly number[]): Slot[] {
  switch (formation) {
    case 'SINGLE_RANK':
      return ids.map((id, i) => ({ id, lateral: i * INTERVAL, depth: 0 }));
    case 'DOUBLE_RANK': {
      const front = frontRankSize(ids.length);
      return ids.map((id, i) =>
        i < front ? { id, lateral: i * INTERVAL, depth: 0 } : { id, lateral: (i - front) * INTERVAL, depth: DISTANCE },
      );
    }
    case 'FILE':
      return ids.map((id, i) => ({ id, lateral: 0, depth: i * DISTANCE }));
    case 'COLUMN_OF_TWOS':
      // Pary od czoła: prawy rząd = nieparzyści, lewy = parzyści.
      return ids.map((id, i) => ({ id, lateral: (i % 2) * COLUMN_INTERVAL, depth: Math.floor(i / 2) * DISTANCE }));
  }
}

export function slotPosition(layout: Layout, slot: Slot): Vec2 {
  return fromFormationFrame(layout.origin, layout.facing, slot.lateral, slot.depth);
}

export function slotOf(layout: Layout, id: number): Slot | undefined {
  return layout.slots.find((s) => s.id === id);
}

/** Pozycje docelowe wszystkich żołnierzy układu. */
export function layoutPositions(layout: Layout): Map<number, Vec2> {
  return new Map(layout.slots.map((s) => [s.id, slotPosition(layout, s)]));
}

/** Tolerancja grupowania w szeregi i rzędy: połowa odstępu. */
const CLUSTER = 0.3;

/** Grupowanie wartości (np. głębokości) w klastry rosnąco. */
function clusters(values: readonly number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const centers: number[] = [];
  for (const v of sorted) {
    const last = centers[centers.length - 1];
    if (last === undefined || v - last > CLUSTER) centers.push(v);
  }
  return centers;
}

function clusterIndex(centers: readonly number[], v: number): number {
  let best = 0;
  centers.forEach((c, i) => {
    if (Math.abs(c - v) < Math.abs((centers[best] ?? 0) - v)) best = i;
  });
  return best;
}

/**
 * Układ z pozycji i frontu: punkt odniesienia w prawym przednim narożniku, miejsca uporządkowane
 * od czoła (szeregu) i od prawej — kolejność wyznaczana geometrycznie (zwroty, SPEC 5.4).
 */
export function layoutFromPositions(positions: ReadonlyMap<number, Vec2>, facing: number): Layout {
  const f = normalizeAngle(facing);
  const zero = { x: 0, y: 0 };
  const raw = [...positions].map(([id, p]) => ({ id, ...toFormationFrame(zero, f, p) }));
  const minLateral = Math.min(...raw.map((r) => r.lateral));
  const minDepth = Math.min(...raw.map((r) => r.depth));
  const origin = fromFormationFrame(zero, f, minLateral, minDepth);
  const slots = raw.map((r) => ({ id: r.id, lateral: round(r.lateral - minLateral), depth: round(r.depth - minDepth) }));
  const depthCenters = clusters(slots.map((s) => s.depth));
  slots.sort((a, b) => clusterIndex(depthCenters, a.depth) - clusterIndex(depthCenters, b.depth) || a.lateral - b.lateral);
  return { facing: f, origin, slots };
}

const round = (v: number): number => Math.round(v * 1e6) / 1e6;

/** Szeregi (od czoła), każdy od prawej. */
export function ranksOf(layout: Layout): Slot[][] {
  const centers = clusters(layout.slots.map((s) => s.depth));
  const ranks: Slot[][] = centers.map(() => []);
  for (const slot of layout.slots) ranks[clusterIndex(centers, slot.depth)]?.push(slot);
  return ranks.map((r) => r.sort((a, b) => a.lateral - b.lateral));
}

/** Rzędy (od prawej), każdy od czoła. */
export function filesOf(layout: Layout): Slot[][] {
  const centers = clusters(layout.slots.map((s) => s.lateral));
  const files: Slot[][] = centers.map(() => []);
  for (const slot of layout.slots) files[clusterIndex(centers, slot.lateral)]?.push(slot);
  return files.map((r) => r.sort((a, b) => a.depth - b.depth));
}

/** Prawoskrzydłowy (kierunkowy): prawy żołnierz pierwszego szeregu (pary czołowej). */
export function rightFlankId(layout: Layout): number | undefined {
  return ranksOf(layout)[0]?.[0]?.id;
}

/** Lewoskrzydłowy pierwszego szeregu. */
export function leftFlankId(layout: Layout): number | undefined {
  const front = ranksOf(layout)[0];
  return front?.[front.length - 1]?.id;
}

/** Zmiana frontu przy zwrocie w miejscu (pkt 22): w tył — przez lewe ramię. */
export function turnAngle(direction: TurnDirection): number {
  if (direction === 'RIGHT') return 90;
  if (direction === 'LEFT') return -90;
  return -180;
}

/** Szyk po zwrocie (COMMANDS Z-1) i czy zwrot był w regulaminową stronę (pkt 76). */
export function formationAfterTurn(
  formation: FormationName,
  direction: TurnDirection,
): { formation: FormationName; regular: boolean } {
  if (direction === 'ABOUT') return { formation, regular: true };
  const deployed = isDeployed(formation);
  const regular = deployed ? direction === 'RIGHT' : direction === 'LEFT';
  const swap: Record<FormationName, FormationName> = {
    SINGLE_RANK: 'FILE',
    FILE: 'SINGLE_RANK',
    DOUBLE_RANK: 'COLUMN_OF_TWOS',
    COLUMN_OF_TWOS: 'DOUBLE_RANK',
  };
  return { formation: swap[formation], regular };
}

/** Odstępy i odległości regulaminowe dla szyku (SPEC 5.2). */
export function regulationSpacing(formation: FormationName): { interval: number; distance: number } {
  return isDeployed(formation) ? { interval: INTERVAL, distance: DISTANCE } : { interval: COLUMN_INTERVAL, distance: DISTANCE };
}

const SPACING_TOLERANCE = 0.05;

/** Czy odstępy między rzędami i odległości między szeregami układu są regulaminowe. */
export function hasRegulationSpacing(formation: FormationName, layout: Layout): boolean {
  const { interval, distance } = regulationSpacing(formation);
  const gapsOk = (values: number[], expected: number) =>
    values.every((v, i) => i === 0 || Math.abs(v - (values[i - 1] ?? 0) - expected) <= SPACING_TOLERANCE);
  const lateral = clusters(layout.slots.map((s) => s.lateral));
  const depth = clusters(layout.slots.map((s) => s.depth));
  return gapsOk(lateral, interval) && gapsOk(depth, distance);
}

/**
 * Układ regulaminowy o tej samej strukturze (szeregi, rzędy, kolejność), wyrównany względem
 * prawoskrzydłowego / czoła (SPOCZNIJ, „Równaj – W PRAWO”) albo lewoskrzydłowego („Równaj – W LEWO”).
 * `fileGaps` pozwala zachować odstępy po odstępowaniu.
 */
export function regularizedLayout(
  formation: FormationName,
  layout: Layout,
  options: { anchorSide?: 'RIGHT' | 'LEFT'; fileGaps?: readonly number[] } = {},
): Layout {
  const { interval, distance } = regulationSpacing(formation);
  const lateralCenters = clusters(layout.slots.map((s) => s.lateral));
  const depthCenters = clusters(layout.slots.map((s) => s.depth));
  const lateralOf = (fileIndex: number): number => {
    let sum = 0;
    for (let i = 0; i < fileIndex; i++) sum += options.fileGaps?.[i] ?? interval;
    return sum;
  };
  const slots = layout.slots.map((s) => ({
    id: s.id,
    lateral: lateralOf(clusterIndex(lateralCenters, s.lateral)),
    depth: clusterIndex(depthCenters, s.depth) * distance,
  }));
  let origin = layout.origin;
  if (options.anchorSide === 'LEFT') {
    // Lewe skrzydło pierwszego szeregu zostaje na miejscu; reszta wyrównuje się do niego.
    const leftIndex = lateralCenters.length - 1;
    const oldLeft = lateralCenters[leftIndex] ?? 0;
    const shift = oldLeft - lateralOf(leftIndex);
    origin = fromFormationFrame(layout.origin, layout.facing, shift, 0);
  }
  return { facing: layout.facing, origin, slots };
}

/** Odstępy między kolejnymi rzędami układu (od prawej). */
export function fileGapsOf(layout: Layout): number[] {
  const lateral = clusters(layout.slots.map((s) => s.lateral));
  return lateral.slice(1).map((v, i) => round(v - (lateral[i] ?? 0)));
}
