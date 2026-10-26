'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Search,
  Store,
  Layers,
} from 'lucide-react';
import { Transaction } from '@/types/database';
import {
  CategoryEvolutionMetrics,
  resolveTransactionCategoryInfo,
} from '@/lib/category-evolution-utils';
import { SmoothLineChart, ChartSeries } from '../SmoothLineChart';
import { formatCurrency, formatDate } from '@/lib/utils';
import { isBusinessTransaction } from '@/lib/business-scope-utils';
import { useBusinessProfile } from '@/context/BusinessProfileContext';

interface CategoryEvolutionMobileViewProps {
  isOpen: boolean;
  onClose: () => void;
  activeType: 'income' | 'expense';
  onTypeChange: (type: 'income' | 'expense') => void;
  accountingMode: 'realized' | 'total';
  onAccountingModeChange: (mode: 'realized' | 'total') => void;
  refMonth?: number;
  refYear: number;
  activeFormattedMonth: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  chartSeries: ChartSeries[];
  metricsList: CategoryEvolutionMetrics[];
  totalCurrentMonth: number;
  totalYearly: number;
  activeTransactions: Transaction[];
  loadingMonthData: boolean;
}

const MONTH_SHORT_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTH_FULL_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function CategoryEvolutionMobileView({
  isOpen,
  onClose,
  activeType,
  onTypeChange,
  accountingMode,
  onAccountingModeChange,
  refYear,
  activeFormattedMonth,
  onPrevMonth,
  onNextMonth,
  chartSeries,
  metricsList,
  totalCurrentMonth,
  totalYearly,
  activeTransactions,
  loadingMonthData,
}: CategoryEvolutionMobileViewProps) {
  const { hasBusiness, businessName } = useBusinessProfile();
  const [selectedDrawerCategory, setSelectedDrawerCategory] =
    useState<CategoryEvolutionMetrics | null>(null);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [selectedChartKey, setSelectedChartKey] = useState<string>('all');

  const isIncome = activeType === 'income';

  const displayedSeries = useMemo(() => {
    if (selectedChartKey === 'all') {
      return chartSeries;
    }
    const filtered = chartSeries.filter((s) => s.id === selectedChartKey);
    return filtered.length > 0 ? filtered : chartSeries;
  }, [chartSeries, selectedChartKey]);

  // Lançamentos filtrados da categoria selecionada para o Drawer
  const drawerTransactions = useMemo(() => {
    if (!selectedDrawerCategory) return [];

    const q = drawerSearch.trim().toLowerCase();

    return activeTransactions
      .filter((t) => {
        if (t.type !== activeType) return false;
        if (accountingMode === 'realized' && !t.is_paid) return false;

        const catInfo = resolveTransactionCategoryInfo({
          amount: Number(t.amount),
          type: activeType,
          is_paid: t.is_paid,
          due_date: t.due_date,
          description: t.description,
          notes: t.notes,
          category: t.category,
        });

        if (catInfo.key !== selectedDrawerCategory.key) return false;

        if (q) {
          const descMatch = t.description.toLowerCase().includes(q);
          const notesMatch = (t.notes || '').toLowerCase().includes(q);
          if (!descMatch && !notesMatch) return false;
        }

        return true;
      })
      .sort((a, b) => b.due_date.localeCompare(a.due_date));
  }, [
    selectedDrawerCategory,
    activeTransactions,
    activeType,
    accountingMode,
    drawerSearch,
  ]);

  const drawerTotalSum = useMemo(() => {
    return drawerTransactions.reduce(
      (acc, t) => acc + (Number(t.amount) || 0),
      0
    );
  }, [drawerTransactions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden text-zinc-100 animate-in fade-in duration-200">
      {/* 1. TOPO FIXO: Barra de Navegação Nativa Mobile */}
      <header className="px-4 py-3 bg-zinc-900/95 border-b border-zinc-800 backdrop-blur-md shrink-0 flex items-center justify-between gap-2 safe-area-top">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 p-1.5 -ml-1 text-zinc-300 hover:text-white rounded-xl active:bg-zinc-800 transition"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-semibold">Voltar</span>
        </button>

        <div className="text-center min-w-0 flex-1">
          <h1 className="text-sm font-bold text-zinc-100 truncate">
            Evolução por Categoria
          </h1>
          <span className="text-[10px] text-zinc-400 block truncate">
            Ano {refYear}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 -mr-1 text-zinc-400 hover:text-zinc-100 rounded-xl active:bg-zinc-800 transition"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* 2. SUB-BARRA: Controles de Mês, Entradas/Saídas e Regime */}
      <div className="p-3 bg-zinc-900/60 border-b border-zinc-800/80 space-y-2.5 shrink-0">
        {/* Linha A: Seletor de Mês de Referência */}
        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 active:bg-zinc-800 transition"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-zinc-100 capitalize">
            {activeFormattedMonth}
          </span>
          <button
            type="button"
            onClick={onNextMonth}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 active:bg-zinc-800 transition"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Linha B: Alternador Entradas / Saídas + Regime Realizado vs Total */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Seletor Entradas / Saídas */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => {
                onTypeChange('income');
                setSelectedChartKey('all');
              }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg font-bold text-xs transition ${
                isIncome
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Entradas</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onTypeChange('expense');
                setSelectedChartKey('all');
              }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg font-bold text-xs transition ${
                !isIncome
                  ? 'bg-rose-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Saídas</span>
            </button>
          </div>

          {/* Regime: Realizado vs Previstos */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => onAccountingModeChange('realized')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium text-[11px] transition ${
                accountingMode === 'realized'
                  ? isIncome
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>{isIncome ? 'Recebido' : 'Pago'}</span>
            </button>
            <button
              type="button"
              onClick={() => onAccountingModeChange('total')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium text-[11px] transition ${
                accountingMode === 'total'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Total</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. CONTEÚDO SCROLLÁVEL */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Card Resumo do Mês */}
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-0.5">
              Total em {activeFormattedMonth}
            </span>
            <span
              className={`text-xl font-extrabold block tracking-tight ${
                isIncome ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isIncome ? '+' : '-'} {formatCurrency(totalCurrentMonth)}
            </span>
          </div>

          <div className="text-right border-l border-zinc-800/80 pl-4 shrink-0">
            <span className="text-[10px] text-zinc-500 block uppercase font-medium">
              Acumulado {refYear}
            </span>
            <span className="text-xs font-bold text-zinc-300 block">
              {formatCurrency(totalYearly)}
            </span>
          </div>
        </div>

        {/* Gráfico de Evolução Financeira Expandido Estilo Resumo Mobile */}
        {chartSeries.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 sm:p-5 space-y-3">
            {/* Pílulas de filtro para isolar a curva das categorias no gráfico */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setSelectedChartKey('all')}
                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all ${
                  selectedChartKey === 'all'
                    ? isIncome
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'bg-zinc-950/80 text-zinc-400 border border-zinc-800/80 hover:text-zinc-200'
                }`}
              >
                Todas ({chartSeries.length})
              </button>
              {chartSeries.map((s) => {
                const isSelected = selectedChartKey === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setSelectedChartKey((prev) =>
                        prev === s.id ? 'all' : s.id
                      )
                    }
                    className={`px-2.5 py-1 rounded-xl font-semibold text-[11px] whitespace-nowrap flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-zinc-800 text-zinc-100 border border-zinc-600 shadow-sm ring-1 ring-white/20'
                        : 'bg-zinc-950/80 text-zinc-400 border border-zinc-800/80 hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="truncate max-w-[120px]">{s.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Dica interativa para o usuário tocar e alternar as curvas */}
            <p className="text-[10px] text-zinc-400 text-center flex items-center justify-center gap-1.5 py-0.5">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full animate-pulse ${
                  isIncome ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span>
                {selectedChartKey === 'all'
                  ? 'Toque nas categorias acima para isolar a curva no gráfico'
                  : `Exibindo "${displayedSeries[0]?.name}" (toque para voltar a todas)`}
              </span>
            </p>

            {/* Gráfico Amplo e Nítido com a Métrica Selecionada */}
            <SmoothLineChart
              title={`Evolução Anual (${refYear})`}
              subtitle={
                selectedChartKey === 'all'
                  ? `Curva mensal das principais categorias de ${
                      isIncome ? 'receitas' : 'despesas'
                    }`
                  : `Curva mensal de "${displayedSeries[0]?.name}" em ${refYear}`
              }
              series={displayedSeries}
              labels={MONTH_SHORT_LABELS}
              tooltipLabels={MONTH_FULL_LABELS.map((m) => `${m} de ${refYear}`)}
              height={230}
              dynamicYScale={true}
              compactLayout={true}
            />
          </div>
        )}

        {/* Lista de Categorias Ativas */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-500" />
              <span>Categorias ({metricsList.length})</span>
            </h3>
            <span className="text-[10px] text-zinc-500">
              Toque para ver lançamentos
            </span>
          </div>

          {loadingMonthData ? (
            <div className="p-8 text-center bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-zinc-400">
              Carregando dados do mês...
            </div>
          ) : metricsList.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-zinc-400">
              Nenhuma movimentação registrada neste período.
            </div>
          ) : (
            <div className="space-y-2">
              {metricsList.map((m) => {
                const sharePct =
                  totalCurrentMonth > 0
                    ? (m.currentValue / totalCurrentMonth) * 100
                    : 0;

                let avgBadgeClass = 'bg-zinc-800 text-zinc-400 border-zinc-700';
                let avgBadgeLabel = 'Na média';

                if (m.averageStatus === 'above' && m.vsAveragePct !== null) {
                  avgBadgeClass = isIncome
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
                  avgBadgeLabel = `+${Math.round(Math.abs(m.vsAveragePct))}% acima da média`;
                } else if (
                  m.averageStatus === 'below' &&
                  m.vsAveragePct !== null
                ) {
                  avgBadgeClass = isIncome
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
                  avgBadgeLabel = `-${Math.round(Math.abs(m.vsAveragePct))}% abaixo da média`;
                } else if (m.averageStatus === 'no_history') {
                  avgBadgeLabel = '1º mês com registro';
                }

                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setSelectedDrawerCategory(m);
                      setDrawerSearch('');
                    }}
                    className="w-full p-3.5 bg-zinc-900 hover:bg-zinc-800/80 active:bg-zinc-800 border border-zinc-800 rounded-2xl flex flex-col gap-2.5 text-left transition active:scale-[0.99] cursor-pointer shadow-sm"
                  >
                    {/* Linha 1: Nome da Categoria + Valor do Mês */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: m.color }}
                        />
                        <span className="font-bold text-sm text-zinc-100 truncate">
                          {m.name}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-extrabold text-sm ${
                            isIncome ? 'text-emerald-400' : 'text-zinc-100'
                          }`}
                        >
                          {isIncome ? '+' : '-'} {formatCurrency(m.currentValue)}
                        </span>
                      </div>
                    </div>

                    {/* Linha 2: Barra de Participação Visual */}
                    <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(4, sharePct))}%`,
                          backgroundColor: m.color,
                        }}
                      />
                    </div>

                    {/* Linha 3: Média Mensal, Status e Participação */}
                    <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-400">
                      <span className="truncate">
                        Média:{' '}
                        <strong className="text-zinc-300 font-semibold">
                          {formatCurrency(m.monthlyAverage)}
                        </strong>{' '}
                        • {sharePct.toFixed(1)}% do mês
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${avgBadgeClass}`}
                        >
                          {avgBadgeLabel}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. DRAWER DESLIZANTE (BOTTOM SHEET) PARA DRILL-DOWN DE LANÇAMENTOS */}
      {selectedDrawerCategory && (
        <div className="fixed inset-0 z-60 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-h-[85vh] bg-zinc-900 border-t border-zinc-800 rounded-t-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle */}
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-12 h-1 bg-zinc-700/80 rounded-full" />
            </div>

            {/* Cabeçalho do Drawer */}
            <div className="p-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: selectedDrawerCategory.color }}
                  />
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-zinc-100 truncate">
                      {selectedDrawerCategory.name}
                    </h3>
                    <span className="text-[11px] text-zinc-400 block">
                      {activeFormattedMonth} • {drawerTransactions.length}{' '}
                      {drawerTransactions.length === 1
                        ? 'lançamento'
                        : 'lançamentos'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span
                      className={`text-base font-bold block ${
                        isIncome ? 'text-emerald-400' : 'text-zinc-100'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatCurrency(drawerTotalSum)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDrawerCategory(null)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 bg-zinc-950 border border-zinc-800 active:bg-zinc-800 transition"
                    title="Fechar gaveta"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Busca interna do Drawer */}
              <div className="relative mt-3">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  placeholder={`Buscar em ${selectedDrawerCategory.name}...`}
                  className="w-full pl-9 pr-8 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
                {drawerSearch && (
                  <button
                    type="button"
                    onClick={() => setDrawerSearch('')}
                    className="p-1 text-zinc-400 hover:text-zinc-200 absolute right-2.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista dos Lançamentos no Drawer */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-zinc-800/60">
              {drawerTransactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  Nenhum lançamento encontrado para esta categoria neste mês.
                </div>
              ) : (
                drawerTransactions.map((tx) => {
                  const isCredit = tx.payment_method === 'credit';
                  return (
                    <div
                      key={tx.id}
                      className="py-3 px-1 flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-zinc-100 truncate">
                            {tx.description}
                          </span>
                          {isBusinessTransaction(tx) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Store className="w-2.5 h-2.5" />
                              <span>{hasBusiness ? businessName : 'PJ'}</span>
                            </span>
                          )}
                          {tx.total_installments && tx.total_installments > 1 && (
                            <span className="text-[10px] text-purple-400 font-medium">
                              ({tx.current_installment}/{tx.total_installments})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                          <span>{formatDate(tx.due_date)}</span>
                          <span>•</span>
                          <span className="truncate max-w-[110px]">
                            {isCredit
                              ? tx.credit_card?.name
                              : tx.account?.name || 'Carteira'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span
                            className={`text-xs font-bold block ${
                              isIncome ? 'text-emerald-400' : 'text-zinc-100'
                            }`}
                          >
                            {isIncome ? '+' : '-'}{' '}
                            {formatCurrency(Number(tx.amount))}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                            tx.is_paid
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {tx.is_paid ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
