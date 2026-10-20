import { entryById, type Stage, type WritingMode } from './catalog';
import { revertTarget } from './interpretations';
import { interpret, worstLevel, type InterpretResult } from './interpreter';
import type { MessageCode } from './messages';
import { execute, revert, snapshotOf, type Snapshot } from './sim/execute';
import { createInitialState, DEFAULT_INITIAL, type InitialOptions } from './sim/initial';
import { simulate } from './sim/simulate';
import { isSimulated } from './sim/stage';
import type { ReportKind, SimState } from './sim/state';

/**
 * Sesja ćwiczeń: stan symulacji, historia migawek dla WRÓĆ i Dziennik (SPEC 3.6).
 * Łączy potok interpretera (kroki 1–4) z wykonaniem (krok 5) i informacją zwrotną (krok 6).
 */

export type JournalEntry =
  | {
      readonly id: number;
      readonly time: number;
      readonly kind: 'command';
      /** Tekst wpisany przez użytkownika. */
      readonly input: string;
      /** Forma kanoniczna rozpoznanej komendy. */
      readonly canonical: string | null;
      readonly level: ReturnType<typeof worstLevel>;
      /** Krótki opis wyniku (np. kod błędu). */
      readonly note: string | null;
    }
  | {
      readonly id: number;
      readonly time: number;
      readonly kind: 'report';
      readonly soldierId: number;
      readonly soldier: string;
      readonly text: string;
      readonly reportKind: ReportKind;
    }
  | {
      readonly id: number;
      readonly time: number;
      readonly kind: 'note';
      /** Uwaga symulacji (np. W_FOLLOW_HALT, W_AWAIT_QUICK_STEP). */
      readonly code: MessageCode | null;
      readonly text: string;
    };

export interface Session {
  readonly sim: SimState;
  /** Migawki sprzed wykonanych komend, od najstarszej (I-12). */
  readonly history: readonly Snapshot[];
  readonly journal: readonly JournalEntry[];
  /** Liczba meldunków z symulacji przeniesionych już do Dziennika. */
  readonly reportsSeen: number;
}

/** Najwięcej pamiętanych migawek WRÓĆ. */
const HISTORY_LIMIT = 200;
/** Najwięcej wpisów w Dzienniku. */
const JOURNAL_LIMIT = 500;

export function createSession(options: InitialOptions = DEFAULT_INITIAL): Session {
  return { sim: createInitialState(options), history: [], journal: [], reportsSeen: 0 };
}

export interface SubmitOutcome {
  readonly session: Session;
  readonly result: InterpretResult;
  /** Komenda zmieniła stan drużyny. */
  readonly executed: boolean;
  /** Komenda poprawna, ale wykonywana na placu dopiero w tym etapie. */
  readonly pendingStage: Stage | null;
}

const nextId = (journal: readonly JournalEntry[]): number => (journal[journal.length - 1]?.id ?? 0) + 1;

function append<T>(list: readonly T[], item: T, limit: number): T[] {
  const next = [...list, item];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

export function submit(session: Session, input: string, mode: WritingMode): SubmitOutcome {
  const { sim, history } = session;
  const result = interpret(input, { mode, squad: sim.squad.name, state: sim, historyLength: history.length });
  let next: Session = session;
  let executed = false;
  let pendingStage: Stage | null = null;

  const command = result.command;
  if (result.verdict === 'accepted' && command && command.id !== 'OUT_OF_SCOPE') {
    const noEffect = result.diagnostics.some((d) => d.code === 'W_NO_EFFECT');
    const stage = entryById(command.id)?.stage ?? null;
    if (command.id === 'X-1') {
      const index = revertTarget(history.length);
      const snapshot = index === null ? undefined : history[index];
      if (index !== null && snapshot) {
        next = { ...next, sim: revert(sim, snapshot), history: history.slice(0, index) };
        executed = true;
      }
    } else if (!isSimulated(stage)) {
      pendingStage = stage;
    } else if (!noEffect) {
      next = { ...next, sim: execute(sim, command), history: append(history, snapshotOf(sim), HISTORY_LIMIT) };
      executed = true;
    }
  }

  const firstProblem = result.diagnostics.find((d) => d.level === 'error' || d.level === 'warning');
  const entry: JournalEntry = {
    id: nextId(next.journal),
    time: sim.time,
    kind: 'command',
    input,
    canonical: result.canonical,
    level: worstLevel(result),
    note: firstProblem ? firstProblem.code : null,
  };
  next = { ...next, journal: append(next.journal, entry, JOURNAL_LIMIT) };
  return { session: next, result, executed, pendingStage };
}

/** Upływ czasu `dt` (już pomnożony przez prędkość); nowe meldunki trafiają do Dziennika. */
export function advance(session: Session, dt: number): Session {
  return absorbReports({ ...session, sim: simulate(session.sim, dt) });
}

/** Przeniesienie nowych meldunków z symulacji do Dziennika. */
export function absorbReports(session: Session): Session {
  const { sim } = session;
  if (sim.reports.length === session.reportsSeen) return session;
  let journal = session.journal;
  for (const report of sim.reports.slice(session.reportsSeen)) {
    if (report.soldierId === null) {
      journal = append(
        journal,
        { id: nextId(journal), time: report.time, kind: 'note', code: report.code ?? null, text: report.text },
        JOURNAL_LIMIT,
      );
      continue;
    }
    const soldier = sim.soldiers.find((s) => s.id === report.soldierId);
    journal = append(
      journal,
      {
        id: nextId(journal),
        time: report.time,
        kind: 'report',
        soldierId: report.soldierId,
        soldier: soldier?.surname.nominative ?? '?',
        text: report.text,
        reportKind: report.kind,
      },
      JOURNAL_LIMIT,
    );
  }
  return { ...session, journal, reportsSeen: sim.reports.length };
}

/** Zmiana stanu symulacji poza komendami (np. sterowanie dowódcą z klawiatury). */
export function withSim(session: Session, update: (sim: SimState) => SimState): Session {
  return { ...session, sim: update(session.sim) };
}
