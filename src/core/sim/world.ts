import { TERRAIN_OBJECTS, type TerrainObject, type TerrainObjectId } from '../catalog';
import { add, scale, vec, type Vec2 } from './geometry';

/**
 * Świat: obiekty terenowe w stałych miejscach wokół środka placu (SPEC 3.9, COMMANDS „Dane pomocnicze”)
 * z punktami zaczepienia do komend zbiórki i rozejścia (DECISIONS.md, D-024).
 */

export type ObjectShape = 'mast' | 'stand' | 'barracks' | 'garages' | 'hangar' | 'warehouse';

export interface WorldObject {
  readonly id: TerrainObjectId;
  readonly name: string;
  readonly genitive: string;
  readonly shape: ObjectShape;
  /** Środek obiektu. */
  readonly position: Vec2;
  /** Szerokość wzdłuż frontu i głębokość (m); maszt — średnica podstawy. */
  readonly width: number;
  readonly depth: number;
  /** Kierunek, w który zwrócony jest front obiektu (w stronę środka placu, wielokrotność 90°). */
  readonly front: number;
  /** Przedpole: 3 m przed frontem obiektu — punkt zaczepienia „na placu”. */
  readonly anchor: Vec2;
}

/** Droga: pas wschód–zachód przecinający plac. */
export const ROAD = { axisY: -15, width: 7 } as const;

/** Odległość przedpola od frontu obiektu (COMMANDS „Dane pomocnicze”). */
export const FOREGROUND_DISTANCE = 3;

const SIZES: Readonly<Record<TerrainObjectId, { shape: ObjectShape; width: number; depth: number }>> = {
  MAST: { shape: 'mast', width: 2.4, depth: 2.4 },
  STAND: { shape: 'stand', width: 16, depth: 6 },
  BARRACKS: { shape: 'barracks', width: 42, depth: 14 },
  GARAGES: { shape: 'garages', width: 24, depth: 7 },
  HANGAR: { shape: 'hangar', width: 30, depth: 24 },
  WAREHOUSE: { shape: 'warehouse', width: 18, depth: 11 },
};

/** Front zwrócony do środka placu wzdłuż dominującej osi (budynki równoległe do siatki placu). */
function frontTowardCenter(p: Vec2): number {
  if (Math.abs(p.x) > Math.abs(p.y)) return p.x > 0 ? 270 : 90;
  return p.y > 0 ? 180 : 0;
}

const FRONT_VECTORS: Readonly<Record<number, Vec2>> = { 0: vec(0, 1), 90: vec(1, 0), 180: vec(0, -1), 270: vec(-1, 0) };

function buildObject(object: TerrainObject): WorldObject {
  const { shape, width, depth } = SIZES[object.id];
  const front = frontTowardCenter(object.position);
  const normal = FRONT_VECTORS[front] ?? vec(0, -1);
  return {
    id: object.id,
    name: object.nominative,
    genitive: object.genitive,
    shape,
    position: object.position,
    width,
    depth,
    front,
    anchor: add(object.position, scale(normal, depth / 2 + FOREGROUND_DISTANCE)),
  };
}

export const WORLD_OBJECTS: readonly WorldObject[] = TERRAIN_OBJECTS.map(buildObject);

export function worldObject(id: TerrainObjectId): WorldObject {
  const object = WORLD_OBJECTS.find((o) => o.id === id);
  if (!object) throw new Error(`Brak obiektu ${id}.`);
  return object;
}

/** Punkt zaczepienia „na wysokości obiektu”: na placu — przedpole; na drodze — najbliższy punkt osi drogi. */
export function anchorPoint(id: TerrainObjectId, terrain: 'PLAZA' | 'ROAD' | null): Vec2 {
  const object = worldObject(id);
  return terrain === 'ROAD' ? vec(object.position.x, ROAD.axisY) : object.anchor;
}

/** Obiekt terenowy pod punktem `p` (podgląd nazwy po najechaniu, SPEC 3.9). */
export function objectAt(p: Vec2): WorldObject | undefined {
  return WORLD_OBJECTS.find((o) => {
    const dx = Math.abs(p.x - o.position.x);
    const dy = Math.abs(p.y - o.position.y);
    if (o.shape === 'mast') return Math.hypot(dx, dy) <= o.width / 2 + 0.6;
    const alongFront = o.front % 180 === 0;
    const halfX = (alongFront ? o.width : o.depth) / 2;
    const halfY = (alongFront ? o.depth : o.width) / 2;
    return dx <= halfX && dy <= halfY;
  });
}
