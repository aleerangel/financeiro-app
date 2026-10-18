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
    savingsRate,
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
    const realizedNet = recInc - paidExp;
    const rate = recInc > 0 ? (realizedNet / recInc) * 100 : 0;

    return {
      receivedIncome: recInc,
      pendingIncome: pendInc,
      totalIncome: tIncome,
      paidExpense: paidExp,
      pendingExpense: pendExp,
      totalExpense: tExpense,
      savingsRate: Math.max(-100, Math.min(100, rate)),
    };
  }, [transactions]);

  const maxVal = Math.max(totalIncome, totalExpense, 1);
  const incomeWidth = Math.round((totalIncome / maxVal) * 100);
  const expenseWidth = Math.round((totalExpense / maxVal) * 100);

  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-zinc-100 text-base">Receitas vs. Despesas</h3>
          {receivedIncome > 0 && (
            <span
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                savingsRate >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              {savingsRate >= 0
                ? `${savingsRate.toFixed(0)}% de economia realizada`
                : `${Math.abs(savingsRate).toFixed(0)}% de déficit realizado`}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400">Comparativo financeiro mensal</p>
      </div>

      {/* Barras de Comparação */}
      <div className="space-y-4 py-2">
        {/* Barra de Receitas */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              Receitas (Recebido: {formatCurrency(receivedIncome)})
            </span>
            <span className="font-bold text-zinc-300">
              Total: {formatCurrency(totalIncome)}
            </span>
          </div>
          <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-700 shadow-sm shadow-emerald-400/20"
              style={{ width: `${incomeWidth}%` }}
            />
          </div>
        </div>

        {/* Barra de Despesas */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 font-medium text-rose-400">
              <TrendingDown className="w-3.5 h-3.5" />
              Despesas (Pago: {formatCurrency(paidExpense)})
            </span>
            <span className="font-bold text-zinc-300">
              Total: {formatCurrency(totalExpense)}
            </span>
          </div>
          <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
            <div
              className="h-full bg-rose-400 rounded-full transition-all duration-700 shadow-sm shadow-rose-400/20"
              style={{ width: `${expenseWidth}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sub-indicadores de Realizado vs Previsto */}
      <div className="border-t border-zinc-800/80 pt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
            A Receber (Previsão)
          </span>
          <span className="font-semibold text-emerald-400/90 mt-0.5 block">
            {formatCurrency(pendingIncome)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-amber-500/80 uppercase tracking-wider block">
            A Pagar (Previsão)
          </span>
          <span className="font-semibold text-amber-400 mt-0.5 block">
            {formatCurrency(pendingExpense)}
          </span>
        </div>
      </div>
    </div>
  );
}
