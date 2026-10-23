'use client';

import React from 'react';
import {
  X,
  Scissors,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useMobileNavigation } from '@/context/MobileNavigationContext';

export function QuickActionDrawer() {
  const {
    quickActionOpen,
    setQuickActionOpen,
    setNewSaleOpen,
    openQuickTransaction,
    openYieldCorrection,
  } = useMobileNavigation();

  if (!quickActionOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => setQuickActionOpen(false)}
      />

      {/* Drawer Card */}
      <div className="relative w-full sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Barra superior touch */}
        <div className="w-12 h-1 bg-zinc-700/80 rounded-full mx-auto sm:hidden" />

        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              O que você deseja fazer?
            </h3>
            <p className="text-xs text-zinc-400">
              Selecione uma ação rápida
            </p>
          </div>
          <button
            type="button"
            onClick={() => setQuickActionOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5 Ações Rápidas */}
        <div className="grid grid-cols-1 gap-2.5">
          {/* Ação 1: Novo Atendimento Barbearia */}
          <button
            type="button"
            onClick={() => {
              setQuickActionOpen(false);
              setNewSaleOpen(true);
            }}
            className="w-full flex items-center gap-3.5 p-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-left transition group active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Scissors className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-sm text-emerald-400 block">
                Novo Atendimento Barbearia
              </span>
              <span className="text-[11px] text-zinc-400 block">
                Cortes, barba, venda de produtos e forma de pagamento
              </span>
            </div>
          </button>

          {/* Ação 2: Nova Entrada / Receita */}
          <button
            type="button"
            onClick={() => openQuickTransaction('income', 'personal')}
            className="w-full flex items-center gap-3.5 p-3.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-2xl text-left transition group active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-sm text-blue-300 block">
                Nova Entrada (Receita)
              </span>
              <span className="text-[11px] text-zinc-400 block">
                Salários, transferências, vendas extras ou comissões
              </span>
            </div>
          </button>

          {/* Ação 3: Nova Saída (Despesa Pessoal) */}
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
                Nova Saída (Despesa Pessoal)
              </span>
              <span className="text-[11px] text-zinc-400 block">
                Alimentação, mercado, lazer, transporte e contas do dia
              </span>
            </div>
          </button>

          {/* Ação 4: Gasto da Barbearia */}
          <button
            type="button"
            onClick={() => openQuickTransaction('expense', 'business')}
            className="w-full flex items-center gap-3.5 p-3.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-2xl text-left transition group active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-sm text-amber-300 block">
                Gasto da Barbearia
              </span>
              <span className="text-[11px] text-zinc-400 block">
                Aluguel do ponto, lâminas, produtos, energia e contas operacionais
              </span>
            </div>
          </button>

          {/* Ação 5: Correção de Rendimentos */}
          <button
            type="button"
            onClick={() => openYieldCorrection()}
            className="w-full flex items-center gap-3.5 p-3.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-2xl text-left transition group active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-sm text-violet-300 block">
                Correção de Rendimentos
              </span>
              <span className="text-[11px] text-zinc-400 block">
                Ajuste de rendimentos do CDI, Nubank, caixinhas ou poupança
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

