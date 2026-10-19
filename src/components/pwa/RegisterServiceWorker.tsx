'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function RegisterServiceWorker() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
    ) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          console.warn('Falha ao registrar Service Worker PWA:', err);
        });
    }

    // O Chrome só dispara este evento quando o site cumpre todos os critérios de instalação
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!installEvent || dismissed) return null;

  const handleInstall = async () => {
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2 pl-4 pr-2 py-2 bg-zinc-900 border border-emerald-500/30 rounded-2xl shadow-lg shadow-black/40">
      <button
        type="button"
        onClick={handleInstall}
        className="flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition"
      >
        <Download className="w-4 h-4" />
        Instalar app
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
        title="Dispensar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
