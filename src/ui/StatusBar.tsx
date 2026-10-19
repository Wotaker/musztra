import { squadName } from '../core/catalog';
import { describeStatus } from '../core/sim/describe';
import { useSimStore } from './simStore';
import { SPEEDS, useViewStore } from './store';

/** Tekst stanu wybierany z sesji — zmienia się rzadko, więc pasek nie odświeża się co klatkę. */
function useStatusText() {
  return useSimStore((s) => {
    const status = describeStatus(s.session.sim);
    const parts = [status.formation, status.posture, status.motion];
    if (status.facing !== null) parts.push(`front ${String(status.facing)}°`);
    return JSON.stringify({ parts, activity: status.activity, flags: status.flags, name: squadName(s.session.sim.squad.name) });
  });
}

const formatSpeed = (speed: number) => `${String(speed).replace('.', ',')}×`;

/** Pasek górny (SPEC 3.1): stan drużyny, tryb klawiatury, role, prędkość symulacji. */
export function StatusBar() {
  const { parts, activity, flags, name } = JSON.parse(useStatusText()) as {
    parts: string[];
    activity: string | null;
    flags: string[];
    name: string;
  };
  const focusMode = useViewStore((s) => s.focusMode);
  const setFocusMode = useViewStore((s) => s.setFocusMode);
  const speed = useViewStore((s) => s.speed);
  const setSpeed = useViewStore((s) => s.setSpeed);
  const showRoles = useViewStore((s) => s.showRoles);
  const toggleRoles = useViewStore((s) => s.toggleRoles);

  const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1;

  return (
    <header className="status-bar" data-testid="status-bar">
      <div className="status-bar__state" aria-live="polite">
        <span className="status-bar__squad">{name}</span>
        <span className="status-bar__text" data-testid="status-text">
          Stan: {parts.join(' · ')}
        </span>
        {flags.length > 0 && <span className="status-bar__flags">{flags.join(' · ')}</span>}
        {activity && (
          <span className="status-bar__activity" data-testid="status-activity">
            <span className="status-bar__pulse" aria-hidden="true" />
            {activity}
          </span>
        )}
      </div>
      <div className="status-bar__controls">
        <button
          type="button"
          className={`status-chip status-chip--mode status-chip--${focusMode}`}
          data-testid="focus-mode"
          data-mode={focusMode}
          title={
            focusMode === 'command'
              ? 'Tryb Komenda: piszesz komendy. Esc — sterowanie dowódcą.'
              : 'Tryb Ruch: WASD/strzałki — ruch dowódcy, Shift — bieg, Q/E — obrót o 45°. Enter lub / — powrót do komend.'
          }
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            setFocusMode(focusMode === 'command' ? 'move' : 'command');
          }}
        >
          {focusMode === 'command' ? (
            <>
              <span aria-hidden="true">⌨</span> Komenda <kbd>Esc</kbd>
            </>
          ) : (
            <>
              <span aria-hidden="true">✥</span> Ruch: <kbd>WASD</kbd> <kbd>Shift</kbd> <kbd>Q</kbd>/<kbd>E</kbd> · <kbd>Enter</kbd>
            </>
          )}
        </button>
        <button
          type="button"
          className="status-chip"
          aria-pressed={showRoles}
          data-testid="toggle-roles"
          title="Pokaż role: kierunkowy (K), prawoskrzydłowy (P), lewoskrzydłowy (L)"
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={toggleRoles}
        >
          Role
        </button>
        <button
          type="button"
          className="status-chip"
          data-testid="speed"
          title={`Prędkość symulacji — kliknij, by zmienić na ${formatSpeed(nextSpeed)}`}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            setSpeed(nextSpeed);
          }}
        >
          <span aria-hidden="true">⏱</span> {formatSpeed(speed)}
        </button>
      </div>
    </header>
  );
}
