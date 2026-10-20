import type { TerrainObjectId } from '../core/catalog';
import { isMarchFormation, leftFlankId, rightFlankId } from '../core/sim/formation';
import { angleDelta, lerpVec } from '../core/sim/geometry';
import type { SimState, Soldier } from '../core/sim/state';
import { WORLD_OBJECTS } from '../core/sim/world';
import {
  GRID_SPACING_M,
  SLAB_MIN_PIXELS_PER_METER,
  SLAB_SIZE_M,
  gridLines,
  visibleBounds,
  worldToScreen,
  type Camera,
  type Insets,
  type Viewport,
} from './camera';
import { drawFigure, drawFigureShadow, figureScale, type FigureView } from './figures';
import { PALETTE } from './palette';
import { drawObjects, drawRoad } from './scenery';

/** Klatka do narysowania: stan symulacji (z poprzednim do interpolacji), kamera i opcje widoku. */
export interface RenderFrame {
  readonly state: SimState;
  /** Stan sprzed ostatniego kroku symulacji — renderer interpoluje między nimi (SPEC 5.5). */
  readonly previous: SimState | null;
  readonly alpha: number;
  readonly camera: Camera;
  readonly insets: Insets;
  readonly showRoles: boolean;
  readonly hoveredSoldier: number | null;
  readonly hoveredObject: TerrainObjectId | null;
}

/** Przybliżenie, od którego nazwy obiektów są widoczne stale (SPEC 3.9). */
const LABELS_ALWAYS_FROM = 26;

function interpolate(previous: Soldier | undefined, current: Soldier, alpha: number): Soldier {
  if (!previous || alpha >= 1) return current;
  return {
    ...current,
    position: lerpVec(previous.position, current.position, alpha),
    facing: previous.facing + angleDelta(previous.facing, current.facing) * alpha,
    stride: previous.stride + (current.stride - previous.stride) * alpha,
  };
}

/**
 * Renderer placu na Canvas 2D, działający poza Reactem (SPEC 4.1): nawierzchnia z siatką, droga,
 * obiekty terenowe, żołnierze, dowódca, dymki meldunków i znaczniki.
 */
export class PlazaRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly resizeObserver: ResizeObserver;
  private viewport: Viewport = { width: 0, height: 0 };
  private dpr = 1;
  private frames = 0;
  private last: RenderFrame | null = null;

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

  get size(): Viewport {
    return this.viewport;
  }

  dispose(): void {
    this.resizeObserver.disconnect();
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.viewport = { width: rect.width, height: rect.height };
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    if (this.last) this.render(this.last);
  }

  render(frame: RenderFrame): void {
    this.last = frame;
    const { ctx, viewport, dpr } = this;
    const camera = frame.camera;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PALETTE.plaza;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    if (camera.pixelsPerMeter >= SLAB_MIN_PIXELS_PER_METER) this.drawGrid(camera, SLAB_SIZE_M, PALETTE.slabJoint);
    this.drawGrid(camera, GRID_SPACING_M, PALETTE.gridLine);

    drawRoad(ctx, camera, viewport, dpr);
    drawObjects(ctx, WORLD_OBJECTS, camera, viewport, dpr, frame.state.time);

    const previous = new Map((frame.previous?.soldiers ?? []).map((s) => [s.id, s]));
    const soldiers = frame.state.soldiers.map((s) => interpolate(previous.get(s.id), s, frame.alpha));
    const commander = frame.state.commander;
    const prevCommander = frame.previous?.commander;
    const commanderView: FigureView = {
      x: prevCommander ? prevCommander.position.x + (commander.position.x - prevCommander.position.x) * frame.alpha : commander.position.x,
      y: prevCommander ? prevCommander.position.y + (commander.position.y - prevCommander.position.y) * frame.alpha : commander.position.y,
      facing: prevCommander ? prevCommander.facing + angleDelta(prevCommander.facing, commander.facing) * frame.alpha : commander.facing,
      gait: commander.gait,
      stride: prevCommander ? prevCommander.stride + (commander.stride - prevCommander.stride) * frame.alpha : commander.stride,
      posture: 'ATTENTION',
      head: 'FRONT',
      armRaised: false,
      highlighted: false,
    };

    const views: { view: FigureView; commander: boolean }[] = soldiers.map((s) => ({
      view: {
        x: s.position.x,
        y: s.position.y,
        facing: s.facing,
        gait: s.gait,
        // Krok dowolny: każdy żołnierz w innej fazie kroku (marsz nie w nogę, pkt 102).
        stride: s.stride + (s.gait === 'ROUTE' ? s.id * 0.53 : 0),
        posture: s.posture,
        head: s.head,
        armRaised: s.armRaisedUntil !== null && s.armRaisedUntil > frame.state.time,
        highlighted: s.id === frame.hoveredSoldier,
      },
      commander: false,
    }));
    views.push({ view: commanderView, commander: true });
    // Kolejność rysowania od północy (góra ekranu), żeby bliżsi zasłaniali dalszych.
    views.sort((a, b) => b.view.y - a.view.y);

    const k = camera.pixelsPerMeter;
    for (const { view, commander: isCommander } of views) {
      const screen = worldToScreen(camera, viewport, view);
      if (screen.x < -40 || screen.y < -40 || screen.x > viewport.width + 40 || screen.y > viewport.height + 40) continue;
      const scale = figureScale(k);
      ctx.setTransform(dpr * k * scale, 0, 0, dpr * k * scale, dpr * screen.x, dpr * screen.y);
      if (isCommander) {
        ctx.fillStyle = PALETTE.commanderRing;
        ctx.strokeStyle = 'rgba(63, 69, 39, 0.45)';
        ctx.lineWidth = 0.035;
        ctx.beginPath();
        ctx.arc(0, 0, 0.33, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (view.highlighted) {
        ctx.strokeStyle = 'rgba(255, 250, 230, 0.95)';
        ctx.lineWidth = 0.06;
        ctx.beginPath();
        ctx.arc(0, 0, 0.42, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawFigureShadow(ctx);
      ctx.rotate((view.facing * Math.PI) / 180);
      drawFigure(ctx, view, isCommander);
    }

    this.drawGestures(views.filter((v) => v.view.armRaised).map((v) => v.view), camera);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (frame.showRoles) this.drawRoles(frame, soldiers);
    this.drawLabels(frame);
    this.drawOffscreenObjects(frame);
    this.drawBubbles(frame, soldiers);
    this.drawCommanderArrow(frame, commanderView);

    this.frames++;
    this.canvas.dataset.frames = String(this.frames);
  }

  /**
   * Uniesiona lewa ręka (pkt 73) rysowana ponad szykiem, z wyraźnym znacznikiem dłoni — w zwartym szeregu
   * ręka przykrywa sąsiada, więc musi być widoczna na wierzchu (SPEC 3.5).
   */
  private drawGestures(views: readonly FigureView[], camera: Camera): void {
    const { ctx, viewport, dpr } = this;
    const k = camera.pixelsPerMeter * figureScale(camera.pixelsPerMeter);
    for (const view of views) {
      const screen = worldToScreen(camera, viewport, view);
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * screen.x, dpr * screen.y);
      ctx.rotate((view.facing * Math.PI) / 180);
      ctx.strokeStyle = 'rgba(40, 36, 20, 0.35)';
      ctx.lineCap = 'round';
      ctx.lineWidth = 0.15;
      ctx.beginPath();
      ctx.moveTo(-0.2, 0.02);
      ctx.lineTo(-0.7, 0.02);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.armRaised;
      ctx.lineWidth = 0.1;
      ctx.beginPath();
      ctx.moveTo(-0.2, 0);
      ctx.lineTo(-0.7, 0);
      ctx.stroke();
      ctx.fillStyle = PALETTE.skin;
      ctx.beginPath();
      ctx.ellipse(-0.75, 0, 0.06, 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.gestureRing;
      ctx.lineWidth = 0.045;
      ctx.beginPath();
      ctx.arc(-0.75, 0, 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** Linie siatki, wyrównane do pikseli urządzenia (ostre, bez rozmycia). */
  private drawGrid(camera: Camera, spacing: number, color: string): void {
    const { ctx, viewport, dpr } = this;
    const bounds = visibleBounds(camera, viewport);
    const deviceWidth = Math.max(1, Math.round(dpr));
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

  private drawLabels(frame: RenderFrame): void {
    const { ctx, viewport } = this;
    const always = frame.camera.pixelsPerMeter >= LABELS_ALWAYS_FROM;
    ctx.font = '600 12px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const o of WORLD_OBJECTS) {
      if (!always && frame.hoveredObject !== o.id) continue;
      const p = worldToScreen(frame.camera, viewport, o.position);
      if (p.x < -100 || p.y < -40 || p.x > viewport.width + 100 || p.y > viewport.height + 40) continue;
      const text = o.name;
      const w = ctx.measureText(text).width + 14;
      ctx.fillStyle = PALETTE.labelHalo;
      ctx.beginPath();
      ctx.roundRect(p.x - w / 2, p.y - 11, w, 22, 11);
      ctx.fill();
      ctx.fillStyle = PALETTE.label;
      ctx.fillText(text, p.x, p.y + 0.5);
    }
  }

  /** Obiekty poza kadrem: nazwa przy krawędzi ekranu ze strzałką w ich stronę (punkty odniesienia zbiórek). */
  private drawOffscreenObjects(frame: RenderFrame): void {
    const { ctx, viewport } = this;
    const { insets } = frame;
    const box = { minX: 70, maxX: viewport.width - 70, minY: insets.top + 18, maxY: viewport.height - insets.bottom - 14 };
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    ctx.font = '600 11px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const placed: { x: number; y: number; w: number }[] = [];
    for (const o of WORLD_OBJECTS) {
      const p = worldToScreen(frame.camera, viewport, o.position);
      const half = (Math.max(o.width, o.depth) / 2) * frame.camera.pixelsPerMeter;
      if (p.x + half > 0 && p.x - half < viewport.width && p.y + half > 0 && p.y - half < viewport.height) continue;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const t = Math.min(
        dx === 0 ? Infinity : (dx > 0 ? box.maxX - cx : box.minX - cx) / dx,
        dy === 0 ? Infinity : (dy > 0 ? box.maxY - cy : box.minY - cy) / dy,
      );
      const x = cx + dx * t;
      let y = cy + dy * t;
      const distanceM = Math.round(Math.hypot(dx, dy) / frame.camera.pixelsPerMeter);
      const text = `${o.name} · ${String(distanceM)} m`;
      const w = ctx.measureText(text).width + 30;
      // Etykiety nie mogą na siebie nachodzić: przesunięcie wzdłuż krawędzi.
      for (let i = 0; i < 6 && placed.some((r) => Math.abs(r.x - x) < (r.w + w) / 2 + 4 && Math.abs(r.y - y) < 24); i++) {
        y += y >= box.maxY - 1 ? -24 : 24;
      }
      placed.push({ x, y, w });
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = PALETTE.labelHalo;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - 10, w, 20, 10);
      ctx.fill();
      ctx.fillStyle = PALETTE.label;
      ctx.fillText(text, x + 7, y + 0.5);
      // Strzałka w stronę obiektu: trzonek i grot.
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const ax = x - w / 2 + 11;
      ctx.strokeStyle = PALETTE.label;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ax - ux * 6, y - uy * 6);
      ctx.lineTo(ax + ux * 2, y + uy * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax + ux * 6, y + uy * 6);
      ctx.lineTo(ax + ux * 0.5 - uy * 3.6, y + uy * 0.5 + ux * 3.6);
      ctx.lineTo(ax + ux * 0.5 + uy * 3.6, y + uy * 0.5 - ux * 3.6);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawRoles(frame: RenderFrame, soldiers: readonly Soldier[]): void {
    const layout = frame.state.squad.layout;
    if (!layout) return;
    const { ctx, viewport } = this;
    const right = rightFlankId(layout);
    const left = leftFlankId(layout);
    const march = isMarchFormation(frame.state.squad.formation);
    const tags = new Map<number, string>();
    if (right !== undefined) tags.set(right, march ? 'K' : 'P');
    if (left !== undefined && !march && left !== right) tags.set(left, 'L');
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [id, tag] of tags) {
      const s = soldiers.find((x) => x.id === id);
      if (!s) continue;
      const p = worldToScreen(frame.camera, viewport, s.position);
      const r = Math.max(7, frame.camera.pixelsPerMeter * 0.16);
      const y = p.y + frame.camera.pixelsPerMeter * 0.42 + r;
      ctx.fillStyle = PALETTE.role;
      ctx.beginPath();
      ctx.arc(p.x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff8e6';
      ctx.fillText(tag, p.x, y + 0.5);
    }
  }

  private drawBubbles(frame: RenderFrame, soldiers: readonly Soldier[]): void {
    const { ctx, viewport } = this;
    const time = frame.state.time;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of soldiers) {
      const b = s.bubble;
      if (!b || time < b.from || time > b.until) continue;
      const fadeIn = Math.min(1, (time - b.from) / 0.15);
      const fadeOut = Math.min(1, (b.until - time) / 0.3);
      const opacity = Math.min(fadeIn, fadeOut);
      const p = worldToScreen(frame.camera, viewport, s.position);
      const lift = 6 * (1 - fadeIn);
      const report = b.tone === 'report';
      ctx.font = report ? '700 13px system-ui, sans-serif' : '800 15px system-ui, sans-serif';
      const w = Math.max(26, ctx.measureText(b.text).width + (report ? 18 : 14));
      const h = report ? 24 : 26;
      const y = p.y - frame.camera.pixelsPerMeter * 0.35 - h - 8 + lift;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = 'rgba(30, 30, 20, 0.18)';
      ctx.beginPath();
      ctx.roundRect(p.x - w / 2 + 1, y + 2, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = report ? PALETTE.reportBubble : PALETTE.bubble;
      ctx.strokeStyle = report ? PALETTE.reportEdge : PALETTE.bubbleEdge;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(p.x - w / 2, y, w, h, h / 2);
      ctx.moveTo(p.x - 5, y + h);
      ctx.lineTo(p.x, y + h + 7);
      ctx.lineTo(p.x + 5, y + h);
      ctx.fill();
      ctx.stroke();
      // Zakrycie linii łączenia ogonka z dymkiem.
      ctx.fillRect(p.x - 4.4, y + h - 1.5, 8.8, 2);
      ctx.fillStyle = PALETTE.bubbleText;
      ctx.fillText(b.text, p.x, y + h / 2 + 0.5);
      ctx.globalAlpha = 1;
    }
  }

  /** Strzałka na krawędzi ekranu wskazująca dowódcę, gdy jest poza kadrem (SPEC 3.9). */
  private drawCommanderArrow(frame: RenderFrame, commander: FigureView): void {
    const { ctx, viewport } = this;
    const { insets } = frame;
    const p = worldToScreen(frame.camera, viewport, commander);
    const margin = 24;
    const box = {
      minX: margin,
      maxX: viewport.width - margin,
      minY: insets.top + margin,
      maxY: viewport.height - insets.bottom - margin,
    };
    if (p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY) return;
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    const dx = p.x - cx;
    const dy = p.y - cy;
    const t = Math.min(
      dx === 0 ? Infinity : (dx > 0 ? box.maxX - cx : box.minX - cx) / dx,
      dy === 0 ? Infinity : (dy > 0 ? box.maxY - cy : box.minY - cy) / dy,
    );
    const ax = cx + dx * t;
    const ay = cy + dy * t;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.fillStyle = PALETTE.arrow;
    ctx.strokeStyle = 'rgba(255, 252, 240, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.arrow;
    const lx = ax - Math.cos(angle) * 30;
    const ly = ay - Math.sin(angle) * 22;
    ctx.fillText('dowódca', lx, ly);
  }
}

