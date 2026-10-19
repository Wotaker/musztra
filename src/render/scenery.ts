import { ROAD, type WorldObject } from '../core/sim/world';
import { visibleBounds, worldToScreen, type Camera, type Viewport } from './camera';
import { PALETTE } from './palette';

/**
 * Sceneria placu (SPEC 3.9): droga i obiekty terenowe jako płaskie ilustracje wektorowe z cieniem.
 * Rysowanie w metrach: kontekst przekształcony tak, że 1 jednostka = 1 m, oś y na północ.
 */

/** Przesunięcie cienia (m): słońce z północnego zachodu. */
const SHADOW = { x: 0.6, y: -0.6 };

function worldTransform(ctx: CanvasRenderingContext2D, camera: Camera, viewport: Viewport, dpr: number): void {
  const origin = worldToScreen(camera, viewport, { x: 0, y: 0 });
  const k = camera.pixelsPerMeter;
  ctx.setTransform(dpr * k, 0, 0, -dpr * k, dpr * origin.x, dpr * origin.y);
}

export function drawRoad(ctx: CanvasRenderingContext2D, camera: Camera, viewport: Viewport, dpr: number): void {
  const bounds = visibleBounds(camera, viewport);
  const half = ROAD.width / 2;
  if (bounds.maxY < ROAD.axisY - half - 1 || bounds.minY > ROAD.axisY + half + 1) return;
  ctx.save();
  worldTransform(ctx, camera, viewport, dpr);
  const x0 = bounds.minX - 2;
  const width = bounds.maxX - bounds.minX + 4;
  ctx.fillStyle = PALETTE.roadEdge;
  ctx.fillRect(x0, ROAD.axisY - half - 0.35, width, ROAD.width + 0.7);
  ctx.fillStyle = PALETTE.road;
  ctx.fillRect(x0, ROAD.axisY - half, width, ROAD.width);
  // Linia środkowa przerywana: 3 m kreski, 3 m przerwy.
  ctx.fillStyle = PALETTE.roadLine;
  const start = Math.floor(x0 / 6) * 6;
  for (let x = start; x < x0 + width; x += 6) ctx.fillRect(x, ROAD.axisY - 0.08, 3, 0.16);
  // Linie krawędziowe.
  ctx.fillRect(x0, ROAD.axisY - half + 0.25, width, 0.1);
  ctx.fillRect(x0, ROAD.axisY + half - 0.35, width, 0.1);
  ctx.restore();
}

/**
 * Układ lokalny obiektu: środek w (0, 0), szerokość wzdłuż x, front po stronie −y. Obrót o 180° − azymut
 * frontu kieruje lokalne −y w stronę frontu (układ świata ma oś y na północ, obrót przeciwnie do zegara).
 */
function objectTransform(ctx: CanvasRenderingContext2D, object: WorldObject): void {
  ctx.translate(object.position.x, object.position.y);
  ctx.rotate(((180 - object.front) * Math.PI) / 180);
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawShadow(ctx: CanvasRenderingContext2D, object: WorldObject): void {
  ctx.save();
  ctx.translate(SHADOW.x * (object.shape === 'mast' ? 0.5 : 1.4), SHADOW.y * (object.shape === 'mast' ? 0.5 : 1.4));
  objectTransform(ctx, object);
  ctx.fillStyle = PALETTE.shadow;
  if (object.shape === 'mast') {
    ctx.beginPath();
    ctx.arc(0, 0, object.width / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    roundedRect(ctx, -object.width / 2, -object.depth / 2, object.width, object.depth, 0.4);
    ctx.fill();
  }
  ctx.restore();
}

function drawMast(ctx: CanvasRenderingContext2D, o: WorldObject, time: number): void {
  const r = o.width / 2;
  ctx.fillStyle = PALETTE.concreteEdge;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.concrete;
  ctx.beginPath();
  ctx.arc(0, 0, r - 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.concreteEdge;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  // Flaga (biało-czerwona) widziana z góry, łagodnie falująca na wietrze.
  const wave = Math.sin(time * 1.8) * 0.08;
  const flag = (y0: number, y1: number) => {
    ctx.beginPath();
    ctx.moveTo(0, y1);
    ctx.quadraticCurveTo(0.95, y1 + wave, 1.9, y1);
    ctx.lineTo(1.9, y0);
    ctx.quadraticCurveTo(0.95, y0 + wave, 0, y0);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(0.1, -0.05);
  // Cień flagi na płycie, potem flaga: biel u góry, czerwień u dołu.
  ctx.save();
  ctx.translate(0.35, -0.35);
  ctx.fillStyle = PALETTE.shadowSoft;
  flag(-0.5, 0.6);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = PALETTE.flagWhite;
  ctx.beginPath();
  ctx.moveTo(0, 0.6);
  ctx.quadraticCurveTo(0.95, 0.6 + wave, 1.9, 0.6);
  ctx.lineTo(1.9, 0.05);
  ctx.quadraticCurveTo(0.95, 0.05 + wave, 0, 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.flagRed;
  ctx.beginPath();
  ctx.moveTo(0, 0.05);
  ctx.quadraticCurveTo(0.95, 0.05 + wave, 1.9, 0.05);
  ctx.lineTo(1.9, -0.5);
  ctx.quadraticCurveTo(0.95, -0.5 + wave, 0, -0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = PALETTE.metal;
  ctx.beginPath();
  ctx.arc(0, 0, 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9ccd0';
  ctx.beginPath();
  ctx.arc(-0.04, 0.04, 0.07, 0, Math.PI * 2);
  ctx.fill();
}

function drawStand(ctx: CanvasRenderingContext2D, o: WorldObject): void {
  const w = o.width;
  const d = o.depth;
  // Stopnie od frontu (dół, −y) ku tyłowi, coraz wyżej — jaśniejsze.
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const y0 = -d / 2 + (i * d) / steps;
    ctx.fillStyle = i % 2 === 0 ? PALETTE.standStep : PALETTE.standStepDark;
    ctx.fillRect(-w / 2, y0, w, d / steps);
    // Rząd siedzisk.
    if (i > 0) {
      ctx.fillStyle = PALETTE.standSeat;
      for (let x = -w / 2 + 0.6; x < w / 2 - 0.4; x += 0.9) ctx.fillRect(x, y0 + 0.25, 0.6, 0.35);
    }
  }
  // Trybuna honorowa pośrodku frontu.
  ctx.fillStyle = PALETTE.roofTile;
  ctx.fillRect(-2.2, -d / 2 - 0.1, 4.4, 1.3);
  ctx.fillStyle = PALETTE.flagWhite;
  ctx.fillRect(-2.2, -d / 2 - 0.1, 4.4, 0.18);
  // Tylna ściana.
  ctx.fillStyle = PALETTE.roofFlatDark;
  ctx.fillRect(-w / 2, d / 2 - 0.5, w, 0.5);
  ctx.strokeStyle = PALETTE.concreteEdge;
  ctx.lineWidth = 0.08;
  ctx.strokeRect(-w / 2, -d / 2, w, d);
}

function drawBarracks(ctx: CanvasRenderingContext2D, o: WorldObject): void {
  const w = o.width;
  const d = o.depth;
  // Dach dwuspadowy: kalenica wzdłuż szerokości, połacie w różnym świetle.
  ctx.fillStyle = PALETTE.roofTile;
  ctx.fillRect(-w / 2, -d / 2, w, d / 2);
  ctx.fillStyle = PALETTE.roofTileDark;
  ctx.fillRect(-w / 2, 0, w, d / 2);
  ctx.strokeStyle = 'rgba(60, 30, 20, 0.22)';
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  for (let y = -d / 2 + 0.6; y < d / 2; y += 0.6) {
    if (Math.abs(y) < 0.2) continue;
    ctx.moveTo(-w / 2, y);
    ctx.lineTo(w / 2, y);
  }
  ctx.stroke();
  ctx.strokeStyle = '#5e3428';
  ctx.lineWidth = 0.2;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(w / 2, 0);
  ctx.stroke();
  // Kominy i wejście od frontu.
  ctx.fillStyle = '#6d6a63';
  for (const x of [-w / 3, 0, w / 3]) ctx.fillRect(x - 0.5, 1.2, 1, 1);
  ctx.fillStyle = PALETTE.roofFlat;
  ctx.fillRect(-3, -d / 2 - 1.4, 6, 1.4);
  ctx.fillStyle = PALETTE.door;
  ctx.fillRect(-1.2, -d / 2 - 1.4, 2.4, 0.25);
  ctx.strokeStyle = '#5e3428';
  ctx.lineWidth = 0.1;
  ctx.strokeRect(-w / 2, -d / 2, w, d);
}

function drawGarages(ctx: CanvasRenderingContext2D, o: WorldObject): void {
  const w = o.width;
  const d = o.depth;
  const boxes = 6;
  for (let i = 0; i < boxes; i++) {
    const x0 = -w / 2 + (i * w) / boxes;
    ctx.fillStyle = i % 2 === 0 ? PALETTE.roofFlat : PALETTE.roofFlatDark;
    ctx.fillRect(x0, -d / 2, w / boxes, d);
    ctx.fillStyle = PALETTE.door;
    ctx.fillRect(x0 + 0.5, -d / 2 - 0.1, w / boxes - 1, 0.35);
  }
  ctx.strokeStyle = 'rgba(40, 40, 36, 0.35)';
  ctx.lineWidth = 0.08;
  ctx.strokeRect(-w / 2, -d / 2, w, d);
}

function drawHangar(ctx: CanvasRenderingContext2D, o: WorldObject): void {
  const w = o.width;
  const d = o.depth;
  // Dach łukowy: cieniowanie wzdłuż szerokości i żebra w poprzek.
  const gradient = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  gradient.addColorStop(0, '#7f878c');
  gradient.addColorStop(0.35, '#b3b9bc');
  gradient.addColorStop(0.6, PALETTE.hangar);
  gradient.addColorStop(1, '#757d82');
  ctx.fillStyle = gradient;
  ctx.fillRect(-w / 2, -d / 2, w, d);
  ctx.strokeStyle = PALETTE.hangarRib;
  ctx.lineWidth = 0.12;
  ctx.beginPath();
  for (let y = -d / 2 + 2; y < d / 2; y += 2) {
    ctx.moveTo(-w / 2, y);
    ctx.lineTo(w / 2, y);
  }
  ctx.stroke();
  // Wrota od frontu.
  ctx.fillStyle = '#5f666a';
  ctx.fillRect(-w / 2 + 3, -d / 2 - 0.2, w - 6, 0.45);
  ctx.strokeStyle = '#60686c';
  ctx.lineWidth = 0.12;
  ctx.strokeRect(-w / 2, -d / 2, w, d);
}

function drawWarehouse(ctx: CanvasRenderingContext2D, o: WorldObject): void {
  const w = o.width;
  const d = o.depth;
  ctx.fillStyle = PALETTE.roofLight;
  ctx.fillRect(-w / 2, -d / 2, w, d);
  ctx.strokeStyle = 'rgba(60, 58, 50, 0.35)';
  ctx.lineWidth = 0.25;
  ctx.strokeRect(-w / 2 + 0.15, -d / 2 + 0.15, w - 0.3, d - 0.3);
  // Świetliki i wywietrzniki.
  ctx.fillStyle = 'rgba(190, 210, 220, 0.75)';
  for (let x = -w / 2 + 2; x < w / 2 - 2; x += 4) ctx.fillRect(x, -1, 2, 2);
  ctx.fillStyle = '#7a776f';
  for (const x of [-w / 2 + 1.5, w / 2 - 2.5]) ctx.fillRect(x, d / 2 - 2.5, 1, 1);
  // Rampa i wrota od frontu.
  ctx.fillStyle = PALETTE.concrete;
  ctx.fillRect(-w / 4, -d / 2 - 1.5, w / 2, 1.5);
  ctx.fillStyle = PALETTE.door;
  ctx.fillRect(-w / 6, -d / 2 - 0.1, w / 3, 0.3);
}

export function drawObjects(
  ctx: CanvasRenderingContext2D,
  objects: readonly WorldObject[],
  camera: Camera,
  viewport: Viewport,
  dpr: number,
  time: number,
): void {
  const bounds = visibleBounds(camera, viewport);
  const visible = objects.filter((o) => {
    const r = Math.max(o.width, o.depth) / 2 + 4;
    return o.position.x + r > bounds.minX && o.position.x - r < bounds.maxX && o.position.y + r > bounds.minY && o.position.y - r < bounds.maxY;
  });
  ctx.save();
  worldTransform(ctx, camera, viewport, dpr);
  for (const o of visible) drawShadow(ctx, o);
  for (const o of visible) {
    ctx.save();
    objectTransform(ctx, o);
    switch (o.shape) {
      case 'mast':
        drawMast(ctx, o, time);
        break;
      case 'stand':
        drawStand(ctx, o);
        break;
      case 'barracks':
        drawBarracks(ctx, o);
        break;
      case 'garages':
        drawGarages(ctx, o);
        break;
      case 'hangar':
        drawHangar(ctx, o);
        break;
      case 'warehouse':
        drawWarehouse(ctx, o);
        break;
    }
    ctx.restore();
  }
  ctx.restore();
}
