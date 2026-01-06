type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

// In Next.js dev/hot-reload, module scope can be duplicated per route or replaced.
// Keep the cache in a global singleton so /api/run and /api/history share the same memory.
const store: Map<string, CacheEntry<unknown>> =
  (globalThis as typeof globalThis & { __MM_CACHE__?: Map<string, CacheEntry<unknown>> }).__MM_CACHE__ ??
  new Map<string, CacheEntry<unknown>>();

(globalThis as typeof globalThis & { __MM_CACHE__?: Map<string, CacheEntry<unknown>> }).__MM_CACHE__ = store;

export function getCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export const TEN_MINUTES_MS = 10 * 60 * 1000;
