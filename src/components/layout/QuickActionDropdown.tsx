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
  size?: 'sm' | 'md' | 'lg';
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
      {/* Botão Gatilho Primário em Canário Radiante */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 bg-[#FACC15] hover:bg-[#FDE047] active:bg-[#EAB308] text-[#080B11] font-semibold rounded-xl transition shadow-lg shadow-amber-500/10 active:scale-[0.98] cursor-pointer ${
          size === 'sm'
            ? 'px-3 py-1.5 text-xs'
            : size === 'lg'
            ? 'h-[46px] px-[18px] text-sm'
            : 'px-4 py-2 text-xs sm:text-sm'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Criar nova transação ou atendimento"
      >
        <Plus className={size === 'sm' ? 'w-3.5 h-3.5 stroke-[2.5]' : 'w-4 h-4 stroke-[2.5]'} />
        <span>{buttonLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 opacity-90 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menu Dropdown Flutuante Cobalto */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-72 sm:w-80 bg-[#0D121F] border border-[#1E293B] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md`}
        >
          <div className="px-2.5 py-1.5 border-b border-[#1E293B] mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Ações Rápidas
            </span>
            <span className="text-[10px] text-[#64748B]">Atalhos Canário</span>
          </div>

          <div className="space-y-1">
            {/* Opção 1: Novo Atendimento / Venda (se hasBusiness) */}
            {hasBusiness && (
              <button
                type="button"
                onClick={() => handleAction(() => setNewSaleOpen(true))}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition hover:bg-[#151D30] border border-transparent hover:border-[#1E293B] group active:scale-[0.98] cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30 flex items-center justify-center shrink-0 group-hover:bg-[#FACC15] group-hover:text-[#080B11] transition-colors shadow-sm">
                  <SegmentIcon segment={profile.segment} className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs sm:text-sm text-[#F8FAFC] group-hover:text-[#FACC15] block truncate">
                    Novo(a) {salesLabel}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] block truncate">
                    Comanda e checkout • {businessName}
                  </span>
                </div>
              </button>
            )}

            {/* Opção 2: Nova Entrada (Receita) */}
            <button
              type="button"
              onClick={() => handleAction(() => openQuickTransaction('income', effectiveScope))}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition hover:bg-[#151D30] border border-transparent hover:border-[#1E293B] group active:scale-[0.98] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-black transition-colors shadow-sm">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs sm:text-sm text-[#F8FAFC] group-hover:text-emerald-300 block truncate">
                  Nova Entrada (Receita)
                </span>
                <span className="text-[10px] text-[#94A3B8] block truncate">
                  Recebimentos, transferências e ganhos
                </span>
              </div>
            </button>

            {/* Opção 3: Nova Saída (Despesa) */}
            <button
              type="button"
              onClick={() => handleAction(() => openQuickTransaction('expense', effectiveScope))}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition hover:bg-[#151D30] border border-transparent hover:border-[#1E293B] group active:scale-[0.98] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors shadow-sm">
                <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs sm:text-sm text-[#F8FAFC] group-hover:text-rose-300 block truncate">
                  Nova Saída (Despesa)
                </span>
                <span className="text-[10px] text-[#94A3B8] block truncate">
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
              className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition hover:bg-[#151D30] border border-transparent hover:border-[#1E293B] group active:scale-[0.98] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors shadow-sm">
                <Sparkles className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs sm:text-sm text-[#F8FAFC] group-hover:text-indigo-300 block truncate">
                  Correção de Rendimentos
                </span>
                <span className="text-[10px] text-[#94A3B8] block truncate">
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
