'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => {
          console.warn('Falha ao registrar Service Worker PWA:', err);
        });
    }
  }, []);

  return null;
}
