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
}

export function MonthlyBarChart({
  transactions,
  accounts = [],
  incomeEvolution = [],
  currentMonth = new Date().getMonth(),
  year = new Date().getFullYear(),
  onExpandEvolution,
  hideMonthSelector = false,
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
    incomeSegments,
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

    const segments = Array.from(incomeMap.values())
      .map((seg) => ({
        ...seg,
        percentage: tIncome > 0 ? (seg.total / tIncome) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

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
      incomeSegments: segments,
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
              Composição das entradas por categoria e balanço do mês
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

      {/* Composição de Receitas por Categoria */}
      <div className={`space-y-3 py-1 transition-opacity ${loadingCustom ? 'opacity-60' : 'opacity-100'}`}>
        <div className="flex justify-between items-center text-xs">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            Receitas ({MONTH_SHORT_NAMES[refMonth]})
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

        {/* Barra multi-cores de Receitas */}
        <div className="w-full h-4 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800 flex gap-1">
          {totalIncome > 0 ? (
            incomeSegments.map((seg) => (
              <div
                key={seg.name}
                className="h-full rounded-full transition-all duration-700 shadow-sm relative group"
                style={{
                  width: `${seg.percentage}%`,
                  backgroundColor: seg.color,
                }}
                title={`${seg.name}: ${formatCurrency(seg.total)} (${seg.percentage.toFixed(0)}%)\nRecebido: ${formatCurrency(seg.received)}${seg.pending > 0 ? ` | A receber: ${formatCurrency(seg.pending)}` : ''}`}
              />
            ))
          ) : (
            <div className="h-full w-full bg-zinc-800/40 rounded-full" />
          )}
        </div>

        {/* Lista de Categorias de Receita com Indicador Acima/Abaixo da Média */}
        {incomeSegments.length > 0 ? (
          <div className="space-y-2 pt-1 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
            {incomeSegments.map((seg) => {
              const evo = evolutionMetricsMap.get(seg.name.toLowerCase());
              const hasAvgComparison =
                evo &&
                (evo.averageStatus === 'above' || evo.averageStatus === 'below') &&
                evo.vsAveragePct !== null;

              return (
                <div
                  key={seg.name}
                  className="flex items-center justify-between text-xs gap-2 py-1 border-b border-zinc-800/50 last:border-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="font-semibold text-zinc-200 truncate">
                      {seg.name}
                    </span>
                    {seg.pending > 0 && (
                      <span className="text-[10px] text-amber-400 font-medium shrink-0">
                        (+{formatCurrency(seg.pending)} a receber)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
        ) : (
          <p className="text-xs text-zinc-500 py-2">
            Nenhuma receita registrada em {MONTH_SHORT_NAMES[refMonth]}/{refYear}.
          </p>
        )}
      </div>

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
