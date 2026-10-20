/**
 * Zapis ustawień w pamięci przeglądarki (SPEC 3.8). Klucz API domyślnie tylko w pamięci sesji
 * (sessionStorage — znika po zamknięciu karty), a na życzenie użytkownika na tym urządzeniu
 * (localStorage, SPEC 8.3). Brak dostępu do pamięci nie przerywa działania aplikacji.
 */

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_KEYS = {
  apiKey: 'musztra.apiKey',
  rememberKey: 'musztra.rememberKey',
  autoExplain: 'musztra.autoExplain',
  squadSize: 'musztra.squadSize',
  firstRunSeen: 'musztra.firstRunSeen',
} as const;

function safe<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}

export function read(store: KeyValueStore | null, key: string): string | null {
  return store ? safe(() => store.getItem(key), null) : null;
}

export function write(store: KeyValueStore | null, key: string, value: string | null): void {
  if (!store) return;
  safe(() => {
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
  }, undefined);
}

export interface KeyStores {
  /** Pamięć urządzenia (localStorage). */
  readonly device: KeyValueStore | null;
  /** Pamięć sesji (sessionStorage). */
  readonly session: KeyValueStore | null;
}

export interface StoredKey {
  readonly apiKey: string;
  readonly remember: boolean;
}

export function loadKey(stores: KeyStores): StoredKey {
  const remember = read(stores.device, STORAGE_KEYS.rememberKey) === 'true';
  const apiKey = (remember ? read(stores.device, STORAGE_KEYS.apiKey) : read(stores.session, STORAGE_KEYS.apiKey)) ?? '';
  return { apiKey, remember };
}

/** Zapis klucza tylko w jednym miejscu: w pamięci urządzenia albo w pamięci sesji. */
export function saveKey(stores: KeyStores, key: StoredKey): void {
  const value = key.apiKey.trim() === '' ? null : key.apiKey.trim();
  write(stores.device, STORAGE_KEYS.rememberKey, key.remember ? 'true' : null);
  write(stores.device, STORAGE_KEYS.apiKey, key.remember ? value : null);
  write(stores.session, STORAGE_KEYS.apiKey, key.remember ? null : value);
}

/** Pamięć przeglądarki albo `null` (np. tryb prywatny z blokadą, testy w Node). */
export function browserStores(): KeyStores {
  return {
    device: safe(() => globalThis.localStorage, null) ?? null,
    session: safe(() => globalThis.sessionStorage, null) ?? null,
  };
}

export const SQUAD_SIZE = { min: 3, max: 12, default: 9 } as const;

export function clampSquadSize(value: unknown): number {
  if (value === null || value === undefined || value === '') return SQUAD_SIZE.default;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return SQUAD_SIZE.default;
  return Math.min(SQUAD_SIZE.max, Math.max(SQUAD_SIZE.min, Math.round(n)));
}
