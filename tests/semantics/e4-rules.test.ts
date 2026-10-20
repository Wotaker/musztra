import { describe, expect, it } from 'vitest';
import { createSession } from '../../src/core/session';
import { continueScript, runScript } from '../../src/core/script';
import { angleDelta } from '../../src/core/sim/geometry';
import { squadMotion } from '../../src/core/sim/march';
import { simulate } from '../../src/core/sim/simulate';
import type { SimState } from '../../src/core/sim/state';
import { codes, scenario, soldier, squadShape, verdict } from '../scenarios/helpers';

// Reguły ruchu etapu E4 (SPEC 9.2: test pozytywny i negatywny każdej reguły).

const RANK = 'Pierwsza drużyna, w szeregu – ZBIÓRKA';
const FILE = 'Pierwsza drużyna, w rzędzie – ZBIÓRKA';
const COLUMN = 'Pierwsza drużyna, w kolumnie dwójkowej – ZBIÓRKA';
const MARCH = 'Drużyna, kierunek na wprost – MARSZ';

const gapsLateral = (state: SimState): number[] => {
  const slots = state.squad.layout?.slots ?? [];
  return slots.slice(1).map((s, i) => s.lateral - (slots[i]?.lateral ?? 0));
};

const gaps = (state: SimState): number[] => {
  const slots = state.squad.layout?.slots ?? [];
  return slots.slice(1).map((s, i) => s.depth - (slots[i]?.depth ?? 0));
};

describe('rozpoczęcie marszu (M-1, I-2, I-3)', () => {
  it('z postawy swobodnej → E_PRECOND_POSTURE; rozproszona → E_PRECOND_FORMATION', () => {
    expect(codes(scenario([RANK, 'SPOCZNIJ', MARCH]), 2)).toContain('E_PRECOND_POSTURE');
    expect(codes(scenario(['Pierwsza drużyna', MARCH]), 1)).toContain('E_PRECOND_FORMATION');
  });
  it('w marszu → E_PRECOND_MOTION (kierunek zmienia M-9)', () => {
    expect(codes(scenario([RANK, MARCH, MARCH]), 2)).toContain('E_PRECOND_MOTION');
  });
  it('szereg na wprost: cały szyk przesuwa się równolegle, odstępy 0,6 m', () => {
    const run = scenario([RANK, MARCH, { wait: 4 }]);
    expect(run.state.squad.march?.kind).toBe('RIGID');
    for (let k = 1; k <= 9; k++) expect(soldier(run.state, k).position.x).toBeCloseTo(-0.6 * k, 6);
    expect(new Set(run.state.soldiers.map((s) => s.position.y.toFixed(6))).size).toBe(1);
  });
  it('I-2: rząd z szeregu (0,6 m) po ruszeniu rozwiera się do 1,2 m i traci flagę odstępów nieregularnych', () => {
    const run = scenario([RANK, 'W prawo – ZWROT', MARCH, { wait: 12 }]);
    expect(gaps(run.state).every((g) => Math.abs(g - 1.2) < 0.05)).toBe(true);
    expect(run.state.squad.irregularSpacing).toBe(false);
  });
  it('I-3: szereg „kierunek w prawo” — uwaga W_DIRECTION_DEPLOYED, po trzech krokach rząd frontem na wschód', () => {
    const run = scenario([RANK, 'Drużyna, kierunek w prawo – MARSZ', { wait: 10 }]);
    expect(codes(run, 1)).toContain('W_DIRECTION_DEPLOYED');
    expect(run.state.squad.formation).toBe('FILE');
    expect(run.state.soldiers.every((s) => Math.abs(angleDelta(s.facing, 90)) < 1)).toBe(true);
  });
  it('I-3: szereg „kierunek w prawo w skos” — każdy idzie w skos (45°), szyk nieregularny; po STÓJ i SPOCZNIJ szereg regularny', () => {
    const run = scenario([RANK, 'Drużyna, kierunek w prawo w skos – MARSZ', { wait: 6 }, 'Drużyna – STÓJ', { wait: 1.5 }]);
    expect(codes(run, 1)).toContain('W_DIRECTION_DEPLOYED');
    expect(run.state.squad.irregularSpacing).toBe(true);
    expect(run.state.soldiers.every((s) => Math.abs(angleDelta(s.facing, 45)) < 1)).toBe(true);
    const eased = continueScript(run.session, ['SPOCZNIJ']);
    expect(eased.violations).toEqual([]);
    expect(eased.state.squad.irregularSpacing).toBe(false);
    expect(gapsLateral(eased.state).every((g) => Math.abs(g - 0.6) < 0.05)).toBe(true);
  });
  it('rząd „kierunek w tył na lewo”: po trzech krokach kolumna zawraca przez lewe ramię', () => {
    const run = scenario([FILE, 'Drużyna, kierunek w tył na lewo – MARSZ', { wait: 15 }]);
    expect(run.state.soldiers.every((s) => Math.abs(angleDelta(s.facing, 180)) < 1)).toBe(true);
    expect(soldier(run.state, 1).position.x).toBeLessThan(0);
  });
});

describe('zatrzymania (M-8, M-10, M-11, I-17)', () => {
  it('STÓJ, gdy drużyna stoi → E_PRECOND_MOTION', () => {
    expect(codes(scenario([RANK, 'Drużyna – STÓJ']), 1)).toContain('E_PRECOND_MOTION');
  });
  it('samo „STÓJ” w marszu: łagodny — wykonane z W_MISSING_ADDRESSEE', () => {
    const run = scenario([FILE, MARCH, { wait: 2 }, 'STÓJ', { wait: 1.5 }]);
    expect(codes(run, 3)).toContain('W_MISSING_ADDRESSEE');
    expect(run.state.squad.march).toBeNull();
  });
  it('„Czoło – STÓJ”: czoło staje, reszta dochodzi na 1,2 m; wszyscy swobodna (I-17)', () => {
    const run = scenario([FILE, MARCH, { wait: 2 }, 'Czoło – STÓJ']);
    expect(run.state.squad.march).toBeNull();
    expect(run.state.squad.formation).toBe('FILE');
    expect(run.state.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
    expect(gaps(run.state).every((g) => Math.abs(g - 1.2) < 0.05)).toBe(true);
  });
  it('„Czoło – STÓJ” w trakcie rozwierania rzędu (I-2): kto stoi bliżej, nie cofa się; szyk oznaczony jako nieregularny', () => {
    const run = scenario([RANK, 'W prawo – ZWROT', MARCH, { wait: 2 }, 'Czoło – STÓJ']);
    expect(run.state.squad.march).toBeNull();
    expect(run.state.squad.irregularSpacing).toBe(true);
    expect(run.state.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
  });
  it('„Czoło – STÓJ” w szyku rozwiniętym w marszu → E_PRECOND_FORMATION', () => {
    expect(codes(scenario([RANK, MARCH, 'Czoło – STÓJ']), 2)).toContain('E_PRECOND_FORMATION');
  });
  it('„Stawaj – W PRAWO” z rzędu: szereg frontem 90° w prawo od kierunku marszu, swobodna', () => {
    const run = scenario([FILE, MARCH, { wait: 6 }, 'Stawaj – W PRAWO']);
    expect(run.state.squad.formation).toBe('SINGLE_RANK');
    expect(run.state.squad.layout?.facing).toBe(90);
    expect(run.state.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
    expect(run.state.squad.layout?.slots.map((s) => s.id)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });
});

describe('kroki i bieg (M-3…M-7, pkt 24–28)', () => {
  it('marsz w miejscu z postoju, potem „Na wprost – MARSZ”', () => {
    const inPlace = scenario([RANK, 'W miejscu – MARSZ', { wait: 2 }]);
    expect(squadMotion(inPlace.state)).toBe('MARCHING_IN_PLACE');
    expect(soldier(inPlace.state, 1).position.y).toBeCloseTo(0, 6);
    expect(soldier(inPlace.state, 1).gait).toBe('MARK');
    const forward = continueScript(inPlace.session, ['Na wprost – MARSZ', { wait: 3 }]);
    expect(squadMotion(forward.state)).toBe('MARCHING');
    expect(soldier(forward.state, 1).position.y).toBeGreaterThan(1);
  });
  it('„W miejscu – MARSZ” w marszu: jeszcze jeden krok, potem w miejscu', () => {
    const run = scenario([FILE, MARCH, { wait: 4 }, 'W miejscu – MARSZ', { wait: 2 }]);
    expect(squadMotion(run.state)).toBe('MARCHING_IN_PLACE');
  });
  it('„Na wprost – MARSZ” w marszu → E_PRECOND_MOTION', () => {
    expect(codes(scenario([FILE, MARCH, 'Na wprost – MARSZ']), 2)).toContain('E_PRECOND_MOTION');
  });
  it('BACZNOŚĆ w marszu → krok defiladowy; „Zwykły – KROK” → E_RULE; SPOCZNIJ → krok zwykły', () => {
    const run = scenario([FILE, MARCH, { wait: 4 }, 'BACZNOŚĆ', { wait: 1 }, 'Zwykły – KROK', 'SPOCZNIJ', { wait: 1 }]);
    expect(run.records[4]?.state.squad.march?.step).toBe('PARADE');
    expect(soldier(run.records[4]?.state ?? run.state, 1).gait).toBe('PARADE');
    expect(codes(run, 5)).toContain('E_RULE');
    expect(run.state.squad.march?.step).toBe('QUICK');
  });
  it('„Dowolny – KROK”, potem „Zwykły – KROK” — powrót do marszu w nogę', () => {
    const run = scenario([FILE, MARCH, { wait: 4 }, 'Dowolny – KROK', { wait: 1 }]);
    expect(run.state.squad.march?.step).toBe('ROUTE');
    expect(soldier(run.state, 1).gait).toBe('ROUTE');
    const back = continueScript(run.session, ['Zwykły – KROK']);
    expect(back.state.squad.march?.step).toBe('QUICK');
  });
  it('„Dowolny – KROK” w biegu → E_PRECOND_MOTION; „Biegiem – MARSZ” w biegu → W_NO_EFFECT', () => {
    const run = scenario([FILE, MARCH, { wait: 4 }, 'Biegiem – MARSZ', { wait: 2 }, 'Dowolny – KROK', 'Biegiem – MARSZ']);
    expect(codes(run, 5)).toContain('E_PRECOND_MOTION');
    expect(codes(run, 6)).toContain('W_NO_EFFECT');
  });
  it('bieg z miejsca: 2,55 m/s', () => {
    const run = scenario([FILE, 'Biegiem – MARSZ', { wait: 4 }]);
    expect(squadMotion(run.state)).toBe('RUNNING');
    expect(soldier(run.state, 1).position.y - -2.1).toBeCloseTo(4 * 2.55, 0);
  });
});

describe('zmiana kierunku w marszu (M-9, I-5)', () => {
  it('stojąc → E_PRECOND_MOTION; w marszu w miejscu → E_PRECOND_MOTION', () => {
    expect(codes(scenario([FILE, 'Kierunek – W PRAWO']), 1)).toContain('E_PRECOND_MOTION');
    expect(codes(scenario([FILE, 'W miejscu – MARSZ', 'Kierunek – W PRAWO']), 2)).toContain('E_PRECOND_MOTION');
  });
  it('„Kierunek – W PRAWO W SKOS” w kolumnie dwójkowej: wszyscy frontem 45°, pary zachowane', () => {
    const run = scenario([COLUMN, MARCH, { wait: 4 }, 'Kierunek – W PRAWO W SKOS', { wait: 15 }]);
    expect(run.state.soldiers.every((s) => Math.abs(angleDelta(s.facing, 45)) < 1)).toBe(true);
    expect(run.violations).toEqual([]);
  });
});

describe('„Za mną” (M-2, I-15)', () => {
  it('w szeregu → E_PRECOND_FORMATION', () => {
    expect(codes(scenario([RANK, 'Za mną – MARSZ']), 1)).toContain('E_PRECOND_FORMATION');
  });
  it('kierunkowy idzie śladem dowódcy 3 kroki za nim; gdy dowódca stanie — marsz w miejscu i W_FOLLOW_HALT', () => {
    const start = runScript([FILE, 'Za mną – MARSZ']);
    // Dowódca idzie 6 s na wschód, potem staje.
    let session = start.session;
    session = { ...session, sim: { ...session.sim, commander: { ...session.sim.commander, input: { x: 1, y: 0, run: false } } } };
    session = { ...session, sim: simulate(session.sim, 6) };
    session = { ...session, sim: { ...session.sim, commander: { ...session.sim.commander, input: { x: 0, y: 0, run: false } } } };
    const run = continueScript(session, [{ wait: 8 }]);
    const commander = run.state.commander.position;
    const guide = soldier(run.state, 1).position;
    // Kierunkowy 3 kroki (2,1 m) za dowódcą po śladzie.
    expect(Math.hypot(commander.x - guide.x, commander.y - guide.y)).toBeLessThan(2.2);
    expect(Math.hypot(commander.x - guide.x, commander.y - guide.y)).toBeGreaterThan(1.9);
    expect(run.state.reports.some((r) => r.code === 'W_FOLLOW_HALT')).toBe(true);
    expect(soldier(run.state, 1).gait).toBe('MARK');
    const halted = continueScript(run.session, ['Drużyna – STÓJ', { wait: 2 }]);
    expect(halted.state.squad.march).toBeNull();
  });
});

describe('zachodzenie (S-4, I-13)', () => {
  it('w czasie zachodzenia inne komendy → E_PRECOND_MOTION, STÓJ zatrzymuje', () => {
    const run = scenario([RANK, 'Drużyna, w lewo zachodź – MARSZ', { wait: 2 }, 'Kierunek – W PRAWO', 'Drużyna – STÓJ']);
    expect(codes(run, 3)).toContain('E_PRECOND_MOTION');
    expect(run.state.squad.march).toBeNull();
    expect(run.state.squad.layout?.facing ?? 0).toBeGreaterThan(300);
  });
  it('I-13: bez limitu kąta — po 30 s obrót ponad 360°, lewoskrzydłowy w miejscu', () => {
    const before = runScript([RANK]).state;
    const run = scenario([RANK, 'Drużyna, w lewo zachodź – MARSZ', { wait: 30 }]);
    const pivot = soldier(before, 9).position;
    expect(soldier(run.state, 9).position.x).toBeCloseTo(pivot.x, 6);
  });
});

describe('zmiany szyku w marszu (MS-1, MS-2) i odliczanie w marszu (I-4)', () => {
  it('odliczanie w marszu w kolumnie dwójkowej → E_PRECOND_FORMATION; w biegu → E_PRECOND_MOTION', () => {
    expect(codes(scenario([COLUMN, MARCH, 'Kolejno – ODLICZ']), 2)).toContain('E_PRECOND_FORMATION');
    expect(codes(scenario([FILE, 'Biegiem – MARSZ', 'Kolejno – ODLICZ']), 2)).toContain('E_PRECOND_MOTION');
  });
  it('odliczanie w rzędzie w marszu: liczby od czoła, tempo bez zmian', () => {
    const run = scenario([FILE, MARCH, { wait: 3 }, 'Do dwóch – ODLICZ']);
    const numbers = run.state.reports.filter((r) => r.kind === 'count');
    expect(numbers.map((r) => r.text)).toEqual(['1', '2', '1', '2', '1', '2', '1', '2', '1']);
    expect(squadMotion(run.state)).toBe('MARCHING');
  });
  it('odliczenie w miejscu nie uprawnia do „W dwójki – W PRZÓD”', () => {
    const run = scenario([RANK, 'Do dwóch – ODLICZ', 'BACZNOŚĆ', 'W prawo – ZWROT', MARCH, 'W dwójki – W PRZÓD']);
    expect(codes(run, 5)).toContain('E_PRECOND_COUNT');
  });
});

describe('WRÓĆ i rozejście w ruchu', () => {
  it('WRÓĆ po ruszeniu: drużyna wraca do postoju sprzed marszu', () => {
    const run = scenario([FILE, MARCH, { wait: 3 }, 'WRÓĆ']);
    const assembled = run.records[0]?.state;
    expect(run.state.squad.march).toBeNull();
    if (assembled) expect(squadShape(run.state)).toEqual(squadShape(assembled));
  });
  it('ROZEJŚĆ SIĘ w marszu: rozproszona, ruch zakończony', () => {
    const run = scenario([FILE, MARCH, { wait: 3 }, 'ROZEJŚĆ SIĘ']);
    expect(verdict(run, 3)).toBe('accepted');
    expect(run.state.squad.march).toBeNull();
    expect(run.state.squad.formation).toBe('DISPERSED');
  });
  it('zbiórka w marszu → E_PRECOND_MOTION', () => {
    expect(codes(scenario([FILE, MARCH, 'W szeregu – ZBIÓRKA']), 2)).toContain('E_PRECOND_MOTION');
  });
});

describe('determinizm marszu', () => {
  it('ten sam skrypt przy różnych klatkach i prędkościach daje ten sam stan', () => {
    const script = [COLUMN, MARCH, { wait: 6 }, 'Kierunek – W LEWO', { wait: 6 }, 'Drużyna – STÓJ', { wait: 2 }] as const;
    const a = runScript([...script]);
    const b = runScript(
      script.map((s) => (typeof s === 'object' ? { wait: s.wait / 2 } : s)),
      { speed: 2, frame: 1 / 37 },
    );
    expect(squadShape(b.state)).toEqual(squadShape(a.state));
    expect(createSession().sim.squad.march).toBeNull();
  });
});

describe('dowódca ustępuje maszerującym (D-040)', () => {
  it('kolumna rusza na wprost na stojącego przed nią dowódcę — dowódca odsuwa się w bok, nie jest „przechodzony”', () => {
    const run = scenario(['Pierwsza drużyna, w rzędzie – ZBIÓRKA', 'Drużyna, kierunek na wprost – MARSZ', { wait: 12 }]);
    const c = run.state.commander.position;
    expect(Math.abs(c.x)).toBeGreaterThan(0.4);
    for (const s of run.state.soldiers) expect(Math.hypot(s.position.x - c.x, s.position.y - c.y)).toBeGreaterThan(0.4);
  });
});

describe('„Drużyna – STÓJ” w trakcie zmiany kierunku kolumny (etap EF, K3, D-055)', () => {
  // Błąd z backlogu: STÓJ podany, gdy część kolumny jest jeszcze przed zakrętem albo na łuku, zatrzymywał
  // kolumnę wygiętą — żołnierze z różnymi frontami (naruszenie niezmienników SPEC 5.4).
  const LEFT = 'Kierunek – W LEWO';

  it.each([
    ['rząd', FILE, 270],
    ['kolumna dwójkowa', COLUMN, 270],
  ])('%s: STÓJ zaraz po skręcie czoła — kolumna kończy zakręt i staje prosto, wszyscy frontem 270°', (_name, assemble, facing) => {
    const run = scenario([assemble, MARCH, { wait: 3 }, LEFT, { wait: 4 }, 'Drużyna – STÓJ', { wait: 15 }]);
    expect(run.state.squad.march).toBeNull();
    for (const s of run.state.soldiers) {
      expect(Math.abs(angleDelta(s.facing, facing)), `nr ${String(s.id)}: front ${s.facing.toFixed(1)}°`).toBeLessThanOrEqual(1);
      expect(s.posture).toBe('ATTENTION');
    }
    expect(run.state.squad.irregularSpacing).toBe(false);
  });

  it('w Dzienniku uwaga, że kolumna zatrzyma się po zakręcie; do tego czasu nadal maszeruje', () => {
    const run = scenario([FILE, MARCH, { wait: 3 }, LEFT, { wait: 4 }, 'Drużyna – STÓJ', { wait: 1 }]);
    expect(run.state.squad.march?.motion).toBe('MARCHING');
    expect(run.session.journal.some((e) => e.kind === 'note' && e.text.includes('zakręt'))).toBe(true);
  });

  it('STÓJ na prostym odcinku po zakręcie — jak dotąd: jeszcze jeden krok i wszyscy stają jednocześnie', () => {
    const run = scenario([FILE, MARCH, { wait: 3 }, LEFT, { wait: 20 }, 'Drużyna – STÓJ', { wait: 1 }]);
    expect(run.state.squad.march).toBeNull();
    expect(run.session.journal.some((e) => e.kind === 'note' && e.text.includes('zakręt'))).toBe(false);
  });

  it('STÓJ przed skrętem czoła (w trakcie trzech kroków) — zakręt nie następuje, kolumna staje frontem 0°', () => {
    const run = scenario([FILE, MARCH, { wait: 3 }, LEFT, { wait: 0.5 }, 'Drużyna – STÓJ', { wait: 3 }]);
    expect(run.state.squad.march).toBeNull();
    for (const s of run.state.soldiers) expect(Math.abs(angleDelta(s.facing, 0))).toBeLessThanOrEqual(1);
  });
});
