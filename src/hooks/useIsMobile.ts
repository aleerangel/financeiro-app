'use client';

import { useSyncExternalStore } from 'react';

/**
 * Hook oficial React (useSyncExternalStore) para sincronizar viewport com breakpoint mobile (< 768px).
 * Evita cascading renders e garante hidratação estável entre SSR e Client, com suporte a detecção de servidor.
 */
export function useIsMobile(breakpointPx: number = 768, initialIsMobile?: boolean): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    () => {
      if (typeof window === 'undefined') return initialIsMobile ?? false;
      return window.matchMedia(`(max-width: ${breakpointPx - 1}px)`).matches;
    },
    () => initialIsMobile ?? false
  );
}

