import type { TerrainObjectId } from '../core/catalog';
import { absorbReports } from '../core/session';
import { DT } from '../core/sim/constants';
import { describeStatus } from '../core/sim/describe';
import { step } from '../core/sim/simulate';
import type { SimState } from '../core/sim/state';
import { objectAt } from '../core/sim/world';
import {
  approachCamera,
  followTarget,
  isLargeMove,
  MANUAL_ZOOM,
  screenToWorld,
  type Camera,
  type Insets,
} from '../render/camera';
import { PlazaRenderer } from '../render/PlazaRenderer';
import { useSimStore } from './simStore';
import { useViewStore } from './store';

/** Najdłuższy krok czasu jednej klatki (s) — po powrocie do karty symulacja nie „przeskakuje”. */
const MAX_FRAME = 0.1;
/** Promień trafienia żołnierza kursorem (m). */
const HIT_RADIUS = 0.42;

/**
 * Pętla animacji placu: stały krok symulacji (SPEC 5.5) z interpolacją, kamera śledząca drużynę
 * i dowódcę (SPEC 3.9), zoom kółkiem myszy, podgląd żołnierza i obiektu po najechaniu.
 */
export class PlazaController {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: PlazaRenderer;
  private frameRequest: number | null = null;
  private lastTime: number | null = null;
  private accumulator = 0;
  private previous: SimState | null = null;
  private camera: Camera;
  private manualZoom: { zoom: number; focus: { x: number; y: number }; size: number } | null = null;
  private hoveredObject: TerrainObjectId | null = null;
  private pointer: { x: number; y: number } | null = null;
  private insets: Insets = { top: 72, right: 24, bottom: 170, left: 24 };
  private framesSinceInsets = 0;
  private lastDataset = '';
  private initialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new PlazaRenderer(canvas);
    this.camera = useViewStore.getState().camera;
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.frameRequest = requestAnimationFrame(this.frame);
  }

  dispose(): void {
    if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.renderer.dispose();
  }

  private readonly frame = (now: number): void => {
    this.frameRequest = requestAnimationFrame(this.frame);
    const dt = this.lastTime === null ? 0 : Math.min(MAX_FRAME, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // Symulacja: stały krok, czas pomnożony przez prędkość (SPEC 3.8).
    const { speed } = useViewStore.getState();
    this.accumulator += dt * speed;
    const store = useSimStore.getState();
    let session = store.session;
    let previous = this.previous ?? session.sim;
    let stepped = false;
    while (this.accumulator >= DT) {
      previous = session.sim;
      session = { ...session, sim: step(session.sim) };
      this.accumulator -= DT;
      stepped = true;
    }
    if (stepped) {
      session = absorbReports(session);
      store.setSession(session);
    }
    this.previous = previous;
    const state = session.sim;

    // Kamera.
    if (this.framesSinceInsets++ % 30 === 0) this.measureInsets();
    const viewport = this.renderer.size;
    const target = followTarget(
      state.soldiers.map((s) => s.position),
      state.commander.position,
      viewport,
      this.insets,
      this.manualZoom?.zoom ?? null,
    );
    if (this.manualZoom && isLargeMove(this.manualZoom, target)) this.manualZoom = null;
    this.camera = this.initialized ? approachCamera(this.camera, target.camera, dt) : target.camera;
    this.initialized = viewport.width > 0;

    const view = useViewStore.getState();
    this.updateHover(state);
    this.renderer.render({
      state,
      previous: this.previous,
      alpha: Math.min(1, this.accumulator / DT),
      camera: this.camera,
      insets: this.insets,
      showRoles: view.showRoles,
      hoveredSoldier: view.hover?.soldierId ?? null,
      hoveredObject: this.hoveredObject,
    });
    this.publish(state);
  };

  /** Zasłonięte przez interfejs części ekranu: pasek stanu u góry, wiersz poleceń u dołu. */
  private measureInsets(): void {
    const height = this.renderer.size.height;
    const dock = document.querySelector('.command-dock')?.getBoundingClientRect();
    const bar = document.querySelector('.status-bar')?.getBoundingClientRect();
    const bottom = dock ? Math.max(120, height - dock.top + 12) : 170;
    const top = bar ? Math.max(56, bar.bottom + 12) : 72;
    const journal = document.querySelector('.journal')?.getBoundingClientRect();
    const right = journal && journal.height > 60 ? Math.max(24, this.renderer.size.width - journal.left + 12) : 24;
    this.insets = { top, right: Math.min(right, this.renderer.size.width * 0.4), bottom: Math.min(bottom, height * 0.5), left: 24 };
  }

  /** Atrybuty płótna dla testów E2E i czytników (stan drużyny i dowódcy, zaokrąglone). */
  private publish(state: SimState): void {
    const status = describeStatus(state);
    const c = state.commander;
    const data = [
      status.formation,
      state.squad.activity ? 'busy' : 'idle',
      `${c.position.x.toFixed(1)},${c.position.y.toFixed(1)},${String(Math.round(c.heading))}`,
      this.camera.pixelsPerMeter.toFixed(0),
    ].join('|');
    if (data === this.lastDataset) return;
    this.lastDataset = data;
    const [formation, activity, commander, zoom] = data.split('|');
    this.canvas.dataset.formation = formation;
    this.canvas.dataset.activity = activity;
    this.canvas.dataset.commander = commander;
    this.canvas.dataset.zoom = zoom;
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const current = this.manualZoom?.zoom ?? this.camera.pixelsPerMeter;
    const zoom = Math.min(MANUAL_ZOOM.max, Math.max(MANUAL_ZOOM.min, current * Math.exp(-event.deltaY * 0.0015)));
    const state = useSimStore.getState().session.sim;
    const target = followTarget(
      state.soldiers.map((s) => s.position),
      state.commander.position,
      this.renderer.size,
      this.insets,
      zoom,
    );
    this.manualZoom = { zoom, focus: target.focus, size: target.size };
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  private readonly onPointerLeave = (): void => {
    this.pointer = null;
  };

  private updateHover(state: SimState): void {
    const view = useViewStore.getState();
    if (!this.pointer) {
      if (view.hover) view.setHover(null);
      this.hoveredObject = null;
      return;
    }
    const world = screenToWorld(this.camera, this.renderer.size, this.pointer);
    let best: { id: number; d: number } | null = null;
    for (const s of state.soldiers) {
      const d = Math.hypot(s.position.x - world.x, s.position.y - world.y);
      if (d <= HIT_RADIUS && (!best || d < best.d)) best = { id: s.id, d };
    }
    const hover = best ? { soldierId: best.id, x: this.pointer.x, y: this.pointer.y } : null;
    if (hover?.soldierId !== view.hover?.soldierId || (hover && (hover.x !== view.hover?.x || hover.y !== view.hover.y))) {
      view.setHover(hover);
    }
    this.hoveredObject = objectAt(world)?.id ?? null;
  }
}
