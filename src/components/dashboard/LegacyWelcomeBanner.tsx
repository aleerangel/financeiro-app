'use client';

import React, { useState } from 'react';
import { Store, X } from 'lucide-react';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { dismissLegacyWelcomeBanner } from '@/lib/actions/business-profile';
import { BusinessSettingsModal } from '@/components/settings/BusinessSettingsModal';
import { toast } from 'sonner';

export function LegacyWelcomeBanner() {
  const { profile, setProfile } = useBusinessProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [dismissedLocal, setDismissedLocal] = useState(false);

  // Se já foi migrado/reconhecido ou dispensado localmente nesta sessão, não exibe
  if (profile.legacy_migrated || dismissedLocal) {
    return null;
  }

  const handleDismiss = async () => {
    try {
      setDismissing(true);
      setDismissedLocal(true);
      await dismissLegacyWelcomeBanner();
      setProfile({
        ...profile,
        legacy_migrated: true,
      });
      toast.success('Aviso dispensado!');
    } catch (err) {
      console.error('Erro ao dispensar banner de boas-vindas:', err);
    } finally {
      setDismissing(false);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-zinc-900 border border-amber-500/30 p-4 sm:p-5 shadow-lg shadow-amber-500/5 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xl" role="img" aria-label="Canário">
                🐤
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-100 flex items-center gap-1.5">
                  Bem-vindo à nova plataforma Canário!
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                  Dados Preservados
                </span>
              </div>
              <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                Todos os seus atendimentos, clientes, fiados e finanças da barbearia continuam aqui exatamente como antes. Agora você pode personalizar o <strong>Nome Fantasia</strong>, segmento e preferências do seu negócio a qualquer momento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/10 transition active:scale-95"
            >
              <Store className="w-3.5 h-3.5" />
              Personalizar Meu Negócio
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              disabled={dismissing}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-xl transition"
              title="Dispensar este aviso"
              aria-label="Dispensar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <BusinessSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {
          setDismissedLocal(true);
        }}
      />
    </>
  );
}
