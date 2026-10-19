/**
 * Kamera placu: przekształcenie współrzędnych świata (metry; x na wschód, y na północ)
 * na współrzędne ekranu (piksele CSS; x w prawo, y w dół). Północ zawsze u góry (SPEC 3.9).
 */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export interface Camera {
  /** Punkt świata widoczny na środku ekranu. */
  readonly center: Vec2;
  /** Przybliżenie: ile pikseli CSS przypada na metr. */
  readonly pixelsPerMeter: number;
}

export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/** Oczko siatki na nawierzchni placu (SPEC 3.9). */
export const GRID_SPACING_M = 5;

/** Płyty nawierzchni, widoczne tylko przy wystarczającym przybliżeniu (DECISIONS.md, D-007). */
export const SLAB_SIZE_M = 1;
export const SLAB_MIN_PIXELS_PER_METER = 12;

/** Start: środek placu, gdzie stoi dowódca (COMMANDS.md, „Scenariusze akceptacyjne”). */
export const DEFAULT_CAMERA: Camera = { center: { x: 0, y: 0 }, pixelsPerMeter: 24 };

export function worldToScreen(camera: Camera, viewport: Viewport, point: Vec2): Vec2 {
  return {
    x: viewport.width / 2 + (point.x - camera.center.x) * camera.pixelsPerMeter,
    y: viewport.height / 2 - (point.y - camera.center.y) * camera.pixelsPerMeter,
  };
}

export function screenToWorld(camera: Camera, viewport: Viewport, point: Vec2): Vec2 {
  return {
    x: camera.center.x + (point.x - viewport.width / 2) / camera.pixelsPerMeter,
    y: camera.center.y - (point.y - viewport.height / 2) / camera.pixelsPerMeter,
  };
}

export function visibleBounds(camera: Camera, viewport: Viewport): Bounds {
  const halfWidth = viewport.width / 2 / camera.pixelsPerMeter;
  const halfHeight = viewport.height / 2 / camera.pixelsPerMeter;
  return {
    minX: camera.center.x - halfWidth,
    maxX: camera.center.x + halfWidth,
    minY: camera.center.y - halfHeight,
    maxY: camera.center.y + halfHeight,
  };
}

/** Współrzędne linii siatki o rozstawie `spacing` leżących w przedziale [min, max]. */
export function gridLines(min: number, max: number, spacing: number): number[] {
  if (!(spacing > 0)) throw new RangeError(`Rozstaw siatki musi być dodatni, otrzymano ${String(spacing)}`);
  const lines: number[] = [];
  for (let k = Math.ceil(min / spacing); k * spacing <= max; k++) {
    lines.push(k * spacing + 0); // + 0 zamienia −0 na 0
  }
  return lines;
}
