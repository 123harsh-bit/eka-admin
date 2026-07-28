import { useEffect, useState } from 'react';

/**
 * useState that persists to localStorage under a namespaced key.
 * Used for "saved views" (filters, view mode, density) so a user's
 * layout choices survive reloads and navigation.
 */
export function usePersistedState<T>(key: string, initial: T) {
  const storageKey = `eka:view:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [storageKey, value]);

  return [value, setValue] as const;
}
