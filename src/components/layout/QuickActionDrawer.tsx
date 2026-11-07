'use client';

import React from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { SegmentIcon } from '@/components/ui/SegmentIcon';

export function QuickActionDrawer() {
  const {
    quickActionOpen,
    setQuickActionOpen,
    setNewSaleOpen,
    openQuickTransaction,
    openYieldCorrection,
  } = useMobileNavigation();

  const { profile, businessName, salesLabel, hasBusiness } = useBusinessProfile();

  if (!quickActionOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => setQuickActionOpen(false)}
      />

      {/* Drawer Card */}
      <div className="relative w-full sm:max-w-md bg-[#0D121F] border border-[#1E293B] rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Barra superior touch */}
        <div className="w-12 h-1 bg-slate-700/80 rounded-full mx-auto sm:hidden" />

        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">
              O que você deseja fazer?
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Selecione uma ação rápida
            </p>
          </div>
          <button
            type="button"
            onClick={() => setQuickActionOpen(false)}
            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] bg-[#151D30] rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 gap-2.5">
          {/* Ação 1: Nova Venda / Atendimento (se hasBusiness) */}
          {hasBusiness && (
            <button
              type="button"
              onClick={() => {
                setQuickActionOpen(false);
                setNewSaleOpen(true);
              }}
              className="w-full flex items-center gap-3.5 p-3.5 bg-[#FACC15]/10 hover:bg-[#FACC15]/20 border border-[#FACC15]/30 rounded-2xl text-left transition group active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-xl bg-[#FACC15] text-[#080B11] flex items-center justify-center shadow-md shadow-[#FACC15]/20 shrink-0">
                <SegmentIcon segment={profile.segment} className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-bold text-sm text-[#FDE047] block">
                  Novo(a) {salesLabel} • {businessName}
                </span>
                <span className="text-[11px] text-[#94A3B8] block">
                  Serviços, produtos, valores e forma de pagamento
                </span>
              </div>
            </button>
          )}

          {/* Ação 2: Nova Entrada / Receita */}
          <button
            type="button"
            onClick={() => openQuickTransaction('income', 'personal')}
            className="w-full flex items-center gap-3.5 p-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-left transition group active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-sm text-emerald-300 block">
                Nova Entrada (Receita)
              </span>
              <span className="text-[11px] text-[#94A3B8] block">
                Salários, transferências, vendas extras ou comissões
              </span>
            </div>
          </button>

          {/* Ação 3: Nova Saída (Despesa Pessoal ou Negócio) */}
          <button
            type="button"
            onClick={() => openQuickTransaction('expense', 'personal')}
            className="w-full flex items-center gap-3.5 p-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-2xl text-left transition group active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-sm text-rose-300 block">
                Nova Saída (Despesa)
              </span>
              <span className="text-[11px] text-[#94A3B8] block">
                {hasBusiness
                  ? `Gastos pessoais ou de ${businessName} (contas, compras, insumos)`
                  : 'Gastos e contas pessoais do dia a dia'}
              </span>
            </div>
          </button>

          {/* Ação 4: Correção de Rendimentos */}
          <button
            type="button"
            onClick={() => openYieldCorrection()}
            className="w-full flex items-center gap-3.5 p-3.5 bg-[#6366F1]/10 hover:bg-[#6366F1]/20 border border-[#6366F1]/30 rounded-2xl text-left transition group active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-xl bg-[#6366F1]/20 text-[#A5B4FC] border border-[#6366F1]/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-sm text-[#A5B4FC] block">
                Correção de Rendimentos
              </span>
              <span className="text-[11px] text-[#94A3B8] block">
                Ajuste de rendimentos do CDI, Nubank, caixinhas ou poupança
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
