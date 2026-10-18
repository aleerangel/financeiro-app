'use client';

import { useMemo } from 'react';
import { Transaction } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

interface MonthlyBarChartProps {
  transactions: Transaction[];
}

export function MonthlyBarChart({ transactions }: MonthlyBarChartProps) {
  const {
    receivedIncome,
    pendingIncome,
    totalIncome,
    paidExpense,
    pendingExpense,
    totalExpense,
    realizedNet,
    projectedNet,
    receivedIncomePct,
    pendingIncomePct,
    paidExpensePct,
    pendingExpensePct,
  } = useMemo(() => {
    let recInc = 0;
    let pendInc = 0;
    let paidExp = 0;
    let pendExp = 0;

    for (const t of transactions) {
      const amt = Number(t.amount);
      if (t.type === 'income') {
        if (t.is_paid) {
          recInc += amt;
        } else {
          pendInc += amt;
        }
      } else if (t.type === 'expense') {
        if (t.is_paid) {
          paidExp += amt;
        } else {
          pendExp += amt;
        }
      }
    }

    const tIncome = recInc + pendInc;
    const tExpense = paidExp + pendExp;
    const rNet = recInc - paidExp;
    const pNet = tIncome - tExpense;

    const recIncPct = tIncome > 0 ? Math.min(100, Math.max(0, Math.round((recInc / tIncome) * 100))) : 0;
    const pendIncPct = tIncome > 0 ? Math.max(0, 100 - recIncPct) : 0;

    const paidExpPct = tExpense > 0 ? Math.min(100, Math.max(0, Math.round((paidExp / tExpense) * 100))) : 0;
    const pendExpPct = tExpense > 0 ? Math.max(0, 100 - paidExpPct) : 0;

    return {
      receivedIncome: recInc,
      pendingIncome: pendInc,
      totalIncome: tIncome,
      paidExpense: paidExp,
      pendingExpense: pendExp,
      totalExpense: tExpense,
      realizedNet: rNet,
      projectedNet: pNet,
      receivedIncomePct: recIncPct,
      pendingIncomePct: pendIncPct,
      paidExpensePct: paidExpPct,
      pendingExpensePct: pendExpPct,
    };
  }, [transactions]);

  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-zinc-100 text-base">Receitas vs. Despesas</h3>
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
                ? `+${formatCurrency(realizedNet)} saldo atual`
                : `-${formatCurrency(Math.abs(realizedNet))} saldo atual`}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400">Fluxo realizado e previsão do mês</p>
      </div>

      {/* Barras de Comparação com Segmentação Real */}
      <div className="space-y-4 py-2">
        {/* Barra de Receitas */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              Receitas
              <span className="text-[11px] text-zinc-400 font-normal">
                ({receivedIncomePct}% recebido)
              </span>
            </span>
            <span className="text-xs font-bold text-zinc-200">
              {formatCurrency(receivedIncome)}{' '}
              <span className="text-zinc-500 font-normal">/ {formatCurrency(totalIncome)}</span>
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
                    className="h-full bg-emerald-500/25 border border-dashed border-emerald-400/40 rounded-full transition-all duration-700"
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

        {/* Barra de Despesas */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 font-medium text-rose-400">
              <TrendingDown className="w-3.5 h-3.5" />
              Despesas
              <span className="text-[11px] text-zinc-400 font-normal">
                ({paidExpensePct}% pago)
              </span>
            </span>
            <span className="text-xs font-bold text-zinc-200">
              {formatCurrency(paidExpense)}{' '}
              <span className="text-zinc-500 font-normal">/ {formatCurrency(totalExpense)}</span>
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
      </div>

      {/* Sub-indicadores: Realizado vs Projeção */}
      <div className="border-t border-zinc-800/80 pt-3.5 grid grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold block">
            Saldo Atual Realizado
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
            {formatCurrency(receivedIncome)} em caixa − {formatCurrency(paidExpense)} pago
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold block">
            Projeção Final do Mês
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
              : 'Sem receitas a receber'}
            {pendingExpense > 0 ? ` | -${formatCurrency(pendingExpense)} a pagar` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
