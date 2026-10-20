'use client';

import { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
  CheckCircle2,
  Clock,
  CreditCard as CardIcon,
  Scissors,
  Search,
  Receipt,
} from 'lucide-react';
import { Transaction } from '@/types/database';
import {
  CategoryMonthlyEvolutionItem,
  computeCategoryEvolutionMetrics,
  resolveTransactionCategoryInfo,
} from '@/lib/category-evolution-utils';
import { isBusinessTransaction } from '@/lib/business-scope-utils';
import { SmoothLineChart, ChartSeries } from './SmoothLineChart';
import { formatCurrency, formatDate } from '@/lib/utils';

interface CategoryEvolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'income' | 'expense';
  categories: CategoryMonthlyEvolutionItem[];
  transactions?: Transaction[];
  currentMonth: number; // 0 a 11
  year: number;
  formattedMonth: string;
}

const MONTH_SHORT_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTH_FULL_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function CategoryEvolutionModal({
  isOpen,
  onClose,
  type,
  categories,
  transactions = [],
  currentMonth,
  year,
  formattedMonth,
}: CategoryEvolutionModalProps) {
  const [accountingMode, setAccountingMode] = useState<'realized' | 'total'>('realized');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('all');
  const [txSearch, setTxSearch] = useState('');

  const isIncome = type === 'income';

  const metricsList = useMemo(() => {
    return categories
      .map((cat) =>
        computeCategoryEvolutionMetrics(cat, currentMonth, accountingMode, {
          selectedYear: year,
        })
      )
      .filter((m) => m.yearlyTotal > 0 || m.currentValue > 0)
      .sort((a, b) => b.currentValue - a.currentValue || b.yearlyTotal - a.yearlyTotal);
  }, [categories, currentMonth, accountingMode, year]);

  const activeCategoryKey = useMemo(() => {
    if (selectedCategoryKey === 'all') return 'all';
    const exists = metricsList.some((m) => m.key === selectedCategoryKey);
    return exists ? selectedCategoryKey : 'all';
  }, [selectedCategoryKey, metricsList]);

  const totalCurrentMonth = useMemo(
    () => metricsList.reduce((acc, m) => acc + m.currentValue, 0),
    [metricsList]
  );

  const totalYearly = useMemo(
    () => metricsList.reduce((acc, m) => acc + m.yearlyTotal, 0),
    [metricsList]
  );

  const chartSeries: ChartSeries[] = useMemo(() => {
    const targetList =
      activeCategoryKey === 'all'
        ? metricsList.slice(0, 6)
        : metricsList.filter((m) => m.key === activeCategoryKey);

    if (targetList.length === 0) {
      return [
        {
          id: 'empty',
          name: isIncome ? 'Receitas' : 'Despesas',
          color: isIncome ? '#10b981' : '#f43f5e',
          values: Array(12).fill(0),
          formatValue: (v) => formatCurrency(v),
        },
      ];
    }

    return targetList.map((m) => ({
      id: m.key,
      name: m.name,
      color: m.color,
      values: m.monthlyValues,
      formatValue: (v) => formatCurrency(v),
    }));
  }, [metricsList, activeCategoryKey, isIncome]);

  const tooltipLabels = useMemo(
    () => MONTH_FULL_LABELS.map((m) => `${m} de ${year}`),
    [year]
  );

  const filteredModalTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();

    return transactions
      .filter((t) => {
        if (t.type !== type) return false;
        if (accountingMode === 'realized' && !t.is_paid) return false;

        if (activeCategoryKey !== 'all') {
          const catInfo = resolveTransactionCategoryInfo({
            amount: Number(t.amount),
            type: t.type,
            is_paid: t.is_paid,
            due_date: t.due_date,
            description: t.description,
            notes: t.notes,
            category: t.category,
          });
          if (catInfo.key !== activeCategoryKey) return false;
        }

        if (q) {
          const descMatch = t.description.toLowerCase().includes(q);
          const catMatch = (t.category?.name || '').toLowerCase().includes(q);
          const notesMatch = (t.notes || '').toLowerCase().includes(q);
          if (!descMatch && !catMatch && !notesMatch) return false;
        }

        return true;
      })
      .sort((a, b) => b.due_date.localeCompare(a.due_date));
  }, [transactions, type, accountingMode, activeCategoryKey, txSearch]);

  const filteredModalTransactionsSum = useMemo(
    () =>
      filteredModalTransactions.reduce(
        (acc, curr) => acc + (Number(curr.amount) || 0),
        0
      ),
    [filteredModalTransactions]
  );

  if (!isOpen) return null;

  const prevMonthName = currentMonth > 0 ? MONTH_SHORT_LABELS[currentMonth - 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 shrink-0">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isIncome
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isIncome ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100">
                {isIncome
                  ? 'Evolução de Receitas por Categoria'
                  : 'Evolução de Despesas por Categoria'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Acompanhamento mensal em {year}, média histórica e desempenho em {formattedMonth}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Alternador: Realizado vs Total com Pendentes */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setAccountingMode('realized')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  accountingMode === 'realized'
                    ? isIncome
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                      : 'bg-rose-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isIncome ? 'Apenas Recebido' : 'Apenas Pago'}</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountingMode('total')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  accountingMode === 'total'
                    ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Total (c/ Previstos)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Resumo Rápido no Topo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block">
                {isIncome ? 'Receitas em' : 'Despesas em'} {formattedMonth}
              </span>
              <span
                className={`text-xl font-extrabold mt-1 block ${
                  isIncome ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(totalCurrentMonth)}
              </span>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                {accountingMode === 'realized'
                  ? isIncome
                    ? 'Valores efetivamente recebidos'
                    : 'Valores efetivamente pagos'
                  : 'Soma de realizados + pendentes do mês'}
              </span>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block">
                Acumulado no Ano ({year})
              </span>
              <span className="text-xl font-extrabold text-zinc-100 mt-1 block">
                {formatCurrency(totalYearly)}
              </span>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                Soma das {metricsList.length} categorias ativas em {year}
              </span>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block">
                Categorias Monitoradas
              </span>
              <span className="text-xl font-extrabold text-zinc-100 mt-1 block">
                {metricsList.length}
              </span>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                Clique em uma categoria abaixo para isolar sua curva
              </span>
            </div>
          </div>

          {/* Seletor de Categoria para Filtrar o Gráfico */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategoryKey('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                activeCategoryKey === 'all'
                  ? 'bg-zinc-100 text-zinc-950 shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Todas (Top Categorias)
            </button>

            {metricsList.map((m) => {
              const active = activeCategoryKey === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() =>
                    setSelectedCategoryKey(active ? 'all' : m.key)
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 border ${
                    active
                      ? 'bg-zinc-800 text-zinc-100 border-zinc-600 shadow'
                      : 'bg-zinc-900/70 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: m.color }}
                  />
                  <span>{m.name}</span>
                </button>
              );
            })}
          </div>

          {/* Gráfico de Evolução 12 Meses */}
          <SmoothLineChart
            title={
              activeCategoryKey === 'all'
                ? `Curva de Evolução Anual por Categoria (${year})`
                : `Evolução Anual: ${
                    metricsList.find((m) => m.key === activeCategoryKey)?.name || ''
                  } (${year})`
            }
            subtitle={
              accountingMode === 'realized'
                ? 'Comparativo mês a mês considerando valores realizados/pagos'
                : 'Comparativo mês a mês considerando todos os lançamentos (realizados + pendentes)'
            }
            series={chartSeries}
            labels={MONTH_SHORT_LABELS}
            tooltipLabels={tooltipLabels}
            height={250}
          />

          {/* Diagnóstico Detalhado por Categoria (Média, Acima/Abaixo da Média e Variação Mensal) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                Desempenho & Média Mensal por Categoria
              </h3>
              <span className="text-xs text-zinc-400">
                Referência: {formattedMonth}
              </span>
            </div>

            {metricsList.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs">
                Nenhuma movimentação encontrada para este modo no ano de {year}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metricsList.map((m) => {
                  const sharePct =
                    totalCurrentMonth > 0
                      ? (m.currentValue / totalCurrentMonth) * 100
                      : 0;
                  const maxMonthly = Math.max(...m.monthlyValues, 1);

                  // Cores semânticas para Acima / Abaixo da Média:
                  // - Em Receitas: Acima da média = Verde (bom), Abaixo da média = Âmbar (alerta)
                  // - Em Despesas: Acima da média = Rosa/Âmbar (alerta de gasto alto), Abaixo da média = Verde (economia)
                  let avgBadgeClass =
                    'bg-zinc-800 text-zinc-300 border-zinc-700';
                  const sameDaySuffix =
                    m.isSameDayComparison && m.comparisonCutoffDay
                      ? ` (até dia ${m.comparisonCutoffDay})`
                      : '';
                  let avgBadgeLabel = `Na média${sameDaySuffix || ' mensal'}`;

                  if (m.averageStatus === 'above' && m.vsAveragePct !== null) {
                    avgBadgeClass = isIncome
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30';
                    avgBadgeLabel = `+${Math.round(Math.abs(m.vsAveragePct))}% acima da média${sameDaySuffix}`;
                  } else if (m.averageStatus === 'below' && m.vsAveragePct !== null) {
                    avgBadgeClass = isIncome
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                    avgBadgeLabel = `-${Math.round(Math.abs(m.vsAveragePct))}% abaixo da média${sameDaySuffix}`;
                  } else if (m.averageStatus === 'no_history') {
                    avgBadgeLabel = '1º mês com registro';
                  }

                  return (
                    <div
                      key={m.key}
                      onClick={() =>
                        setSelectedCategoryKey(
                          activeCategoryKey === m.key ? 'all' : m.key
                        )
                      }
                      className={`p-4 bg-zinc-900 border rounded-2xl space-y-3 transition cursor-pointer ${
                        activeCategoryKey === m.key
                          ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {/* Linha 1: Nome da Categoria + Badge Acima/Abaixo da Média */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: m.color }}
                          />
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-zinc-100 truncate">
                              {m.name}
                            </h4>
                            <span className="text-[11px] text-zinc-400">
                              {sharePct.toFixed(0)}% do total do mês • Acumulado {year}:{' '}
                              <strong className="text-zinc-200">
                                {formatCurrency(m.yearlyTotal)}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${avgBadgeClass}`}
                        >
                          {m.averageStatus === 'above' && (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          {m.averageStatus === 'below' && (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {m.averageStatus === 'on_average' && (
                            <Minus className="w-3 h-3" />
                          )}
                          {avgBadgeLabel}
                        </span>
                      </div>

                      {/* Linha 2: Valor no Mês, Média Mensal e Variação vs Mês Anterior */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-xs">
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase block">
                            No Mês ({MONTH_SHORT_LABELS[currentMonth]})
                          </span>
                          <span
                            className={`text-sm font-bold block mt-0.5 ${
                              isIncome ? 'text-emerald-400' : 'text-zinc-100'
                            }`}
                          >
                            {formatCurrency(m.currentValue)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase block">
                            {m.isSameDayComparison && m.comparisonCutoffDay
                              ? `Média (até dia ${m.comparisonCutoffDay})`
                              : 'Média da Categoria'}
                          </span>
                          <span
                            className="text-sm font-semibold text-zinc-200 block mt-0.5"
                            title={
                              m.isSameDayComparison && m.comparisonCutoffDay
                                ? `Média acumulada do dia 1 ao dia ${m.comparisonCutoffDay} nos outros meses. Média de mês inteiro: ${formatCurrency(m.fullMonthlyAverage)}`
                                : undefined
                            }
                          >
                            {formatCurrency(m.monthlyAverage)}
                            <span className="text-[10px] text-zinc-500 font-normal">
                              {m.isSameDayComparison && m.comparisonCutoffDay
                                ? ` (1-${m.comparisonCutoffDay})`
                                : '/mês'}
                            </span>
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 uppercase block">
                            {prevMonthName
                              ? m.isSameDayComparison && m.comparisonCutoffDay
                                ? `vs. ${prevMonthName} (até dia ${m.comparisonCutoffDay})`
                                : `vs. ${prevMonthName}`
                              : 'Mês Anterior'}
                          </span>
                          {m.hasPreviousMonth ? (
                            <span
                              className={`text-xs font-bold block mt-0.5 ${
                                m.momDelta === 0
                                  ? 'text-zinc-400'
                                  : (isIncome ? m.momDelta > 0 : m.momDelta < 0)
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {m.momDelta >= 0 ? '+' : '-'}
                              {formatCurrency(Math.abs(m.momDelta))}
                              {m.momPct !== null && (
                                <span className="text-[10px] font-normal ml-1">
                                  ({m.momPct >= 0 ? '+' : ''}
                                  {Math.round(m.momPct)}%)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500 block mt-0.5">
                              —
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Linha 3: Mini Sparkbar de Jan a Dez */}
                      <div className="pt-2">
                        <div className="grid grid-cols-12 gap-1 items-end h-10 pt-2">
                          {m.monthlyValues.map((val, mIdx) => {
                            const heightPct =
                              val > 0 ? Math.max(16, Math.round((val / maxMonthly) * 100)) : 6;
                            const isCurrent = mIdx === currentMonth;

                            return (
                              <div
                                key={mIdx}
                                className="flex flex-col items-center gap-1 h-full justify-end group/bar"
                                title={`${MONTH_FULL_LABELS[mIdx]}: ${formatCurrency(val)}`}
                              >
                                <div
                                  className={`w-full rounded-sm transition-all ${
                                    val === 0
                                      ? 'bg-zinc-800/60'
                                      : isCurrent
                                      ? 'opacity-100 ring-1 ring-white/40'
                                      : 'opacity-55 group-hover/bar:opacity-90'
                                  }`}
                                  style={{
                                    height: `${heightPct}%`,
                                    backgroundColor: val > 0 ? m.color : undefined,
                                  }}
                                />
                                <span
                                  className={`text-[9px] leading-none ${
                                    isCurrent
                                      ? 'text-zinc-100 font-bold'
                                      : 'text-zinc-500'
                                  }`}
                                >
                                  {MONTH_SHORT_LABELS[mIdx].charAt(0)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lista Completa de Transações (Receitas ou Despesas) */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isIncome
                      ? `Todas as Receitas de ${formattedMonth}`
                      : `Todas as Despesas de ${formattedMonth}`}
                    {activeCategoryKey !== 'all' &&
                      ` • ${
                        metricsList.find((m) => m.key === activeCategoryKey)
                          ?.name || ''
                      }`}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {filteredModalTransactions.length}{' '}
                  {filteredModalTransactions.length === 1
                    ? 'lançamento listado'
                    : 'lançamentos listados'}{' '}
                  • Total:{' '}
                  <strong
                    className={isIncome ? 'text-emerald-400' : 'text-rose-400'}
                  >
                    {formatCurrency(filteredModalTransactionsSum)}
                  </strong>
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder={`Buscar ${isIncome ? 'receita' : 'despesa'}...`}
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {filteredModalTransactions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs">
                Nenhuma transação encontrada para os filtros selecionados em{' '}
                {formattedMonth}.
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/80 overflow-hidden max-h-96 overflow-y-auto scrollbar-thin">
                {filteredModalTransactions.map((t) => {
                  const isCredit = t.payment_method === 'credit';
                  const catInfo = resolveTransactionCategoryInfo({
                    amount: Number(t.amount),
                    type,
                    is_paid: t.is_paid,
                    due_date: t.due_date,
                    description: t.description,
                    notes: t.notes,
                    category: t.category,
                  });

                  return (
                    <div
                      key={t.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-800/40 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isIncome
                              ? 'rgba(16, 185, 129, 0.15)'
                              : isCredit
                              ? 'rgba(168, 85, 247, 0.15)'
                              : 'rgba(244, 63, 94, 0.15)',
                            color: isIncome
                              ? '#10b981'
                              : isCredit
                              ? '#c084fc'
                              : '#fb7185',
                          }}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : isCredit ? (
                            <CardIcon className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
                              {t.description}
                            </span>
                            {isBusinessTransaction(t) && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                                <Scissors className="w-2.5 h-2.5" />
                                Barbearia
                              </span>
                            )}
                            {t.total_installments &&
                              t.total_installments > 1 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-medium shrink-0">
                                  {t.current_installment}/{t.total_installments}
                                </span>
                              )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 font-medium text-zinc-300">
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: catInfo.color }}
                              />
                              {catInfo.name}
                            </span>
                            <span>•</span>
                            <span>
                              {isCredit
                                ? t.credit_card?.name || 'Cartão'
                                : t.account?.name || 'Conta / Carteira'}
                            </span>
                            <span>•</span>
                            <span>{formatDate(t.due_date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs sm:text-sm font-bold block ${
                            isIncome ? 'text-emerald-400' : 'text-zinc-100'
                          }`}
                        >
                          {isIncome ? '+' : '-'}{' '}
                          {formatCurrency(Number(t.amount))}
                        </span>
                        <span
                          className={`text-[10px] font-medium block ${
                            t.is_paid ? 'text-emerald-500' : 'text-amber-400'
                          }`}
                        >
                          {t.is_paid
                            ? isIncome
                              ? 'Recebido'
                              : 'Pago'
                            : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

