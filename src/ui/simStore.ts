import { create } from 'zustand';
import type { WritingMode } from '../core/catalog';
import { normalizeAngle } from '../core/sim/geometry';
import type { CommanderInput } from '../core/sim/state';
import { createSession, submit, type Session, type SubmitOutcome } from '../core/session';

/**
 * Sesja ćwiczeń w interfejsie: stan symulacji, historia WRÓĆ, Dziennik. Pętla animacji
 * (`PlazaController`) przesuwa czas symulacji; komponenty Reacta wybierają z niej tylko to, co pokazują.
 */
interface SimStoreState {
  session: Session;
  submit: (text: string, mode: WritingMode) => SubmitOutcome;
  setSession: (session: Session) => void;
  setCommanderInput: (input: CommanderInput) => void;
  /** Obrót dowódcy w miejscu o 45° (Q/E, SPEC 3.2). */
  rotateCommander: (direction: -1 | 1) => void;
  /** Plac od nowa: drużyna rozproszona, z nową liczebnością (ustawienia, SPEC 3.8). */
  reset: (size?: number) => void;
}

/** Ziarno losowości w interfejsie: stały skład i rozproszenie („losuj ponownie” — w backlogu). */
const UI_SEED = 1;

export const useSimStore = create<SimStoreState>()((set, get) => ({
  session: createSession({ size: 9, seed: UI_SEED, squad: 1 }),
  submit: (text, mode) => {
    const outcome = submit(get().session, text, mode);
    set({ session: outcome.session });
    return outcome;
  },
  setSession: (session) => {
    set({ session });
  },
  setCommanderInput: (input) => {
    const { session } = get();
    const current = session.sim.commander.input;
    if (current.x === input.x && current.y === input.y && current.run === input.run) return;
    set({ session: { ...session, sim: { ...session.sim, commander: { ...session.sim.commander, input } } } });
  },
  rotateCommander: (direction) => {
    const { session } = get();
    const commander = session.sim.commander;
    const heading = normalizeAngle(commander.heading + direction * 45);
    set({ session: { ...session, sim: { ...session.sim, commander: { ...commander, heading } } } });
  },
  reset: (size) => {
    const current = get().session.sim.soldiers.length;
    set({ session: createSession({ size: size ?? current, seed: UI_SEED, squad: 1 }) });
  },
}));
