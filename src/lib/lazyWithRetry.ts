import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'eka:chunk-reloaded-at';

/**
 * Wraps React.lazy so that a failed dynamic import (usually a stale chunk after
 * a new deploy) is retried once, then triggers a single hard reload instead of
 * crashing the app with a blank screen.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      // Retry once — transient network failures resolve here.
      try {
        await new Promise((r) => setTimeout(r, 400));
        return await factory();
      } catch (err2) {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 15000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          // Never resolves; the page is reloading.
          return await new Promise<{ default: T }>(() => {});
        }
        throw err2 ?? err;
      }
    }
  });
}
