import { create } from 'zustand';
import { browserStores, clampSquadSize, loadKey, read, saveKey, STORAGE_KEYS, write } from './persist';
import { useSimStore } from './simStore';

/**
 * Ustawienia (SPEC 3.8, zakres etapu EF): klucz API, auto-objaśnianie, liczebność drużyny.
 * Tryb zapisu należy do `commandStore` (wiersz poleceń), a w panelu ustawień jest tylko jego przełącznik.
 */
interface SettingsState {
  apiKey: string;
  /** „Zapamiętaj na tym urządzeniu” (SPEC 8.3). */
  rememberKey: boolean;
  autoExplain: boolean;
  squadSize: number;
  setApiKey: (apiKey: string) => void;
  setRememberKey: (remember: boolean) => void;
  setAutoExplain: (autoExplain: boolean) => void;
  /** Nowa liczebność ustawia drużynę od nowa (rozproszona po placu). */
  setSquadSize: (size: number) => void;
}

const stores = browserStores();
const initialKey = loadKey(stores);
const initialSize = clampSquadSize(read(stores.device, STORAGE_KEYS.squadSize));
if (initialSize !== useSimStore.getState().session.sim.soldiers.length) useSimStore.getState().reset(initialSize);

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  apiKey: initialKey.apiKey,
  rememberKey: initialKey.remember,
  autoExplain: read(stores.device, STORAGE_KEYS.autoExplain) === 'true',
  squadSize: initialSize,
  setApiKey: (apiKey) => {
    saveKey(stores, { apiKey, remember: get().rememberKey });
    set({ apiKey });
  },
  setRememberKey: (rememberKey) => {
    saveKey(stores, { apiKey: get().apiKey, remember: rememberKey });
    set({ rememberKey });
  },
  setAutoExplain: (autoExplain) => {
    write(stores.device, STORAGE_KEYS.autoExplain, autoExplain ? 'true' : null);
    set({ autoExplain });
  },
  setSquadSize: (size) => {
    const squadSize = clampSquadSize(size);
    write(stores.device, STORAGE_KEYS.squadSize, String(squadSize));
    set({ squadSize });
    useSimStore.getState().reset(squadSize);
  },
}));

/** Klucz API jest wpisany (sama obecność — poprawność sprawdza dopiero API). */
export const hasApiKey = (state: Pick<SettingsState, 'apiKey'>) => state.apiKey.trim() !== '';
