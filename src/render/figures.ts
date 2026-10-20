import type { Gait, Head, Posture } from '../core/sim/state';
import { PALETTE } from './palette';

/**
 * Postacie widziane z góry (SPEC 3.9): owal ramion, głowa w berecie, znacznik frontu, wymach rąk
 * i kroki w marszu (inne dla kroku defiladowego, zwykłego, biegu), postawa swobodna rozróżnialna.
 * Rysowanie w metrach w układzie postaci: przód = −y, prawo = +x.
 */

export interface FigureView {
  readonly x: number;
  readonly y: number;
  readonly facing: number;
  readonly gait: Gait;
  /** Droga przebyta (m) — faza kroku. */
  readonly stride: number;
  readonly posture: Posture;
  readonly head: Head;
  readonly armRaised: boolean;
  readonly highlighted: boolean;
}

/** Długość pełnego cyklu kroku (dwa kroki) w metrach dla danego chodu. */
const CYCLE: Partial<Record<Gait, number>> = { QUICK: 1.4, PARADE: 1.4, RUN: 1.8, SIDESTEP: 0.9, BACKSTEP: 1.2, SHUFFLE: 0.6 };

function phaseOf(gait: Gait, stride: number): number {
  const cycle = CYCLE[gait];
  return cycle ? Math.sin((stride / cycle) * Math.PI * 2) : 0;
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rotation = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
}

/** Szerokość postaci (m) i najmniejsza szerokość na ekranie (px) — przy oddaleniu postacie są powiększane. */
export const FIGURE_WIDTH = 0.53;
const MIN_FIGURE_PX = 15;
const MAX_EXAGGERATION = 1.6;

/** Powiększenie postaci przy małym przybliżeniu, żeby były czytelne (SPEC 3.9). */
export function figureScale(pixelsPerMeter: number): number {
  return Math.min(MAX_EXAGGERATION, Math.max(1, MIN_FIGURE_PX / (FIGURE_WIDTH * pixelsPerMeter)));
}

/** Cień postaci w układzie ekranu (słońce z północnego zachodu), przed obrotem. */
export function drawFigureShadow(ctx: CanvasRenderingContext2D, scale = 1): void {
  ctx.fillStyle = PALETTE.shadowSoft;
  ellipse(ctx, 0.07 * scale, 0.08 * scale, 0.3 * scale, 0.2 * scale);
  ctx.fill();
}

interface Style {
  readonly body: string;
  readonly edge: string;
  readonly arm: string;
  readonly beret: string;
  readonly commander: boolean;
}

function styleOf(view: FigureView, commander: boolean): Style {
  if (commander) {
    return { body: PALETTE.commanderUniform, edge: PALETTE.commanderEdge, arm: '#333c22', beret: PALETTE.beretCommander, commander };
  }
  const atEase = view.posture === 'AT_EASE';
  return {
    body: atEase ? PALETTE.uniformEase : PALETTE.uniform,
    edge: atEase ? PALETTE.uniformEaseEdge : PALETTE.uniformDark,
    arm: atEase ? PALETTE.uniformEase : PALETTE.arm,
    beret: PALETTE.beret,
    commander,
  };
}

/** Postać w układzie lokalnym (kontekst przesunięty i obrócony zgodnie z frontem). */
export function drawFigure(ctx: CanvasRenderingContext2D, view: FigureView, commander = false): void {
  const style = styleOf(view, commander);
  const moving = view.gait !== 'STAND';
  const swing = phaseOf(view.gait, view.stride);
  const parade = view.gait === 'PARADE';
  const running = view.gait === 'RUN';
  const atEase = view.posture === 'AT_EASE' && !moving;

  // Stopy: w ruchu na przemian przed i za ramionami; w kroku defiladowym wyżej (dłuższy wykrok).
  if (moving) {
    const reach = running ? 0.22 : parade ? 0.24 : view.gait === 'SHUFFLE' ? 0.08 : 0.17;
    ctx.fillStyle = PALETTE.boot;
    ellipse(ctx, -0.09, -swing * reach, 0.05, 0.095);
    ctx.fill();
    ellipse(ctx, 0.09, swing * reach, 0.05, 0.095);
    ctx.fill();
  } else if (atEase) {
    // Postawa swobodna: lewa noga wysunięta w lewo w skos (pkt 20).
    ctx.fillStyle = PALETTE.boot;
    ellipse(ctx, -0.17, -0.07, 0.05, 0.09, -0.4);
    ctx.fill();
  }

  // Ręce: w marszu wymach (w biegu ugięte, krótszy łuk), w postawie zasadniczej przy ciele.
  const armReach = running ? 0.1 : parade ? 0.16 : 0.12;
  const armSwing = moving ? swing * armReach : 0;
  const armX = atEase ? 0.2 : 0.215;
  const armBack = atEase ? 0.05 : 0;
  ctx.fillStyle = style.arm;
  ctx.strokeStyle = style.edge;
  ctx.lineWidth = 0.018;
  if (view.armRaised) {
    // Lewa ręka uniesiona do poziomu z dłonią w płaszczyźnie pionowej (pkt 73).
    ctx.fillStyle = PALETTE.armRaised;
    ctx.beginPath();
    ctx.roundRect(-0.7, -0.05, 0.5, 0.1, 0.05);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.skin;
    ellipse(ctx, -0.76, 0, 0.05, 0.035);
    ctx.fill();
  } else {
    ellipse(ctx, -armX, armSwing + armBack, 0.052, 0.12);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = style.arm;
  ellipse(ctx, armX, -armSwing + armBack, 0.052, 0.12);
  ctx.fill();
  ctx.stroke();

  // Tułów (owal ramion).
  ctx.fillStyle = style.body;
  ctx.strokeStyle = style.edge;
  ctx.lineWidth = atEase ? 0.03 : 0.035;
  ellipse(ctx, 0, 0, 0.225, 0.135);
  ctx.fill();
  ctx.stroke();

  // Znacznik frontu: jasna strzałka na piersi.
  ctx.fillStyle = PALETTE.frontMarker;
  ctx.beginPath();
  ctx.moveTo(0, -0.205);
  ctx.lineTo(0.07, -0.125);
  ctx.lineTo(-0.07, -0.125);
  ctx.closePath();
  ctx.fill();

  if (style.commander) {
    // Dystynkcje na naramiennikach.
    ctx.fillStyle = PALETTE.epaulette;
    for (const x of [-0.15, 0.15]) {
      ctx.beginPath();
      ctx.roundRect(x - 0.045, -0.035, 0.09, 0.07, 0.015);
      ctx.fill();
    }
  }

  // Głowa: twarz z przodu, beret ściągnięty na prawą stronę, oznaka nad lewym okiem.
  ctx.save();
  if (view.head !== 'FRONT') ctx.rotate(((view.head === 'RIGHT' ? 60 : -60) * Math.PI) / 180);
  ctx.fillStyle = PALETTE.skin;
  ellipse(ctx, 0, -0.025, 0.095, 0.105);
  ctx.fill();
  ctx.fillStyle = style.beret;
  ellipse(ctx, 0.018, 0.01, 0.11, 0.1);
  ctx.fill();
  ctx.fillStyle = PALETTE.badge;
  ellipse(ctx, -0.045, -0.06, 0.022, 0.018);
  ctx.fill();
  ctx.restore();

  if (view.armRaised) {
    ctx.strokeStyle = PALETTE.gestureRing;
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.arc(-0.76, 0, 0.12, 0, Math.PI * 2);
    ctx.stroke();
  }
}
