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

// ---------------------------------------------------------------------------- śledzenie (SPEC 3.9)

/** Obszar ekranu zasłonięty przez interfejs (pasek stanu, wiersz poleceń) — kamera kadruje resztę. */
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** Granice automatycznego przybliżenia (px/m) i zakres ręcznego zoomu kółkiem myszy. */
export const AUTO_ZOOM = { min: 9, max: 72 } as const;
export const MANUAL_ZOOM = { min: 3, max: 140 } as const;
/** Margines wokół drużyny i dowódcy (m). */
export const FRAME_MARGIN = 2.2;

export function boundsOf(points: readonly Vec2[], margin = 0): Bounds {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs) - margin,
    maxX: Math.max(...xs) + margin,
    minY: Math.min(...ys) - margin,
    maxY: Math.max(...ys) + margin,
  };
}

export const boundsCenter = (b: Bounds): Vec2 => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });

/** Przybliżenie, przy którym prostokąt `bounds` mieści się w widocznej części ekranu. */
export function fitZoom(bounds: Bounds, viewport: Viewport, insets: Insets): number {
  const width = Math.max(1, viewport.width - insets.left - insets.right);
  const height = Math.max(1, viewport.height - insets.top - insets.bottom);
  return Math.min(width / Math.max(0.5, bounds.maxX - bounds.minX), height / Math.max(0.5, bounds.maxY - bounds.minY));
}

/** Kamera, która przy przybliżeniu `pixelsPerMeter` pokazuje punkt `focus` na środku widocznej części ekranu. */
export function cameraOn(focus: Vec2, pixelsPerMeter: number, insets: Insets): Camera {
  return {
    center: {
      x: focus.x - (insets.left - insets.right) / (2 * pixelsPerMeter),
      y: focus.y + (insets.top - insets.bottom) / (2 * pixelsPerMeter),
    },
    pixelsPerMeter,
  };
}

export interface FollowTarget {
  readonly camera: Camera;
  /** Drużyna i dowódca nie mieszczą się razem — kamera śledzi drużynę, a dowódcę wskazuje strzałka. */
  readonly squadOnly: boolean;
  /** Środek i wielkość kadrowanego prostokąta (do wykrywania „dużego ruchu”). */
  readonly focus: Vec2;
  readonly size: number;
}

/**
 * Cel kamery: prostokąt obejmujący drużynę i dowódcę z automatycznym zoomem w granicach; gdy się
 * rozjadą ponad limit, tylko drużyna. `manualZoom` (kółko myszy) zastępuje zoom automatyczny.
 */
export function followTarget(
  squad: readonly Vec2[],
  commander: Vec2,
  viewport: Viewport,
  insets: Insets,
  manualZoom: number | null,
): FollowTarget {
  let bounds = boundsOf([...squad, commander], FRAME_MARGIN);
  let squadOnly = false;
  if (squad.length > 0 && fitZoom(bounds, viewport, insets) < AUTO_ZOOM.min) {
    bounds = boundsOf(squad, FRAME_MARGIN);
    squadOnly = true;
  }
  const auto = Math.min(AUTO_ZOOM.max, Math.max(AUTO_ZOOM.min, fitZoom(bounds, viewport, insets)));
  const zoom = manualZoom ?? auto;
  const focus = boundsCenter(bounds);
  return {
    camera: cameraOn(focus, zoom, insets),
    squadOnly,
    focus,
    size: Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY),
  };
}

/** Płynne dojście kamery do celu (wykładnicze, zoom w skali logarytmicznej). */
export function approachCamera(current: Camera, target: Camera, dt: number, rate = 3.5): Camera {
  const k = 1 - Math.exp(-rate * Math.max(0, dt));
  const zoom = Math.exp(Math.log(current.pixelsPerMeter) + (Math.log(target.pixelsPerMeter) - Math.log(current.pixelsPerMeter)) * k);
  return {
    center: {
      x: current.center.x + (target.center.x - current.center.x) * k,
      y: current.center.y + (target.center.y - current.center.y) * k,
    },
    pixelsPerMeter: zoom,
  };
}

/** Ręczny zoom obowiązuje do kolejnego dużego ruchu: przesunięcia kadru o ponad 8 m lub zmiany jego wielkości 1,6×. */
export function isLargeMove(anchor: { focus: Vec2; size: number }, target: { focus: Vec2; size: number }): boolean {
  const moved = Math.hypot(anchor.focus.x - target.focus.x, anchor.focus.y - target.focus.y) > 8;
  const ratio = Math.max(anchor.size, target.size) / Math.max(0.1, Math.min(anchor.size, target.size));
  return moved || ratio > 1.6;
}
