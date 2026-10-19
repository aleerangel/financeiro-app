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
    paidExpensePct,
    pendingExpensePct,
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

    for (const t of transactions) {
      const amt = Number(t.amount);
      if (t.type === 'income') {
        if (t.is_paid) {
          recInc += amt;
        } else {
          pendInc += amt;
        }

        // Identifica se a receita veio de Atendimentos / Barbearia
        const isBarber =
          t.description.startsWith('Atendimento:') ||
          Boolean(t.notes?.includes('Atendimento')) ||
          Boolean(t.notes?.includes('Comanda:')) ||
          Boolean(t.category?.name?.toLowerCase().includes('barbearia')) ||
          Boolean(t.category?.name?.toLowerCase().includes('serviço'));

        const catName = isBarber ? 'Barbearia (Serviços)' : (t.category?.name || 'Outras Receitas');
        const catColor = isBarber ? '#10b981' : (t.category?.color || '#3b82f6');

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

    const tIncome = recInc + pendInc;
    const tExpense = paidExp + pendExp;
    const rNet = recInc - paidExp;
    const pNet = tIncome - tExpense;

    const recIncPct = tIncome > 0 ? Math.min(100, Math.max(0, Math.round((recInc / tIncome) * 100))) : 0;
    const paidExpPct = tExpense > 0 ? Math.min(100, Math.max(0, Math.round((paidExp / tExpense) * 100))) : 0;
    const pendExpPct = tExpense > 0 ? Math.max(0, 100 - paidExpPct) : 0;

    const segments = Array.from(incomeMap.values())
      .map((seg) => ({
        ...seg,
        percentage: tIncome > 0 ? (seg.total / tIncome) * 100 : 0,
      }))
      .sort((a, b) => {
        // Barbearia primeiro, depois por valor decrescente
        if (a.name.includes('Barbearia')) return -1;
        if (b.name.includes('Barbearia')) return 1;
        return b.total - a.total;
      });

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
      paidExpensePct: paidExpPct,
      pendingExpensePct: pendExpPct,
      incomeSegments: segments,
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
        <p className="text-xs text-zinc-400">Fluxo realizado e composição por categoria</p>
      </div>

      {/* Barras de Comparação com Cores por Categoria */}
      <div className="space-y-4 py-2">
        {/* Barra de Receitas com Divisão por Categoria */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              Receitas (Composição)
              <span className="text-[11px] text-zinc-400 font-normal">
                ({receivedIncomePct}% recebido)
              </span>
            </span>
            <span className="text-xs font-bold text-zinc-200">
              {formatCurrency(receivedIncome)}{' '}
              <span className="text-zinc-500 font-normal">/ {formatCurrency(totalIncome)}</span>
            </span>
          </div>

          {/* Barra multi-cores */}
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

          {/* Legenda com Barbearia vs Outras Receitas */}
          {incomeSegments.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs">
              {incomeSegments.map((seg) => (
                <div key={seg.name} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="font-semibold text-zinc-200">{seg.name}:</span>
                  <span className="font-bold text-zinc-100">{formatCurrency(seg.total)}</span>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    ({seg.percentage.toFixed(0)}%)
                  </span>
                  {seg.pending > 0 && (
                    <span className="text-[10px] text-amber-400 font-medium">
                      ({formatCurrency(seg.pending)} a receber)
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Barra de Despesas */}
        <div className="space-y-2 pt-1">
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
