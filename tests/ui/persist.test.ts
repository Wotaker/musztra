import { describe, expect, it } from 'vitest';
import { clampSquadSize, loadKey, saveKey, STORAGE_KEYS, type KeyStores, type KeyValueStore } from '../../src/ui/persist';
import { FAKE_API_KEY } from '../../e2e/support/anthropicMock';

// Klucz API (SPEC 8.3): domyślnie tylko w pamięci sesji; „zapamiętaj na tym urządzeniu” — localStorage.

class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

class BrokenStore implements KeyValueStore {
  getItem(): string | null {
    throw new Error('SecurityError');
  }
  setItem(): void {
    throw new Error('QuotaExceededError');
  }
  removeItem(): void {
    throw new Error('SecurityError');
  }
}

function stores() {
  const device = new MemoryStore();
  const session = new MemoryStore();
  return { device, session, all: { device, session } satisfies KeyStores };
}

describe('przechowywanie klucza API', () => {
  it('domyślnie klucz trafia tylko do pamięci sesji', () => {
    const { device, session, all } = stores();
    saveKey(all, { apiKey: FAKE_API_KEY, remember: false });
    expect(session.getItem(STORAGE_KEYS.apiKey)).toBe(FAKE_API_KEY);
    expect(device.getItem(STORAGE_KEYS.apiKey)).toBeNull();
    expect(loadKey(all)).toEqual({ apiKey: FAKE_API_KEY, remember: false });
  });

  it('„zapamiętaj na tym urządzeniu” przenosi klucz do pamięci urządzenia i usuwa z sesji', () => {
    const { device, session, all } = stores();
    saveKey(all, { apiKey: FAKE_API_KEY, remember: false });
    saveKey(all, { apiKey: FAKE_API_KEY, remember: true });
    expect(device.getItem(STORAGE_KEYS.apiKey)).toBe(FAKE_API_KEY);
    expect(session.getItem(STORAGE_KEYS.apiKey)).toBeNull();
    expect(loadKey(all)).toEqual({ apiKey: FAKE_API_KEY, remember: true });
  });

  it('wyłączenie zapamiętywania usuwa klucz z pamięci urządzenia', () => {
    const { device, session, all } = stores();
    saveKey(all, { apiKey: FAKE_API_KEY, remember: true });
    saveKey(all, { apiKey: FAKE_API_KEY, remember: false });
    expect(device.getItem(STORAGE_KEYS.apiKey)).toBeNull();
    expect(device.getItem(STORAGE_KEYS.rememberKey)).toBeNull();
    expect(session.getItem(STORAGE_KEYS.apiKey)).toBe(FAKE_API_KEY);
  });

  it('pusty klucz usuwa zapis z obu miejsc', () => {
    const { device, session, all } = stores();
    saveKey(all, { apiKey: FAKE_API_KEY, remember: true });
    saveKey(all, { apiKey: '   ', remember: true });
    expect(device.getItem(STORAGE_KEYS.apiKey)).toBeNull();
    expect(session.getItem(STORAGE_KEYS.apiKey)).toBeNull();
    expect(loadKey(all).apiKey).toBe('');
  });

  it('brak dostępu do pamięci przeglądarki nie przerywa działania', () => {
    const broken = { device: new BrokenStore(), session: new BrokenStore() };
    expect(() => {
      saveKey(broken, { apiKey: FAKE_API_KEY, remember: true });
    }).not.toThrow();
    expect(loadKey(broken)).toEqual({ apiKey: '', remember: false });
    expect(loadKey({ device: null, session: null })).toEqual({ apiKey: '', remember: false });
  });
});

describe('liczebność drużyny', () => {
  it.each([
    [9, 9],
    [3, 3],
    [12, 12],
    [2, 3],
    [20, 12],
    ['7', 7],
    ['abc', 9],
    [null, 9],
  ])('%s → %i (zakres 3–12, SPEC 3.8)', (input, expected) => {
    expect(clampSquadSize(input)).toBe(expected);
  });
});
