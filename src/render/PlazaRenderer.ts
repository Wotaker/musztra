import {
  DEFAULT_CAMERA,
  GRID_SPACING_M,
  SLAB_MIN_PIXELS_PER_METER,
  SLAB_SIZE_M,
  gridLines,
  visibleBounds,
  worldToScreen,
  type Camera,
  type Viewport,
} from './camera';
import { PALETTE } from './palette';

/**
 * Renderer placu na Canvas 2D, działający poza Reactem (SPEC 4.1).
 * Rysuje klatkę tylko wtedy, gdy coś się zmieniło (rozmiar, kamera).
 */
export class PlazaRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly resizeObserver: ResizeObserver;
  private camera: Camera = DEFAULT_CAMERA;
  private viewport: Viewport = { width: 0, height: 0 };
  private dpr = 1;
  private frameRequest: number | null = null;
  private frames = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Przeglądarka nie obsługuje Canvas 2D.');
    this.ctx = ctx;
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  setCamera(camera: Camera): void {
    this.camera = camera;
    this.requestDraw();
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.viewport = { width: rect.width, height: rect.height };
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.requestDraw();
  }

  private requestDraw(): void {
    if (this.frameRequest !== null) return;
    this.frameRequest = requestAnimationFrame(() => {
      this.frameRequest = null;
      this.draw();
    });
  }

  private draw(): void {
    const { ctx, camera, viewport, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PALETTE.plaza;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    if (camera.pixelsPerMeter >= SLAB_MIN_PIXELS_PER_METER) {
      this.drawGrid(SLAB_SIZE_M, PALETTE.slabJoint, 1);
    }
    this.drawGrid(GRID_SPACING_M, PALETTE.gridLine, 1);

    this.frames++;
    this.canvas.dataset.frames = String(this.frames);
  }

  /** Linie siatki o grubości `widthCss` px, wyrównane do pikseli urządzenia (ostre, bez rozmycia). */
  private drawGrid(spacing: number, color: string, widthCss: number): void {
    const { ctx, camera, viewport, dpr } = this;
    const bounds = visibleBounds(camera, viewport);
    const deviceWidth = Math.max(1, Math.round(widthCss * dpr));
    const snap = (v: number): number => (Math.round(v * dpr) + (deviceWidth % 2) / 2) / dpr;

    ctx.beginPath();
    for (const x of gridLines(bounds.minX, bounds.maxX, spacing)) {
      const sx = snap(worldToScreen(camera, viewport, { x, y: 0 }).x);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, viewport.height);
    }
    for (const y of gridLines(bounds.minY, bounds.maxY, spacing)) {
      const sy = snap(worldToScreen(camera, viewport, { x: 0, y }).y);
      ctx.moveTo(0, sy);
      ctx.lineTo(viewport.width, sy);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = deviceWidth / dpr;
    ctx.stroke();
  }
}
