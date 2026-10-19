/**
 * Geometria placu: wektory w metrach (x na wschód, y na północ) i kierunki w stopniach
 * (0° = północ, zgodnie z ruchem wskazówek zegara — SPEC 5.1, „front”).
 */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const length = (a: Vec2): number => Math.hypot(a.x, a.y);
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const lerpVec = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Kąt sprowadzony do przedziału [0, 360). */
export function normalizeAngle(deg: number): number {
  const a = deg % 360;
  const r = a < 0 ? a + 360 : a;
  // Zaokrąglenie usuwa szum zmiennoprzecinkowy (np. 359.99999999 po kilku zwrotach).
  const rounded = Math.round(r * 1e9) / 1e9;
  return rounded >= 360 ? 0 : rounded;
}

/** Najkrótsza różnica kątów b − a w przedziale (−180, 180]. */
export function angleDelta(a: number, b: number): number {
  const d = normalizeAngle(b - a);
  return d > 180 ? d - 360 : d;
}

const RAD = Math.PI / 180;

/** Wektor jednostkowy w kierunku `facing`. */
export function forward(facing: number): Vec2 {
  return { x: Math.sin(facing * RAD), y: Math.cos(facing * RAD) };
}

/** Wektor jednostkowy w prawo od kierunku `facing`. */
export function rightOf(facing: number): Vec2 {
  return { x: Math.cos(facing * RAD), y: -Math.sin(facing * RAD) };
}

/** Kierunek (azymut) od punktu `from` do punktu `to`. */
export function bearing(from: Vec2, to: Vec2): number {
  return normalizeAngle(Math.atan2(to.x - from.x, to.y - from.y) / RAD);
}

/**
 * Współrzędne punktu w układzie szyku: `lateral` — ile metrów w lewo od punktu odniesienia,
 * `depth` — ile metrów w głąb (do tyłu) od punktu odniesienia.
 */
export function toFormationFrame(origin: Vec2, facing: number, point: Vec2): { lateral: number; depth: number } {
  const d = sub(point, origin);
  return { lateral: -dot(d, rightOf(facing)), depth: -dot(d, forward(facing)) };
}

export function fromFormationFrame(origin: Vec2, facing: number, lateral: number, depth: number): Vec2 {
  const r = rightOf(facing);
  const f = forward(facing);
  return { x: origin.x - r.x * lateral - f.x * depth, y: origin.y - r.y * lateral - f.y * depth };
}

/** Płynne przejście 0→1 (początek i koniec bez szarpnięcia). */
export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}
