import { describe, expect, it } from 'vitest';
import { continueScript, runScript } from '../../src/core/script';
import { createSession, submit } from '../../src/core/session';
import { COMMANDS } from '../../src/core/catalog';
import { isSimulated } from '../../src/core/sim/stage';
import { codes, scenario, squadShape, verdict, ASSEMBLE_RANK } from '../scenarios/helpers';

// Reguły warunków wstępnych zależnych od stanu (SPEC 9.2): każda reguła ma test pozytywny i negatywny.

describe('czynność przejściowa (I-11, E_BUSY)', () => {
  it('komenda w trakcie zbiórki → E_BUSY, stan bez zmian', () => {
    const run = runScript([{ command: ASSEMBLE_RANK, settle: false }, { wait: 0.5 }, { command: 'W prawo – ZWROT', settle: false }]);
    expect(codes(run, 2)).toContain('E_BUSY');
    expect(run.state.squad.formation).toBe('SINGLE_RANK');
  });

  it('WRÓĆ w trakcie zbiórki przerywa ją i przywraca stan sprzed zbiórki', () => {
    const run = scenario([{ command: ASSEMBLE_RANK, settle: false }, { wait: 1 }, 'WRÓĆ']);
    expect(verdict(run, 2)).toBe('accepted');
    expect(run.state.squad.formation).toBe('DISPERSED');
    const start = createSession().sim;
    for (const s of run.state.soldiers) {
      const before = start.soldiers.find((x) => x.id === s.id);
      expect(Math.hypot(s.position.x - (before?.position.x ?? 0), s.position.y - (before?.position.y ?? 0))).toBeLessThan(0.01);
    }
  });

  it('po zakończeniu czynności kolejna komenda jest przyjmowana', () => {
    const run = scenario([ASSEMBLE_RANK, 'W prawo – ZWROT']);
    expect(verdict(run, 1)).toBe('accepted');
  });

  it('rozejście nie blokuje: od razu można wezwać drużynę', () => {
    const run = scenario([ASSEMBLE_RANK, { command: 'ROZEJŚĆ SIĘ', settle: false }, { wait: 1 }, 'Pierwsza drużyna']);
    expect(verdict(run, 3)).toBe('accepted');
    expect(run.state.soldiers.every((s) => s.posture === 'ATTENTION')).toBe(true);
  });
});

describe('zbiórka: wezwanie (I-9)', () => {
  it('BACZNOŚĆ pełni rolę wezwania', () => {
    const run = scenario(['BACZNOŚĆ', 'W dwuszeregu – ZBIÓRKA']);
    expect(verdict(run, 1)).toBe('accepted');
    expect(run.state.squad.formation).toBe('DOUBLE_RANK');
  });

  it('po rozejściu wezwanie trzeba powtórzyć', () => {
    const run = scenario([ASSEMBLE_RANK, 'ROZEJŚĆ SIĘ', 'W szeregu – ZBIÓRKA']);
    expect(codes(run, 2)).toContain('E_PRECOND_ATTENTION');
  });

  it('w szyku zbiórka bez adresata jest dozwolona (drużyna jest wezwana)', () => {
    const run = scenario([ASSEMBLE_RANK, 'W rzędzie – ZBIÓRKA']);
    expect(verdict(run, 1)).toBe('accepted');
    expect(run.state.squad.formation).toBe('FILE');
  });
});

describe('zwroty: szyk i postawa', () => {
  it('drużyna rozproszona → E_PRECOND_FORMATION', () => {
    const run = scenario(['W prawo – ZWROT']);
    expect(codes(run, 0)).toContain('E_PRECOND_FORMATION');
  });
  it('rozproszona i wezwana → nadal E_PRECOND_FORMATION', () => {
    const run = scenario(['Pierwsza drużyna', 'W lewo – ZWROT']);
    expect(codes(run, 1)).toContain('E_PRECOND_FORMATION');
  });
  it('po SPOCZNIJ i BACZNOŚĆ zwrot wykonany', () => {
    const run = scenario([ASSEMBLE_RANK, 'SPOCZNIJ', 'BACZNOŚĆ', 'W prawo – ZWROT']);
    expect(verdict(run, 3)).toBe('accepted');
  });
});

describe('postawy', () => {
  it('BACZNOŚĆ w postawie zasadniczej → W_NO_EFFECT, nie trafia do historii WRÓĆ', () => {
    const run = scenario([ASSEMBLE_RANK, 'BACZNOŚĆ']);
    expect(codes(run, 1)).toContain('W_NO_EFFECT');
    expect(run.session.history).toHaveLength(1);
  });
  it('SPOCZNIJ w szyku: postawa swobodna, pozycje bez zmian', () => {
    const run = scenario([ASSEMBLE_RANK, 'SPOCZNIJ']);
    expect(run.state.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
    expect(run.state.squad.activity).toBeNull();
  });
  it('SPOCZNIJ drugi raz → W_NO_EFFECT', () => {
    const run = scenario([ASSEMBLE_RANK, 'SPOCZNIJ', 'SPOCZNIJ']);
    expect(codes(run, 2)).toContain('W_NO_EFFECT');
  });
  it('SPOCZNIJ w rozproszeniu: swobodna, wezwanie zostaje', () => {
    const run = scenario(['Pierwsza drużyna', 'SPOCZNIJ']);
    expect(run.state.squad.attending).toBe(true);
    expect(run.state.soldiers.every((s) => s.posture === 'AT_EASE')).toBe(true);
  });
  it('„Drużyna – BACZNOŚĆ” na rozproszoną drużynę: zwrot do dowódcy, postawa zasadnicza', () => {
    const run = scenario(['Drużyna – BACZNOŚĆ']);
    expect(run.state.squad.attending).toBe(true);
    expect(run.state.soldiers.every((s) => s.posture === 'ATTENTION')).toBe(true);
  });
});

describe('WRÓĆ (I-12)', () => {
  it('na początku sesji → E_PRECOND_STATE', () => {
    const run = scenario(['WRÓĆ']);
    expect(codes(run, 0)).toContain('E_PRECOND_STATE');
  });
  it('kolejne WRÓĆ cofa o kolejną komendę, aż do stanu początkowego', () => {
    const run = scenario([ASSEMBLE_RANK, 'W prawo – ZWROT', 'W lewo – ZWROT', 'WRÓĆ', 'WRÓĆ', 'WRÓĆ', 'WRÓĆ']);
    expect(run.records[3]?.state.squad.formation).toBe('FILE');
    expect(run.records[4]?.state.squad.formation).toBe('SINGLE_RANK');
    expect(run.records[5]?.state.squad.formation).toBe('DISPERSED');
    expect(codes(run, 6)).toContain('E_PRECOND_STATE');
  });
  it('dowódca nie jest cofany', () => {
    const start = createSession();
    const moved = { ...start, sim: { ...start.sim, commander: { ...start.sim.commander, position: { x: 7, y: 3 } } } };
    const run = continueScript(submit(moved, ASSEMBLE_RANK, 'lenient').session, ['WRÓĆ']);
    expect(run.state.commander.position).toEqual({ x: 7, y: 3 });
  });
  it('WRÓĆ przywraca postawę i flagi', () => {
    const run = scenario([ASSEMBLE_RANK, 'SPOCZNIJ', 'WRÓĆ']);
    const afterAssembly = run.records[0]?.state;
    expect(afterAssembly).toBeDefined();
    if (afterAssembly) expect(squadShape(run.state)).toEqual(squadShape(afterAssembly));
  });
});

describe('rozejście (ZB-4)', () => {
  it('żołnierze odchodzą 8–15 m i stoją swobodnie; szyk rozproszony', () => {
    const run = scenario([ASSEMBLE_RANK, 'ROZEJŚĆ SIĘ']);
    const before = run.records[0]?.state;
    expect(run.state.squad.formation).toBe('DISPERSED');
    for (const s of run.state.soldiers) {
      const b = before?.soldiers.find((x) => x.id === s.id);
      const d = Math.hypot(s.position.x - (b?.position.x ?? 0), s.position.y - (b?.position.y ?? 0));
      expect(d).toBeGreaterThanOrEqual(7.99);
      expect(d).toBeLessThanOrEqual(15.01);
      expect(s.posture).toBe('AT_EASE');
    }
  });
  it('„Do koszar, biegiem – ROZEJŚĆ SIĘ”: żołnierze przy przedpolu koszar', () => {
    const run = scenario([ASSEMBLE_RANK, 'Do koszar, biegiem – ROZEJŚĆ SIĘ']);
    for (const s of run.state.soldiers) expect(s.position.y).toBeGreaterThan(40);
  });
  it('rozejście dozwolone przy zwróconych głowach i w każdym szyku', () => {
    const run = scenario(['Pierwsza drużyna, w kolumnie dwójkowej – ZBIÓRKA', 'ROZEJŚĆ SIĘ']);
    expect(verdict(run, 1)).toBe('accepted');
  });
});

describe('etapy wykonania (D-023)', () => {
  // Do E3 ten test sprawdzał, że komenda marszowa nie zmienia stanu (wykonanie dopiero w E4).
  // Od E4 wszystkie komendy MVP są wykonywane — żadna nie czeka na kolejny etap.
  it('od E4 komenda marszowa jest wykonywana (nie czeka na kolejny etap)', () => {
    const before = runScript([ASSEMBLE_RANK]);
    const outcome = submit(before.session, 'Drużyna, kierunek na wprost – MARSZ', 'lenient');
    expect(outcome.result.verdict).toBe('accepted');
    expect(outcome.executed).toBe(true);
    expect(outcome.pendingStage).toBeNull();
    expect(outcome.session.sim.squad.march).not.toBeNull();
  });
  it('każda komenda MVP ma etap wykonania nie późniejszy niż E4', () => {
    expect(COMMANDS.every((entry) => isSimulated(entry.stage))).toBe(true);
    expect(isSimulated(null)).toBe(false);
  });
});
