import { useEffect } from 'react';
import { useCommandStore } from './commandStore';
import { Dialog } from './Dialog';
import { closeDialog } from './dialogs';
import { browserStores, read, STORAGE_KEYS, write } from './persist';
import { useViewStore } from './store';

const FIRST_COMMAND = 'Pierwsza drużyna, w dwuszeregu – ZBIÓRKA';

const stores = browserStores();

function finish(command?: string): void {
  closeDialog();
  if (command) useCommandStore.getState().setDraft(command);
}

/** Wskazówki przy pierwszym uruchomieniu (SPEC 3.10); ponownie — przyciskiem „?” w pasku górnym. */
export function WelcomeOverlay() {
  // Pierwsze uruchomienie na tym urządzeniu: wskazówki pokazane raz (ponownie — przyciskiem „?”).
  useEffect(() => {
    if (read(stores.device, STORAGE_KEYS.firstRunSeen) === 'true') return;
    write(stores.device, STORAGE_KEYS.firstRunSeen, 'true');
    useViewStore.getState().setDialog('welcome');
  }, []);

  return (
    <Dialog
      id="welcome"
      title="Musztra — trzy rzeczy na start"
      className="welcome"
      footer={
        <button
          type="button"
          className="welcome__start"
          data-testid="welcome-start"
          data-autofocus
          onClick={() => {
            finish();
          }}
        >
          Zaczynamy
        </button>
      }
    >
      <ol className="welcome__tips">
        <li className="welcome__tip" data-testid="welcome-tip">
          <span className="welcome__number" aria-hidden="true">
            1
          </span>
          <div>
            <strong>Drużyna rozeszła się po placu.</strong> Wydaj komendę zbiórki, np.{' '}
            <button
              type="button"
              className="welcome__command"
              data-testid="welcome-command"
              title="Wstaw do wiersza poleceń — wyślesz ją klawiszem Enter"
              onClick={() => {
                finish(FIRST_COMMAND);
              }}
            >
              {FIRST_COMMAND}
            </button>
            <span className="welcome__note">Kliknij komendę, a potem naciśnij Enter.</span>
          </div>
        </li>
        <li className="welcome__tip" data-testid="welcome-tip">
          <span className="welcome__number" aria-hidden="true">
            2
          </span>
          <div>
            <kbd>Esc</kbd> — sterujesz dowódcą: <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> (<kbd>Shift</kbd> — bieg,{' '}
            <kbd>Q</kbd>/<kbd>E</kbd> — obrót). <kbd>Enter</kbd> — wracasz do wpisywania komend.
          </div>
        </li>
        <li className="welcome__tip" data-testid="welcome-tip">
          <span className="welcome__number" aria-hidden="true">
            3
          </span>
          <div>
            <kbd>F1</kbd> — ściąga: wszystkie komendy z opisem i punktem regulaminu oraz podstawowe ćwiczenia krok po kroku.
          </div>
        </li>
      </ol>
    </Dialog>
  );
}
