'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Store, ArrowLeft, Sparkles, Plus } from 'lucide-react';
import { BusinessSettingsModal } from '@/components/settings/BusinessSettingsModal';
import { useRouter } from 'next/navigation';

interface BusinessRequiredViewProps {
  moduleName?: string;
  description?: string;
}

export function BusinessRequiredView({
  moduleName = 'Gestão Comercial',
  description = 'Gerencie atendimentos, serviços, fiados, mensalidades e clientes com inteligência comercial.',
}: BusinessRequiredViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4 max-w-lg mx-auto py-12 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6 shadow-xl shadow-amber-500/5">
          <Store className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Módulo Comercial Desativado
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100 mb-2">
          {moduleName} não está ativo
        </h2>

        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          Você configurou sua conta no modo <strong>Apenas Finanças Pessoais</strong>.
          <br className="hidden sm:inline" />
          {description}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Ativar Módulo de Negócio
          </button>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-sm rounded-2xl border border-zinc-800 transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Finanças Pessoais
          </Link>
        </div>
      </div>

      <BusinessSettingsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
