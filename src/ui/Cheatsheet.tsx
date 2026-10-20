import { useEffect, useState } from 'react';
import { formatPoints } from '../core/catalog';
import { EXERCISES, type Exercise } from '../core/exercises';
import { canonicalForm, cheatsheetGroups } from './cheatsheet';
import { useCommandStore } from './commandStore';
import { focusCommandLine } from './dialogs';
import { PointLinks } from './PointLinks';
import { useViewStore, type CheatsheetTab } from './store';

/** Wstawienie komendy do wiersza poleceń (bez wysyłania) i powrót fokusu do wiersza. */
function insert(command: string): void {
  useCommandStore.getState().setDraft(command);
  focusCommandLine();
}

const keepFocus = (event: { preventDefault: () => void }) => {
  event.preventDefault();
};

function CommandsTab() {
  const [query, setQuery] = useState('');
  const groups = cheatsheetGroups(query);
  return (
    <>
      <input
        className="cheatsheet__search"
        data-testid="cheatsheet-search"
        type="search"
        placeholder="Szukaj: zbiórka, odlicz, pkt 75, M-9…"
        aria-label="Szukaj komendy"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            if (query) setQuery('');
            else {
              useViewStore.getState().setCheatsheet(null);
              focusCommandLine();
            }
          }
        }}
      />
      <div className="cheatsheet__list">
        {groups.length === 0 && <p className="cheatsheet__empty">Brak komend pasujących do „{query}”.</p>}
        {groups.map(({ group, entries }) => (
          <section key={group.id} className="cheatsheet__group" data-testid={`cheatsheet-group-${group.id}`}>
            <h3 className="cheatsheet__group-title">
              {group.id}. {group.name}
            </h3>
            {entries.map((entry) => {
              const form = canonicalForm(entry);
              return (
                <article key={entry.id} className="cheatsheet__entry" data-testid="cheatsheet-entry" data-id={entry.id}>
                  <button
                    type="button"
                    className="cheatsheet__command"
                    data-testid="cheatsheet-insert"
                    title="Wstaw do wiersza poleceń"
                    onMouseDown={keepFocus}
                    onClick={() => {
                      insert(form);
                    }}
                  >
                    {form}
                  </button>
                  <p className="cheatsheet__desc">
                    <span className="cheatsheet__name">
                      {entry.id} {entry.name}
                    </span>{' '}
                    · {entry.description}{' '}
                    <span className="cheatsheet__points">
                      <PointLinks text={formatPoints(entry.points)} />
                    </span>
                  </p>
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}

function ExerciseCard({ exercise, index }: { exercise: Exercise; index: number }) {
  // Następna komenda do wstawienia (po kolei); klik w komendę ustawia postęp za nią.
  const [next, setNext] = useState(0);
  const done = next >= exercise.commands.length;
  return (
    <article className="exercise" data-testid="exercise" data-id={exercise.id}>
      <h3 className="exercise__title">
        {index + 1}. {exercise.title}
      </h3>
      <p className="exercise__goal">{exercise.goal}</p>
      <ol className="exercise__steps">
        {exercise.commands.map((command, i) => (
          <li key={`${String(i)}-${command}`} className={i < next ? 'exercise__step exercise__step--done' : i === next ? 'exercise__step exercise__step--next' : 'exercise__step'}>
            <button
              type="button"
              className="exercise__command"
              data-testid="exercise-command"
              onMouseDown={keepFocus}
              onClick={() => {
                insert(command);
                setNext(i + 1);
              }}
            >
              {command}
            </button>
          </li>
        ))}
      </ol>
      <div className="exercise__actions">
        <button
          type="button"
          className="feedback__use"
          data-testid="exercise-next"
          disabled={done}
          onMouseDown={keepFocus}
          onClick={() => {
            const command = exercise.commands[next];
            if (command === undefined) return;
            insert(command);
            setNext(next + 1);
          }}
        >
          {done ? 'Ukończone ✔' : `Wstaw następną (${String(next + 1)}/${String(exercise.commands.length)})`}
        </button>
        {next > 0 && (
          <button
            type="button"
            className="exercise__restart"
            onMouseDown={keepFocus}
            onClick={() => {
              setNext(0);
            }}
          >
            Od początku
          </button>
        )}
      </div>
    </article>
  );
}

function ExercisesTab() {
  return (
    <div className="cheatsheet__list">
      <p className="cheatsheet__intro">
        Komendy wstawiasz po kolei przyciskiem „Wstaw następną” i wysyłasz klawiszem Enter. W marszu odczekaj kilka kroków przed
        kolejną komendą. Każde ćwiczenie zaczyna się od zbiórki — możesz je robić w dowolnej kolejności.
      </p>
      {EXERCISES.map((exercise, index) => (
        <ExerciseCard key={exercise.id} exercise={exercise} index={index} />
      ))}
    </div>
  );
}

const TABS: readonly { id: CheatsheetTab; label: string }[] = [
  { id: 'commands', label: 'Komendy' },
  { id: 'exercises', label: 'Podstawowe ćwiczenia' },
];

/** F1 (zawsze) i „?” (w trybie Ruch) otwierają i zamykają ściągę (SPEC 3.1). */
function useCheatsheetShortcut(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const view = useViewStore.getState();
      const help = event.key === 'F1' || (event.key === '?' && view.focusMode === 'move' && view.dialog === null);
      if (!help) return;
      event.preventDefault();
      view.setCheatsheet(view.cheatsheet ? null : 'commands');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}

/** Szuflada „Ściąga”: katalog komend z wyszukiwarką i podstawowe ćwiczenia; klik wstawia komendę. */
export function Cheatsheet() {
  useCheatsheetShortcut();
  const tab = useViewStore((s) => s.cheatsheet);
  const setTab = useViewStore((s) => s.setCheatsheet);
  if (tab === null) return null;

  return (
    <aside className="cheatsheet" data-testid="cheatsheet" aria-label="Ściąga" data-tab={tab}>
      <header className="cheatsheet__header">
        <h2 className="cheatsheet__title">Ściąga</h2>
        <span className="cheatsheet__hint">klik wstawia komendę · F1 zamyka</span>
        <button
          type="button"
          className="dialog__close"
          aria-label="Zamknij ściągę"
          data-testid="cheatsheet-close"
          onMouseDown={keepFocus}
          onClick={() => {
            setTab(null);
          }}
        >
          ×
        </button>
      </header>
      <div className="cheatsheet__tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="cheatsheet__tab"
            data-testid={`cheatsheet-tab-${t.id}`}
            onMouseDown={keepFocus}
            onClick={() => {
              setTab(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'commands' ? <CommandsTab /> : <ExercisesTab />}
    </aside>
  );
}
