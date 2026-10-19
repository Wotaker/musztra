import { describe, expect, it } from 'vitest';
import {
  AUTO_ZOOM,
  approachCamera,
  DEFAULT_CAMERA,
  followTarget,
  isLargeMove,
  GRID_SPACING_M,
  gridLines,
  screenToWorld,
  visibleBounds,
  worldToScreen,
  type Camera,
  type Viewport,
} from '../../src/render/camera';

const viewport: Viewport = { width: 1280, height: 720 };

describe('kamera placu', () => {
  it('domyślnie patrzy na środek placu (stanowisko dowódcy w punkcie 0, 0)', () => {
    expect(DEFAULT_CAMERA.center).toEqual({ x: 0, y: 0 });
    expect(worldToScreen(DEFAULT_CAMERA, viewport, { x: 0, y: 0 })).toEqual({ x: 640, y: 360 });
  });

  it('północ jest u góry, wschód po prawej (SPEC 3.9, COMMANDS: x na wschód, y na północ)', () => {
    const origin = worldToScreen(DEFAULT_CAMERA, viewport, { x: 0, y: 0 });
    const north = worldToScreen(DEFAULT_CAMERA, viewport, { x: 0, y: 5 });
    const east = worldToScreen(DEFAULT_CAMERA, viewport, { x: 5, y: 0 });
    expect(north.y).toBeLessThan(origin.y);
    expect(north.x).toBe(origin.x);
    expect(east.x).toBeGreaterThan(origin.x);
    expect(east.y).toBe(origin.y);
  });

  it('przelicza metry na piksele zgodnie z przybliżeniem', () => {
    const camera: Camera = { center: { x: 10, y: -4 }, pixelsPerMeter: 30 };
    const p = worldToScreen(camera, viewport, { x: 12, y: -3 });
    expect(p).toEqual({ x: 640 + 2 * 30, y: 360 - 1 * 30 });
  });

  it('przekształcenie ekran → świat jest odwrotne do świat → ekran', () => {
    const camera: Camera = { center: { x: -7.5, y: 33 }, pixelsPerMeter: 17 };
    for (const point of [
      { x: 0, y: 0 },
      { x: -50, y: -30 },
      { x: 60, y: -40 },
      { x: 0.6, y: 1.2 },
    ]) {
      const back = screenToWorld(camera, viewport, worldToScreen(camera, viewport, point));
      expect(back.x).toBeCloseTo(point.x, 9);
      expect(back.y).toBeCloseTo(point.y, 9);
    }
  });

  it('widoczny obszar obejmuje cały ekran', () => {
    const camera: Camera = { center: { x: 0, y: 0 }, pixelsPerMeter: 20 };
    expect(visibleBounds(camera, viewport)).toEqual({ minX: -32, maxX: 32, minY: -18, maxY: 18 });
  });
});

describe('siatka placu', () => {
  it('ma oczko co 5 m (SPEC 3.9)', () => {
    expect(GRID_SPACING_M).toBe(5);
  });

  it('wyznacza linie siatki w zadanym zakresie, łącznie z granicami', () => {
    expect(gridLines(-12, 12, 5)).toEqual([-10, -5, 0, 5, 10]);
    expect(gridLines(-10, 10, 5)).toEqual([-10, -5, 0, 5, 10]);
    expect(gridLines(1, 4, 5)).toEqual([]);
    expect(gridLines(3, 27, 5)).toEqual([5, 10, 15, 20, 25]);
  });

  it('linia przez środek placu ma współrzędną 0, a nie −0', () => {
    const lines = gridLines(-3, 3, 5);
    expect(lines).toHaveLength(1);
    expect(Object.is(lines[0], 0)).toBe(true);
  });

  it('pokrywa cały ekran przy domyślnej kamerze, z równymi odstępami na ekranie', () => {
    const bounds = visibleBounds(DEFAULT_CAMERA, viewport);
    const xs = gridLines(bounds.minX, bounds.maxX, GRID_SPACING_M).map(
      (x) => worldToScreen(DEFAULT_CAMERA, viewport, { x, y: 0 }).x,
    );
    expect(xs.length).toBeGreaterThan(2);
    const first = xs[0] ?? Number.NaN;
    const last = xs[xs.length - 1] ?? Number.NaN;
    const step = GRID_SPACING_M * DEFAULT_CAMERA.pixelsPerMeter;
    expect(first).toBeLessThan(step);
    expect(viewport.width - last).toBeLessThan(step);
    for (let i = 1; i < xs.length; i++) {
      expect((xs[i] ?? 0) - (xs[i - 1] ?? 0)).toBeCloseTo(step, 9);
    }
  });

  it('odrzuca nieprawidłowy rozstaw', () => {
    expect(() => gridLines(0, 10, 0)).toThrow();
    expect(() => gridLines(0, 10, -5)).toThrow();
  });
});

describe('kamera śledząca (SPEC 3.9)', () => {
  const insets = { top: 60, right: 20, bottom: 160, left: 20 };

  it('kadruje drużynę i dowódcę w widocznej części ekranu', () => {
    const squad = [
      { x: -0.6, y: 0 },
      { x: -5.4, y: 0 },
    ];
    const target = followTarget(squad, { x: 0, y: 0 }, viewport, insets, null);
    expect(target.squadOnly).toBe(false);
    for (const p of [...squad, { x: 0, y: 0 }]) {
      const s = worldToScreen(target.camera, viewport, p);
      expect(s.x).toBeGreaterThanOrEqual(insets.left);
      expect(s.x).toBeLessThanOrEqual(viewport.width - insets.right);
      expect(s.y).toBeGreaterThanOrEqual(insets.top);
      expect(s.y).toBeLessThanOrEqual(viewport.height - insets.bottom);
    }
    expect(target.camera.pixelsPerMeter).toBeLessThanOrEqual(AUTO_ZOOM.max);
  });

  it('gdy dowódca oddali się ponad limit, kamera śledzi samą drużynę', () => {
    const target = followTarget([{ x: 0, y: 0 }], { x: 300, y: 0 }, viewport, insets, null);
    expect(target.squadOnly).toBe(true);
    expect(target.camera.pixelsPerMeter).toBeGreaterThanOrEqual(AUTO_ZOOM.min);
  });

  it('ręczny zoom zastępuje automatyczny', () => {
    const target = followTarget([{ x: 0, y: 0 }], { x: 0, y: 0 }, viewport, insets, 80);
    expect(target.camera.pixelsPerMeter).toBe(80);
  });

  it('kamera dochodzi do celu płynnie i zbieżnie', () => {
    let camera = DEFAULT_CAMERA;
    const target: Camera = { center: { x: 10, y: -4 }, pixelsPerMeter: 48 };
    const first = approachCamera(camera, target, 1 / 60);
    expect(first.center.x).toBeGreaterThan(0);
    expect(first.center.x).toBeLessThan(10);
    for (let i = 0; i < 600; i++) camera = approachCamera(camera, target, 1 / 60);
    expect(camera.center.x).toBeCloseTo(10, 3);
    expect(camera.pixelsPerMeter).toBeCloseTo(48, 3);
  });

  it('duży ruch: przesunięcie kadru lub wyraźna zmiana jego wielkości', () => {
    const a = { focus: { x: 0, y: 0 }, size: 10 };
    expect(isLargeMove(a, { focus: { x: 2, y: 1 }, size: 11 })).toBe(false);
    expect(isLargeMove(a, { focus: { x: 12, y: 0 }, size: 10 })).toBe(true);
    expect(isLargeMove(a, { focus: { x: 0, y: 0 }, size: 25 })).toBe(true);
  });
});
