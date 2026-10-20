import { describe, expect, it } from 'vitest';
import { countNumberFor } from '../../src/core/sim/executePlace';
import { fileGapsOf } from '../../src/core/sim/formation';
import { ASSEMBLE_RANK, codes, expectAt, scenario, soldier, verdict } from '../scenarios/helpers';

// Reguły i skutki komend etapu E3 poza scenariuszami akceptacyjnymi (SPEC 9.2: test pozytywny i negatywny).

// Skład z ziarnem 1: nr 1 Wieczorek, 2 Nowak, 3 Krawczyk, 4 Baran, 5 Sikora, 6 Zieliński, 7 Król, 8 Kalinowski, 9 Woźniak.

describe('odliczanie (R-2, I-4)', () => {
  it('numeracja „do n”: ((i−1) mod n)+1, kolejno: i', () => {
    expect([0, 1, 2, 3, 4].map((i) => countNumberFor(i, 3))).toEqual([1, 2, 3, 1, 2]);
    expect([0, 1, 2].map((i) => countNumberFor(i, null))).toEqual([1, 2, 3]);
  });
  it('w rzędzie → E_PRECOND_FORMATION (w miejscu tylko szyk rozwinięty)', () => {
    const run = scenario(['Pierwsza drużyna, w rzędzie – ZBIÓRKA', 'Kolejno – ODLICZ']);
    expect(codes(run, 1)).toContain('E_PRECOND_FORMATION');
  });
  it('w rozproszeniu → E_PRECOND_FORMATION', () => {
    expect(codes(scenario(['Pierwsza drużyna', 'Kolejno – ODLICZ']), 1)).toContain('E_PRECOND_FORMATION');
  });
  it('w trakcie odliczania → E_BUSY', () => {
    const run = scenario([ASSEMBLE_RANK, { command: 'Kolejno – ODLICZ', settle: false }, { wait: 1 }, { command: 'BACZNOŚĆ', settle: false }]);
    expect(codes(run, 3)).toContain('E_BUSY');
  });
  it('„Do trzech – ODLICZ” w szeregu: 1,2,3,1,2,3,…', () => {
    const run = scenario([ASSEMBLE_RANK, 'Do trzech – ODLICZ']);
    expect(run.state.soldiers.map((s) => s.countNumber)).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3]);
  });
  it('zbiórka i zwrot unieważniają odliczenie', () => {
    expect(scenario([ASSEMBLE_RANK, 'Do dwóch – ODLICZ', ASSEMBLE_RANK]).state.squad.countMode).toBeNull();
    const turned = scenario([ASSEMBLE_RANK, 'Do dwóch – ODLICZ', 'BACZNOŚĆ', 'W tył – ZWROT', 'W tył – ZWROT', 'W dwójki, w prawo – ZWROT']);
    expect(codes(turned, 5)).toContain('E_PRECOND_COUNT');
  });
  it('WRÓĆ po odliczaniu przywraca stan sprzed odliczenia', () => {
    const run = scenario([ASSEMBLE_RANK, 'Do dwóch – ODLICZ', 'WRÓĆ']);
    expect(run.state.squad.countMode).toBeNull();
    expect(run.state.soldiers.every((s) => s.countNumber === null && s.posture === 'ATTENTION')).toBe(true);
  });
  it('odliczenie zostaje po dwójkach i powrocie do szeregu — można powtórzyć dwójki', () => {
    const run = scenario([ASSEMBLE_RANK, 'Do dwóch – ODLICZ', 'BACZNOŚĆ', 'W dwójki, w prawo – ZWROT', 'W szereg, w lewo – FRONT', 'W dwójki, w prawo – ZWROT']);
    expect(verdict(run, 5)).toBe('accepted');
    expect(run.state.squad.formation).toBe('COLUMN_OF_TWOS');
  });
});

describe('równanie (R-1, pkt 71)', () => {
  it('„Równaj – W LEWO”: wszyscy oprócz lewoskrzydłowego zwracają głowy w lewo, pozycje względem niego', () => {
    const run = scenario(['Pierwsza drużyna, w rzędzie – ZBIÓRKA', 'W lewo – ZWROT', 'Równaj – W LEWO']);
    const { state } = run;
    expect(state.squad.irregularSpacing).toBe(false);
    expect(state.soldiers.filter((s) => s.head === 'FRONT').map((s) => s.id)).toEqual([9]);
    // Lewoskrzydłowy (nr 9) zostaje; reszta dosuwa się do niego co 0,6 m.
    const left = run.records[1]?.state ? soldier(run.records[1].state, 9).position : { x: 0, y: 0 };
    expectAt(state, 9, left.x, left.y);
    expectAt(state, 1, left.x, left.y + 8 * 0.6);
  });
  it('w postawie swobodnej → E_PRECOND_POSTURE', () => {
    expect(codes(scenario([ASSEMBLE_RANK, 'SPOCZNIJ', 'Równaj – W PRAWO']), 2)).toContain('E_PRECOND_POSTURE');
  });
  it('przy zwróconych głowach SPOCZNIJ → E_PRECOND_STATE, ROZEJŚĆ SIĘ i WRÓĆ dozwolone', () => {
    const run = scenario([ASSEMBLE_RANK, 'Równaj – W PRAWO', 'SPOCZNIJ', 'WRÓĆ']);
    expect(codes(run, 2)).toContain('E_PRECOND_STATE');
    expect(verdict(run, 3)).toBe('accepted');
    expect(run.state.squad.headsTurned).toBeNull();
    expect(verdict(scenario([ASSEMBLE_RANK, 'Równaj – W PRAWO', 'ROZEJŚĆ SIĘ']), 2)).toBe('accepted');
  });
});

describe('dwójki (S-1, S-2)', () => {
  it('S-2 z kolumny utworzonej z dwuszeregu → E_PRECOND_FORMATION z podpowiedzią „W lewo – ZWROT”', () => {
    const run = scenario(['Pierwsza drużyna, w dwuszeregu – ZBIÓRKA', 'W prawo – ZWROT', 'W szereg, w lewo – FRONT']);
    expect(codes(run, 2)).toContain('E_PRECOND_FORMATION');
    expect(run.records[2]?.result?.diagnostics[0]?.message).toMatch(/W lewo – ZWROT/);
  });
  it('S-1 w postawie swobodnej (po odliczeniu) → E_PRECOND_POSTURE', () => {
    expect(codes(scenario([ASSEMBLE_RANK, 'Do dwóch – ODLICZ', 'W dwójki, w prawo – ZWROT']), 2)).toContain('E_PRECOND_POSTURE');
  });
  it('S-1 po odliczeniu „kolejno” → E_PRECOND_COUNT', () => {
    expect(codes(scenario([ASSEMBLE_RANK, 'Kolejno – ODLICZ', 'BACZNOŚĆ', 'W dwójki, w prawo – ZWROT']), 3)).toContain('E_PRECOND_COUNT');
  });
  it('N parzyste: kolumna pełna, powrót do szeregu bez przesunięcia samotnego', () => {
    const run = scenario([ASSEMBLE_RANK, 'Do dwóch – ODLICZ', 'BACZNOŚĆ', 'W dwójki, w prawo – ZWROT', 'W szereg, w lewo – FRONT'], {
      initial: { size: 8, seed: 4, squad: 1 },
    });
    expect(run.state.squad.formation).toBe('SINGLE_RANK');
    expect(run.state.squad.layout?.slots.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('przesunięcie (S-3, pkt 74)', () => {
  it('„sześć kroków na wprost”: szyk 4,2 m dalej, zasadnicza', () => {
    const run = scenario([ASSEMBLE_RANK, 'Drużyna, sześć kroków na wprost – MARSZ']);
    for (let k = 1; k <= 9; k++) expectAt(run.state, k, -0.6 * k, 4.2);
    expect(run.state.soldiers.every((s) => s.posture === 'ATTENTION')).toBe(true);
  });
  it('w kolumnie dwójkowej: krok na wprost w kierunku frontu', () => {
    const run = scenario(['Pierwsza drużyna, w kolumnie dwójkowej – ZBIÓRKA', 'Drużyna, krok na wprost – MARSZ']);
    expectAt(run.state, 1, 0, -2.1 + 0.7);
  });
  it('w postawie swobodnej → E_PRECOND_POSTURE; rozproszona → E_PRECOND_FORMATION', () => {
    expect(codes(scenario([ASSEMBLE_RANK, 'SPOCZNIJ', 'Drużyna, krok na wprost – MARSZ']), 2)).toContain('E_PRECOND_POSTURE');
    expect(codes(scenario(['Drużyna, krok na wprost – MARSZ']), 0)).toContain('E_PRECOND_FORMATION');
  });
  it('„Drużyna, na wprost – MARSZ” (bez liczby kroków) to M-4 — marsz, etap E4', () => {
    const run = scenario([ASSEMBLE_RANK, 'Drużyna, na wprost – MARSZ']);
    expect(run.records[1]?.result?.command?.id).toBe('M-4');
  });
});

describe('odstępowanie i łączenie (O-1, O-2, pkt 73)', () => {
  it('od wskazanego żołnierza w obie strony: „Jestem”, uniesiona ręka, odstępy 1,3 m', () => {
    const run = scenario([ASSEMBLE_RANK, { command: 'Od szeregowego Barana, krok – ODSTĄP', settle: false }, { wait: 0.3 }]);
    const mid = run.state;
    expect(soldier(mid, 4).bubble?.text).toBe('Jestem');
    expect(soldier(mid, 4).armRaisedUntil).not.toBeNull();
    const done = scenario([ASSEMBLE_RANK, 'Od szeregowego Barana, krok – ODSTĄP']);
    const gaps = fileGapsOf(done.state.squad.layout ?? { facing: 0, origin: { x: 0, y: 0 }, slots: [] });
    expect(gaps.every((g) => Math.abs(g - 1.3) < 0.01)).toBe(true);
    expectAt(done.state, 4, -2.4, 0);
    expect(done.state.reports.filter((r) => r.kind === 'present').map((r) => r.soldierId)).toEqual([4]);
  });
  it('w jedną stronę: „w lewo” — odstępują tylko żołnierze na lewo od wskazanego', () => {
    const run = scenario([ASSEMBLE_RANK, 'Od szeregowego Barana, w lewo, dwa kroki – ODSTĄP']);
    for (let k = 1; k <= 4; k++) expectAt(run.state, k, -0.6 * k, 0);
    for (let k = 5; k <= 9; k++) expectAt(run.state, k, -2.4 - 2.0 * (k - 4), 0);
  });
  it('w dwuszeregu kryjący żołnierz drugiego szeregu też unosi rękę i przesuwa się z poprzednikiem', () => {
    const mid = scenario(['Pierwsza drużyna, w dwuszeregu – ZBIÓRKA', { command: 'Od szeregowego Krawczyka, krok – ODSTĄP', settle: false }, { wait: 0.3 }]);
    expect(soldier(mid.state, 8).armRaisedUntil).not.toBeNull();
    const run = scenario(['Pierwsza drużyna, w dwuszeregu – ZBIÓRKA', 'Od lewoskrzydłowego, krok – ODSTĄP']);
    for (let k = 1; k <= 5; k++) expectAt(run.state, k, -3.0 + 1.3 * (5 - k), 0);
    for (let k = 6; k <= 9; k++) expectAt(run.state, k, -3.0 + 1.3 * (10 - k), -1.2);
  });
  it('żołnierz drugiego szeregu → E_PRECOND_STATE', () => {
    expect(codes(scenario(['Pierwsza drużyna, w dwuszeregu – ZBIÓRKA', 'Od szeregowego Zielińskiego, krok – ODSTĄP']), 1)).toContain('E_PRECOND_STATE');
  });
  it('drugie odstępowanie bez łączenia → E_PRECOND_STATE („najpierw ŁĄCZ”)', () => {
    const run = scenario([ASSEMBLE_RANK, 'Od prawoskrzydłowego, krok – ODSTĄP', 'BACZNOŚĆ', 'Od prawoskrzydłowego, krok – ODSTĄP']);
    expect(codes(run, 3)).toContain('E_PRECOND_STATE');
  });
  it('w kolumnie → E_PRECOND_FORMATION', () => {
    expect(codes(scenario(['Pierwsza drużyna, w rzędzie – ZBIÓRKA', 'Od prawoskrzydłowego, krok – ODSTĄP']), 1)).toContain('E_PRECOND_FORMATION');
  });
  it('biegiem: szybciej niż marszem', () => {
    const walk = scenario([ASSEMBLE_RANK, 'Od prawoskrzydłowego, pięć kroków – ODSTĄP']);
    const run = scenario([ASSEMBLE_RANK, 'Od prawoskrzydłowego, pięć kroków, biegiem – ODSTĄP']);
    expect(run.state.time).toBeLessThan(walk.state.time);
    expect(soldier(run.state, 9).position.x).toBeCloseTo(walk.state.soldiers[8]?.position.x ?? 0, 6);
  });
  it('ŁĄCZ do wskazanego żołnierza: on zostaje, reszta wraca do odstępów 0,6 m', () => {
    const run = scenario([ASSEMBLE_RANK, 'Od szeregowego Barana, krok – ODSTĄP', 'BACZNOŚĆ', 'Do szeregowego Barana – ŁĄCZ']);
    expectAt(run.state, 4, -2.4, 0);
    for (let k = 1; k <= 9; k++) expectAt(run.state, k, -0.6 * k, 0);
  });
  it('ŁĄCZ w postawie swobodnej (zaraz po odstępowaniu) → E_PRECOND_POSTURE', () => {
    expect(codes(scenario([ASSEMBLE_RANK, 'Od prawoskrzydłowego, krok – ODSTĄP', 'Do prawoskrzydłowego – ŁĄCZ']), 2)).toContain('E_PRECOND_POSTURE');
  });
  it('SPOCZNIJ po odstępowaniu zachowuje odstępy', () => {
    const run = scenario([ASSEMBLE_RANK, 'Od prawoskrzydłowego, krok – ODSTĄP', 'BACZNOŚĆ', 'SPOCZNIJ']);
    expectAt(run.state, 9, -0.6 - 8 * 1.3, 0);
  });
});
