import { FACING_TOLERANCE, INTERVAL, POSITION_TOLERANCE, STEP } from './constants';
import { FORMATION_NAMES } from './describe';
import { filesOf, fileGapsOf, hasRegulationSpacing, isDeployed, layoutFromPositions, ranksOf, slotPosition } from './formation';
import { angleDelta, distance } from './geometry';
import { followersConverged } from './march';
import type { SimState } from './state';

/**
 * Niezmienniki szyku (SPEC 5.4) sprawdzane w testach po każdej komendzie, gdy drużyna zakończyła
 * czynności przejściowe. Zwraca listę naruszeń (pusta — wszystko w porządku).
 *
 * Żołnierz bez pary (nieparzyste N) stoi na skrajnym miejscu szyku: w dwuszeregu na skrzydle, w kolumnie
 * dwójkowej na końcu — a po zwrocie w tył lub w nieregulaminową stronę (pkt 76) na przeciwnym skraju
 * (DECISIONS.md, D-026).
 */
export function checkInvariants(state: SimState): string[] {
  const { squad, soldiers } = state;
  const layout = squad.layout;
  if (squad.formation === 'DISPERSED') return layout ? ['Drużyna rozproszona nie powinna mieć układu szyku.'] : [];
  if (!layout) return ['Drużyna w szyku bez układu.'];
  const problems: string[] = [];
  const name = FORMATION_NAMES[squad.formation];

  // W marszu (SPEC 5.4): kolumna sprawdzana, gdy idzie prosto i każdy jest na swoim miejscu; w trakcie
  // zmiany kierunku, rozwierania lub zmiany szyku — tylko gdy ruch się ustali.
  const march = squad.march;
  if (march?.kind === 'TRAIL') {
    const head = march.trail[march.trail.length - 1]?.s ?? 0;
    const straight = soldiers.every((s) => Math.abs(angleDelta(s.facing, layout.facing)) <= FACING_TOLERANCE);
    if (!straight || !followersConverged(march, head)) return [];
  }

  // Ten sam front.
  for (const s of soldiers) {
    if (Math.abs(angleDelta(s.facing, layout.facing)) > FACING_TOLERANCE) {
      problems.push(`${s.surname.nominative}: front ${s.facing.toFixed(1)}°, szyk ${layout.facing.toFixed(1)}°.`);
    }
  }

  // Pozycje na liniach szyku.
  for (const slot of layout.slots) {
    const soldier = soldiers.find((s) => s.id === slot.id);
    if (!soldier) {
      problems.push(`Miejsce w szyku dla nieistniejącego żołnierza nr ${String(slot.id)}.`);
      continue;
    }
    const d = distance(soldier.position, slotPosition(layout, slot));
    if (d > POSITION_TOLERANCE) problems.push(`${soldier.surname.nominative}: ${d.toFixed(2)} m od swojego miejsca w szyku.`);
  }
  if (layout.slots.length !== soldiers.length) problems.push('Liczba miejsc w szyku różni się od liczby żołnierzy.');

  // Kolejność od prawego skrzydła (czoła) zgodna ze stanem.
  const actual = layoutFromPositions(new Map(soldiers.map((s) => [s.id, s.position])), layout.facing);
  const expectedOrder = layout.slots.map((s) => s.id).join(',');
  const actualOrder = actual.slots.map((s) => s.id).join(',');
  if (expectedOrder !== actualOrder) problems.push(`Kolejność w szyku ${actualOrder} zamiast ${expectedOrder}.`);

  // Struktura szyku.
  const ranks = ranksOf(actual);
  const files = filesOf(actual);
  const formation = squad.formation;
  if (formation === 'SINGLE_RANK' && ranks.length !== 1) problems.push(`${name}: ${String(ranks.length)} szeregi zamiast jednego.`);
  if (formation === 'DOUBLE_RANK' && ranks.length !== 2) problems.push(`${name}: ${String(ranks.length)} szeregi zamiast dwóch.`);
  if (formation === 'FILE' && files.length !== 1) problems.push(`${name}: ${String(files.length)} rzędy zamiast jednego.`);
  if (formation === 'COLUMN_OF_TWOS' && files.length !== 2) problems.push(`${name}: ${String(files.length)} rzędy zamiast dwóch.`);

  // Odstępy i odległości.
  if (!squad.irregularSpacing) {
    if (squad.extension && isDeployed(formation)) {
      const extended = INTERVAL + squad.extension.steps * STEP;
      const gaps = fileGapsOf(actual);
      if (!gaps.every((g) => Math.abs(g - INTERVAL) <= POSITION_TOLERANCE || Math.abs(g - extended) <= POSITION_TOLERANCE)) {
        problems.push(`Odstępy po odstępowaniu ${gaps.join(', ')} m; oczekiwano ${INTERVAL.toFixed(1)} lub ${extended.toFixed(1)} m.`);
      }
    } else if (!hasRegulationSpacing(formation, actual)) {
      problems.push(`${name}: odstępy lub odległości nieregulaminowe, a szyk nie jest oznaczony jako nieregularny.`);
    }
  }

  // Krycie i żołnierz bez pary.
  if (formation === 'DOUBLE_RANK' || formation === 'COLUMN_OF_TWOS') {
    const groups = formation === 'DOUBLE_RANK' ? files : ranks;
    if (groups.some((g) => g.length > 2)) problems.push(`${name}: więcej niż dwóch żołnierzy w jednej linii krycia.`);
    const single = groups.map((g, i) => ({ g, i })).filter(({ g }) => g.length === 1);
    if (single.length > 1) problems.push(`${name}: ${String(single.length)} żołnierzy bez pary.`);
    const lone = single[0];
    if (lone && lone.i !== 0 && lone.i !== groups.length - 1) {
      problems.push(`${name}: żołnierz bez pary nie stoi na skraju szyku.`);
    }
  }
  return problems;
}
