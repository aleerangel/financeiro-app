'use client';

import { useSyncExternalStore } from 'react';

/**
 * Hook oficial React (useSyncExternalStore) para sincronizar viewport com breakpoint mobile (< 768px).
 * Evita cascading renders e garante hidratação estável entre SSR e Client.
 */
export function useIsMobile(breakpointPx: number = 768): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    () => {
      if (typeof window === 'undefined') return false;
      return window.matchMedia(`(max-width: ${breakpointPx - 1}px)`).matches;
    },
    () => false
  );
}
