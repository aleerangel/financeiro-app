'use client';

import React from 'react';
import {
  X,
  Filter,
  CalendarDays,
  List,
  FileText,
  FileSpreadsheet,
  FileCode,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Category, Account, CreditCard } from '@/types/database';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { ExportFormat } from '@/lib/export-utils';

interface MobileTransactionFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: (Account | AccountWithBalance)[];
  cards: CreditCard[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  selectedSourceId: string;
  onSelectSource: (id: string) => void;
  groupByDay: boolean;
  onToggleGroupByDay: (val: boolean) => void;
  onExport: (format: ExportFormat) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function MobileTransactionFiltersDrawer({
  isOpen,
  onClose,
  categories,
  accounts,
  cards,
  selectedCategoryId,
  onSelectCategory,
  selectedSourceId,
  onSelectSource,
  groupByDay,
  onToggleGroupByDay,
  onExport,
  hasActiveFilters,
  onClearFilters,
}: MobileTransactionFiltersDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Barra superior de puxar */}
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Topo do Modal */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Filtros &amp; Exportação</h3>
              <p className="text-xs text-zinc-400">Refine as movimentações e gere relatórios</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition"
            aria-label="Fechar filtros"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 1. Filtro por Categoria */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Categoria
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => onSelectCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">Todas as Categorias</option>
              <optgroup label="Receitas">
                {categories
                  .filter((c) => c.type === 'income')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      🟢 {c.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Despesas">
                {categories
                  .filter((c) => c.type === 'expense')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      🔴 {c.name}
                    </option>
                  ))}
              </optgroup>
              <option value="none">Sem Categoria</option>
            </select>
          </div>

          {/* 2. Filtro por Conta ou Cartão */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Conta Bancária / Meio
            </label>
            <select
              value={selectedSourceId}
              onChange={(e) => onSelectSource(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">Todas as Contas &amp; Cartões</option>
              {accounts.length > 0 && (
                <optgroup label="Contas Bancárias / Carteira">
                  {accounts.map((acc) => (
                    <option key={acc.id} value={`acc:${acc.id}`}>
                      🏦 {acc.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {cards.length > 0 && (
                <optgroup label="Cartões de Crédito">
                  {cards.map((card) => (
                    <option key={card.id} value={`card:${card.id}`}>
                      💳 {card.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* 3. Modo de Visualização */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Formato da Listagem
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onToggleGroupByDay(true)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  groupByDay
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Agrupar por Dia
              </button>
              <button
                type="button"
                onClick={() => onToggleGroupByDay(false)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  !groupByDay
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Lista Corrida
              </button>
            </div>
          </div>

          {/* 4. Exportação */}
          <div className="pt-2 border-t border-zinc-800/80">
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Exportar Relatório do Extrato
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  onExport('pdf');
                  onClose();
                }}
                className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition text-center"
              >
                <FileText className="w-4 h-4 text-red-400" />
                <span className="text-[11px] font-bold">PDF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onExport('xlsx');
                  onClose();
                }}
                className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition text-center"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold">Excel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onExport('csv');
                  onClose();
                }}
                className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition text-center"
              >
                <FileCode className="w-4 h-4 text-blue-400" />
                <span className="text-[11px] font-bold">CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé / Ações */}
        <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar Filtros
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition"
          >
            <Check className="w-4 h-4" />
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
}
