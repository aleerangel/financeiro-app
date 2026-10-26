'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { SegmentIcon } from '@/components/ui/SegmentIcon';
import { FinancialScope } from '@/types/database';

interface QuickActionDropdownProps {
  buttonLabel?: string;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  defaultScope?: FinancialScope;
}

export function QuickActionDropdown({
  buttonLabel = 'Novo',
  size = 'md',
  align = 'right',
  defaultScope,
}: QuickActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    setNewSaleOpen,
    openQuickTransaction,
    openYieldCorrection,
    contextMode,
  } = useMobileNavigation();

  const { profile, businessName, salesLabel, hasBusiness } = useBusinessProfile();

  // Fecha ao clicar fora ou pressionar ESC
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const effectiveScope: FinancialScope = defaultScope || (contextMode === 'business' ? 'business' : 'personal');

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Botão Gatilho Primário */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/10 active:scale-95 ${
          size === 'sm'
            ? 'px-3 py-1.5 text-xs'
            : 'px-4 py-2 text-xs sm:text-sm'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Criar nova transação ou atendimento"
      >
        <Plus className={size === 'sm' ? 'w-3.5 h-3.5 stroke-[3]' : 'w-4 h-4 stroke-[3]'} />
        <span>{buttonLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 opacity-80 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menu Dropdown Flutuante */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-72 sm:w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md`}
        >
          <div className="px-2.5 py-1.5 border-b border-zinc-800/80 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Ações Rápidas
            </span>
            <span className="text-[10px] text-zinc-400">Atalhos de entrada</span>
          </div>

          <div className="space-y-1">
            {/* Opção 1: Novo Atendimento / Venda (se hasBusiness) */}
            {hasBusiness && (
              <button
                type="button"
                onClick={() => handleAction(() => setNewSaleOpen(true))}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition hover:bg-emerald-500/15 border border-transparent hover:border-emerald-500/30 group active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition-colors shadow-sm">
                  <SegmentIcon segment={profile.segment} className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-emerald-300 block truncate">
                    Novo(a) {salesLabel}
                  </span>
                  <span className="text-[10px] text-zinc-400 block truncate">
                    Comanda e checkout • {businessName}
                  </span>
                </div>
              </button>
            )}

            {/* Opção 2: Nova Entrada (Receita) */}
            <button
              type="button"
              onClick={() => handleAction(() => openQuickTransaction('income', effectiveScope))}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition hover:bg-blue-500/15 border border-transparent hover:border-blue-500/30 group active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-zinc-950 transition-colors shadow-sm">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-blue-300 block truncate">
                  Nova Entrada (Receita)
                </span>
                <span className="text-[10px] text-zinc-400 block truncate">
                  Salários, transferências e receitas
                </span>
              </div>
            </button>

            {/* Opção 3: Nova Saída (Despesa) */}
            <button
              type="button"
              onClick={() => handleAction(() => openQuickTransaction('expense', effectiveScope))}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 group active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 group-hover:bg-rose-500 group-hover:text-zinc-950 transition-colors shadow-sm">
                <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-rose-300 block truncate">
                  Nova Saída (Despesa)
                </span>
                <span className="text-[10px] text-zinc-400 block truncate">
                  {hasBusiness && effectiveScope === 'business'
                    ? `Contas e insumos de ${businessName}`
                    : 'Gastos pessoais e contas a pagar'}
                </span>
              </div>
            </button>

            {/* Opção 4: Correção de Rendimentos */}
            <button
              type="button"
              onClick={() => handleAction(() => openYieldCorrection())}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition hover:bg-violet-500/15 border border-transparent hover:border-violet-500/30 group active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0 group-hover:bg-violet-500 group-hover:text-zinc-950 transition-colors shadow-sm">
                <Sparkles className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-violet-300 block truncate">
                  Correção de Rendimentos
                </span>
                <span className="text-[10px] text-zinc-400 block truncate">
                  Ajuste de rendimentos CDI, Nubank ou caixinhas
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
