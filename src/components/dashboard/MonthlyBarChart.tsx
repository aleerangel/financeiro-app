'use client';

import { useMemo } from 'react';
import { Transaction } from '@/types/database';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { calculatePendingProjectedYield } from '@/lib/account-yield-utils';
import {
  CategoryMonthlyEvolutionItem,
  computeCategoryEvolutionMetrics,
} from '@/lib/category-evolution-utils';
import { resolveIncomeCategoryMeta } from '@/lib/business-scope-utils';
import { useReferenceMonthTransactions } from '@/hooks/useReferenceMonthTransactions';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  Sparkles,
  Maximize2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  PieChart,
} from 'lucide-react';

const MONTH_SHORT_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

interface MonthlyBarChartProps {
  transactions: Transaction[];
  accounts?: AccountWithBalance[];
  incomeEvolution?: CategoryMonthlyEvolutionItem[];
  currentMonth?: number;
  year?: number;
  onExpandEvolution?: (refMonth: number, refYear: number) => void;
  hideMonthSelector?: boolean;
  periodLabel?: string;
}

export function MonthlyBarChart({
  transactions,
  accounts = [],
  incomeEvolution = [],
  currentMonth = new Date().getMonth(),
  year = new Date().getFullYear(),
  onExpandEvolution,
  hideMonthSelector = false,
  periodLabel,
}: MonthlyBarChartProps) {
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
    for (const item of incomeEvolution) {
      map.set(
        item.name.toLowerCase(),
        computeCategoryEvolutionMetrics(item, refMonth, 'total', {
          selectedYear: refYear,
        })
      );
    }
    return map;
  }, [incomeEvolution, refMonth, refYear]);

  const {
    receivedIncome,
    pendingIncome,
    totalIncome,
    paidExpense,
    pendingExpense,
    realizedNet,
    projectedNet,
    pendingYield,
    receivedIncomePct,
    pendingIncomePct,
    incomeSegments,
    radius,
  } = useMemo(() => {
    let recInc = 0;
    let pendInc = 0;
    let paidExp = 0;
    let pendExp = 0;

    const incomeMap = new Map<
      string,
      {
        name: string;
        color: string;
        received: number;
        pending: number;
        total: number;
      }
    >();

    for (const t of activeTransactions) {
      const amt = Number(t.amount);
      if (t.type === 'income') {
        if (t.is_paid) {
          recInc += amt;
        } else {
          pendInc += amt;
        }

        const { name: catName, color: catColor } = resolveIncomeCategoryMeta(t);

        const current = incomeMap.get(catName) || {
          name: catName,
          color: catColor,
          received: 0,
          pending: 0,
          total: 0,
        };

        if (t.is_paid) {
          current.received += amt;
        } else {
          current.pending += amt;
        }
        current.total += amt;
        incomeMap.set(catName, current);
      } else if (t.type === 'expense') {
        if (t.is_paid) {
          paidExp += amt;
        } else {
          pendExp += amt;
        }
      }
    }

    const pendingYield = calculatePendingProjectedYield(
      accounts,
      refMonth,
      refYear,
      currentMonth,
      year
    );

    const tIncome = recInc + pendInc;
    const tExpense = paidExp + pendExp;
    const rNet = recInc - paidExp;
    const pNet = tIncome - tExpense + pendingYield;

    const recIncPct =
      tIncome > 0
        ? Math.min(100, Math.max(0, Math.round((recInc / tIncome) * 100)))
        : 0;

    const pendingIncPct = tIncome > 0 ? Math.max(0, 100 - recIncPct) : 0;

    const segments = Array.from(incomeMap.values())
      .map((seg) => ({
        ...seg,
        percentage: tIncome > 0 ? (seg.total / tIncome) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const radius = 60;
    const circumference = 2 * Math.PI * radius;

    const segmentsWithArcs = segments.reduce<{
      acc: number;
      items: (typeof segments[0] & {
        strokeDasharray: string;
        strokeDashoffset: number;
      })[];
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
      receivedIncome: recInc,
      pendingIncome: pendInc,
      totalIncome: tIncome,
      paidExpense: paidExp,
      pendingExpense: pendExp,
      realizedNet: rNet,
      projectedNet: pNet,
      pendingYield,
      receivedIncomePct: recIncPct,
      pendingIncomePct: pendingIncPct,
      incomeSegments: segmentsWithArcs,
      radius,
    };
  }, [activeTransactions, accounts, refMonth, refYear, currentMonth, year]);

  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div>
            <h3 className="font-bold text-zinc-100 text-base">
              Receitas &amp; Balanço Geral
            </h3>
            <p className="text-xs text-zinc-400">
              {periodLabel ? `Composição das entradas por categoria • ${periodLabel}` : 'Composição das entradas por categoria e balanço do mês'}
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

            {(receivedIncome > 0 || paidExpense > 0) && (
              <span
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  realizedNet >= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {realizedNet >= 0
                  ? `+${formatCurrency(realizedNet)} saldo`
                  : `-${formatCurrency(Math.abs(realizedNet))} saldo`}
              </span>
            )}

            {onExpandEvolution && (
              <button
                type="button"
                onClick={() => onExpandEvolution(refMonth, refYear)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700/80 rounded-xl text-xs font-semibold transition"
                title="Expandir evolução de receitas por categoria"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Evolução</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Progresso das Receitas (Recebido vs. A Receber) */}
      <div className={`space-y-1.5 transition-opacity ${loadingCustom ? 'opacity-60' : 'opacity-100'}`}>
        <div className="flex justify-between items-center text-xs">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            Receitas ({periodLabel || MONTH_SHORT_NAMES[refMonth]})
            <span className="text-[11px] text-zinc-400 font-normal">
              ({receivedIncomePct}% recebido)
            </span>
          </span>
          <span className="text-xs font-bold text-zinc-200">
            {formatCurrency(receivedIncome)}{' '}
            <span className="text-zinc-500 font-normal">
              / {formatCurrency(totalIncome)}
            </span>
          </span>
        </div>

        <div className="w-full h-3.5 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800 flex gap-0.5">
          {totalIncome > 0 ? (
            <>
              {receivedIncomePct > 0 && (
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-700 shadow-sm shadow-emerald-400/20"
                  style={{ width: `${receivedIncomePct}%` }}
                  title={`Recebido: ${formatCurrency(receivedIncome)} (${receivedIncomePct}%)`}
                />
              )}
              {pendingIncomePct > 0 && (
                <div
                  className="h-full bg-amber-500/25 border border-dashed border-amber-400/40 rounded-full transition-all duration-700"
                  style={{ width: `${pendingIncomePct}%` }}
                  title={`A receber: ${formatCurrency(pendingIncome)} (${pendingIncomePct}%)`}
                />
              )}
            </>
          ) : (
            <div className="h-full w-full bg-zinc-800/40 rounded-full" />
          )}
        </div>
      </div>

      {/* Donut Chart + Legenda de Categorias com Indicador de Média */}
      {totalIncome === 0 || incomeSegments.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center text-zinc-500">
          <PieChart className="w-9 h-9 mb-2 opacity-30 text-zinc-400" />
          <p className="text-sm font-semibold text-zinc-300">
            Sem receitas em {periodLabel || `${MONTH_SHORT_NAMES[refMonth]}/${refYear}`}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Lançamentos de receita aparecerão aqui categorizados.
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
              {incomeSegments.map((cat, index) => (
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
                Recebido ({periodLabel || MONTH_SHORT_NAMES[refMonth]})
              </span>
              <span className="text-sm font-extrabold text-emerald-400">
                {formatCurrency(receivedIncome)}
              </span>
            </div>
          </div>

          {/* Legenda de Categorias */}
          <div className="w-full space-y-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
            {incomeSegments.map((seg, index) => {
              const evo = evolutionMetricsMap.get(seg.name.toLowerCase());
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
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="font-medium text-zinc-200 truncate">
                      {seg.name}
                    </span>
                    {seg.pending > 0 && (
                      <span className="text-[10px] text-amber-400 font-medium shrink-0">
                        (+{formatCurrency(seg.pending)})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasAvgComparison && evo && (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          evo.averageStatus === 'above'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                        }`}
                        title={
                          evo.isSameDayComparison && evo.comparisonCutoffDay
                            ? `Comparado à média acumulada até o dia ${evo.comparisonCutoffDay} dos outros meses (${formatCurrency(evo.monthlyAverage)})`
                            : `Média mensal desta categoria: ${formatCurrency(evo.monthlyAverage)}`
                        }
                      >
                        {evo.averageStatus === 'above' ? (
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        ) : (
                          <ArrowDownRight className="w-2.5 h-2.5" />
                        )}
                        {evo.averageStatus === 'above' ? '+' : '-'}
                        {Math.round(Math.abs(evo.vsAveragePct || 0))}% média
                        {evo.isSameDayComparison && evo.comparisonCutoffDay
                          ? ` (d.${evo.comparisonCutoffDay})`
                          : ''}
                      </span>
                    )}

                    <span className="font-bold text-zinc-100">
                      {formatCurrency(seg.total)}
                    </span>
                    <span className="text-[10px] text-zinc-400 w-8 text-right font-semibold">
                      {seg.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-indicadores: Balanço Geral (Realizado vs Projeção) */}
      <div className="border-t border-zinc-800/80 pt-3.5 grid grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold block">
            Balanço Realizado ({MONTH_SHORT_NAMES[refMonth]})
          </span>
          <span
            className={`text-base font-bold mt-0.5 block ${
              realizedNet >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {realizedNet >= 0
              ? `+${formatCurrency(realizedNet)}`
              : `-${formatCurrency(Math.abs(realizedNet))}`}
          </span>
          <span className="text-[10px] text-zinc-500 block">
            {formatCurrency(receivedIncome)} entrada − {formatCurrency(paidExpense)} saída
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold block">
            Projeção Final ({MONTH_SHORT_NAMES[refMonth]})
          </span>
          <span
            className={`text-base font-bold mt-0.5 block ${
              projectedNet >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {projectedNet >= 0
              ? `+${formatCurrency(projectedNet)}`
              : `-${formatCurrency(Math.abs(projectedNet))}`}
          </span>
          <span className="text-[10px] text-zinc-500 block">
            {pendingIncome > 0
              ? `+${formatCurrency(pendingIncome)} a receber`
              : 'Tudo recebido'}
            {pendingExpense > 0
              ? ` | -${formatCurrency(pendingExpense)} a pagar`
              : ''}
            {pendingYield > 0
              ? ` | +${formatCurrency(pendingYield)} rendimentos`
              : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
