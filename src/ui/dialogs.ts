import { useViewStore } from './store';

/** Powrót fokusu do wiersza poleceń po zamknięciu okna (SPEC 3.2: tryb Komenda). */
export function focusCommandLine(): void {
  useViewStore.getState().setFocusMode('command');
  document.querySelector<HTMLInputElement>('[data-testid="command-input"]')?.focus();
}

export function closeDialog(): void {
  useViewStore.getState().setDialog(null);
  focusCommandLine();
}
