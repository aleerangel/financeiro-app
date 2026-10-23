'use client';

import { useMemo } from 'react';
import { Transaction } from '@/types/database';
import {
  CategoryMonthlyEvolutionItem,
  computeCategoryEvolutionMetrics,
} from '@/lib/category-evolution-utils';
import { useReferenceMonthTransactions } from '@/hooks/useReferenceMonthTransactions';
import { formatCurrency } from '@/lib/utils';
import {
  PieChart,
  TrendingDown,
  Maximize2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const MONTH_SHORT_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

interface CategoryDonutChartProps {
  transactions: Transaction[];
  expenseEvolution?: CategoryMonthlyEvolutionItem[];
  currentMonth?: number;
  year?: number;
  onExpandEvolution?: (refMonth: number, refYear: number) => void;
  hideMonthSelector?: boolean;
}

interface CategoryTotal {
  name: string;
  color: string;
  total: number;
  percentage: number;
  strokeDasharray: string;
  strokeDashoffset: number;
}

export function CategoryDonutChart({
  transactions,
  expenseEvolution = [],
  currentMonth = new Date().getMonth(),
  year = new Date().getFullYear(),
  onExpandEvolution,
  hideMonthSelector = false,
}: CategoryDonutChartProps) {
  const {
    refMonth,
    refYear,
    loadingCustom,
    activeTransactions,
    selectReferencePeriod,
    handlePrevMonth,
    handleNextMonth,
  } = useReferenceMonthTransactions(transactions, currentMonth, year);

  const evolutionMetricsMap = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof computeCategoryEvolutionMetrics>
    >();
    for (const item of expenseEvolution) {
      map.set(
        item.name.toLowerCase(),
        computeCategoryEvolutionMetrics(item, refMonth, 'total', {
          selectedYear: refYear,
        })
      );
    }
    return map;
  }, [expenseEvolution, refMonth, refYear]);

  const {
    categoryTotals,
    paidExpense,
    pendingExpense,
    totalExpense,
    paidExpensePct,
    pendingExpensePct,
    radius,
  } = useMemo(() => {
    const expenseTxs = activeTransactions.filter((t) => t.type === 'expense');

    let paidExp = 0;
    let pendExp = 0;

    const map = new Map<string, { name: string; color: string; total: number }>();

    for (const t of expenseTxs) {
      const amt = Number(t.amount);
      if (t.is_paid) {
        paidExp += amt;
      } else {
        pendExp += amt;
      }

      const catName = t.category?.name || 'Outras Despesas';
      const catColor = t.category?.color || '#64748b';
      const current = map.get(catName) || {
        name: catName,
        color: catColor,
        total: 0,
      };
      current.total += amt;
      map.set(catName, current);
    }

    const total = paidExp + pendExp;
    const paidPct =
      total > 0
        ? Math.min(100, Math.max(0, Math.round((paidExp / total) * 100)))
        : 0;
    const pendPct = total > 0 ? Math.max(0, 100 - paidPct) : 0;

    const totals = Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: total > 0 ? (item.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const radius = 60;
    const circumference = 2 * Math.PI * radius;

    const totalsWithArcs: CategoryTotal[] = totals.reduce<{
      acc: number;
      items: CategoryTotal[];
    }>(
      (state, item) => {
        const arcLength = (item.percentage / 100) * circumference;
        return {
          acc: state.acc + arcLength,
          items: [
            ...state.items,
            {
              ...item,
              strokeDasharray: `${arcLength} ${circumference}`,
              strokeDashoffset: -state.acc,
            },
          ],
        };
      },
      { acc: 0, items: [] }
    ).items;

    return {
      categoryTotals: totalsWithArcs,
      paidExpense: paidExp,
      pendingExpense: pendExp,
      totalExpense: total,
      paidExpensePct: paidPct,
      pendingExpensePct: pendPct,
      radius,
    };
  }, [activeTransactions]);

  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5 flex flex-col justify-between">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-bold text-zinc-100 text-base">
            Gastos por Categoria
          </h3>
          <p className="text-xs text-zinc-400">
            Execução de pagamentos e distribuição das despesas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Mês de Referência do Painel */}
          {!hideMonthSelector && (
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-1 py-0.5 text-xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
                title="Mês anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <select
                value={refMonth}
                onChange={(e) => selectReferencePeriod(Number(e.target.value), refYear)}
                className="bg-transparent text-zinc-200 font-semibold text-xs px-1 py-0.5 focus:outline-none cursor-pointer"
                title="Selecionar mês de referência"
              >
                {MONTH_SHORT_NAMES.map((mName, idx) => (
                  <option
                    key={mName}
                    value={idx}
                    className="bg-zinc-900 text-zinc-100"
                  >
                    {mName}/{refYear}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
                title="Próximo mês"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            Total: {formatCurrency(totalExpense)}
          </span>

          {onExpandEvolution && (
            <button
              type="button"
              onClick={() => onExpandEvolution(refMonth, refYear)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-rose-400 border border-zinc-700/80 rounded-xl text-xs font-semibold transition"
              title="Expandir evolução de despesas por categoria"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Evolução</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Progresso das Despesas (Pago vs. A Pagar) */}
      <div className={`space-y-1.5 transition-opacity ${loadingCustom ? 'opacity-60' : 'opacity-100'}`}>
        <div className="flex justify-between items-center text-xs">
          <span className="flex items-center gap-1.5 font-medium text-rose-400">
            <TrendingDown className="w-3.5 h-3.5" />
            Despesas ({MONTH_SHORT_NAMES[refMonth]})
            <span className="text-[11px] text-zinc-400 font-normal">
              ({paidExpensePct}% pago)
            </span>
          </span>
          <span className="text-xs font-bold text-zinc-200">
            {formatCurrency(paidExpense)}{' '}
            <span className="text-zinc-500 font-normal">
              / {formatCurrency(totalExpense)}
            </span>
          </span>
        </div>

        <div className="w-full h-3.5 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800 flex gap-0.5">
          {totalExpense > 0 ? (
            <>
              {paidExpensePct > 0 && (
                <div
                  className="h-full bg-rose-400 rounded-full transition-all duration-700 shadow-sm shadow-rose-400/20"
                  style={{ width: `${paidExpensePct}%` }}
                  title={`Pago: ${formatCurrency(paidExpense)} (${paidExpensePct}%)`}
                />
              )}
              {pendingExpensePct > 0 && (
                <div
                  className="h-full bg-amber-500/25 border border-dashed border-amber-400/40 rounded-full transition-all duration-700"
                  style={{ width: `${pendingExpensePct}%` }}
                  title={`A pagar: ${formatCurrency(pendingExpense)} (${pendingExpensePct}%)`}
                />
              )}
            </>
          ) : (
            <div className="h-full w-full bg-zinc-800/40 rounded-full" />
          )}
        </div>
      </div>

      {/* Donut Chart + Legenda de Categorias com Indicador de Média */}
      {totalExpense === 0 || categoryTotals.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center text-zinc-500">
          <PieChart className="w-9 h-9 mb-2 opacity-30 text-zinc-400" />
          <p className="text-sm font-semibold text-zinc-300">
            Sem despesas em {MONTH_SHORT_NAMES[refMonth]}/{refYear}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Lançamentos de despesa aparecerão aqui categorizados.
          </p>
        </div>
      ) : (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-5 pt-1 transition-opacity ${loadingCustom ? 'opacity-60' : 'opacity-100'}`}>
          {/* SVG Donut Chart */}
          <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
            <svg
              className="w-full h-full -rotate-90 transform"
              viewBox="0 0 160 160"
            >
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-zinc-800/80 stroke-current"
                strokeWidth="20"
                fill="transparent"
              />
              {categoryTotals.map((cat, index) => (
                <circle
                  key={index}
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={cat.color}
                  strokeWidth="20"
                  strokeDasharray={cat.strokeDasharray}
                  strokeDashoffset={cat.strokeDashoffset}
                  fill="transparent"
                  className="transition-all duration-500 hover:opacity-80"
                />
              ))}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                Despesas ({MONTH_SHORT_NAMES[refMonth]})
              </span>
              <span className="text-sm font-extrabold text-zinc-100">
                {formatCurrency(totalExpense)}
              </span>
            </div>
          </div>

          {/* Legenda de Categorias */}
          <div className="w-full space-y-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
            {categoryTotals.map((cat, index) => {
              const evo = evolutionMetricsMap.get(cat.name.toLowerCase());
              const hasAvgComparison =
                evo &&
                (evo.averageStatus === 'above' || evo.averageStatus === 'below') &&
                evo.vsAveragePct !== null;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs gap-2 py-0.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium text-zinc-200 truncate">
                      {cat.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasAvgComparison && evo && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          evo.averageStatus === 'above'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        }`}
                        title={`Média mensal desta categoria: ${formatCurrency(evo.monthlyAverage)}`}
                      >
                        {evo.averageStatus === 'above' ? (
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        ) : (
                          <ArrowDownRight className="w-2.5 h-2.5" />
                        )}
                        {evo.averageStatus === 'above' ? '+' : '-'}
                        {Math.round(Math.abs(evo.vsAveragePct || 0))}% média
                      </span>
                    )}

                    <span className="font-bold text-zinc-100">
                      {formatCurrency(cat.total)}
                    </span>
                    <span className="text-[10px] text-zinc-400 w-8 text-right font-semibold">
                      {cat.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
