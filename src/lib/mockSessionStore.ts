/**
 * Session-scoped mock store for browser remounts.
 * Survives full page reload within the same tab; cleared by __resetForTests.
 * Server/SSR always uses a fresh seed (no sessionStorage).
 */

type StoreBag = Record<string, unknown>;

function bag(): StoreBag {
  if (typeof globalThis === "undefined") return {};
  const g = globalThis as typeof globalThis & { __bwMockSession?: StoreBag };
  if (!g.__bwMockSession) g.__bwMockSession = {};
  return g.__bwMockSession;
}

function storageKey(key: string): string {
  return `bhaiway.mock.${key}`;
}

export function createSessionMockStore<T>(key: string, seed: () => T): {
  get(): T;
  set(next: T): void;
  reset(): void;
} {
  const memKey = key;

  function readSeed(): T {
    return structuredClone(seed());
  }

  function readFromSession(): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(storageKey(key));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  function writeSession(value: T): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(storageKey(key), JSON.stringify(value));
    } catch {
      /* quota / private mode — ignore */
    }
  }

  function clearSession(): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(storageKey(key));
    } catch {
      /* ignore */
    }
  }

  return {
    get(): T {
      const memory = bag();
      if (memKey in memory) {
        return memory[memKey] as T;
      }
      const fromSession = readFromSession();
      const value = fromSession ?? readSeed();
      memory[memKey] = value;
      return value;
    },
    set(next: T): void {
      const memory = bag();
      memory[memKey] = next;
      writeSession(next);
    },
    reset(): void {
      const memory = bag();
      const fresh = readSeed();
      memory[memKey] = fresh;
      clearSession();
      writeSession(fresh);
    },
  };
}
