'use client';

import { useMemo } from 'react';
import { Transaction } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { PieChart } from 'lucide-react';

interface CategoryDonutChartProps {
  transactions: Transaction[];
}

interface CategoryTotal {
  name: string;
  color: string;
  total: number;
  percentage: number;
  strokeDasharray: string;
  strokeDashoffset: number;
}

export function CategoryDonutChart({ transactions }: CategoryDonutChartProps) {
  const { categoryTotals, totalExpense, radius } = useMemo(() => {
    const expenseTxs = transactions.filter((t) => t.type === 'expense');
    const total = expenseTxs.reduce((acc, curr) => acc + Number(curr.amount), 0);

    const map = new Map<string, { name: string; color: string; total: number }>();

    for (const t of expenseTxs) {
      const catName = t.category?.name || 'Outras Despesas';
      const catColor = t.category?.color || '#64748b';
      const current = map.get(catName) || { name: catName, color: catColor, total: 0 };
      current.total += Number(t.amount);
      map.set(catName, current);
    }

    const totals = Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: total > 0 ? (item.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const radius = 64;
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

    return { categoryTotals: totalsWithArcs, totalExpense: total, radius };
  }, [transactions]);

  if (totalExpense === 0 || categoryTotals.length === 0) {
    return (
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center min-h-[300px] text-center text-zinc-500">
        <PieChart className="w-10 h-10 mb-2 opacity-30 text-zinc-400" />
        <p className="text-sm font-semibold text-zinc-300">Sem despesas no mês</p>
        <p className="text-xs text-zinc-500 mt-1">
          Lançamentos de despesa aparecerão aqui categorizados.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-zinc-100 text-base">Gastos por Categoria</h3>
          <p className="text-xs text-zinc-400">Distribuição percentual das despesas</p>
        </div>
        <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
          Total: {formatCurrency(totalExpense)}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* SVG Donut Chart */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
            {/* Círculo de fundo */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              className="text-zinc-800/80 stroke-current"
              strokeWidth="20"
              fill="transparent"
            />
            {/* Segmentos de categoria */}
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

          {/* Centro do Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
              Despesas
            </span>
            <span className="text-sm font-extrabold text-zinc-100">
              {formatCurrency(totalExpense)}
            </span>
          </div>
        </div>

        {/* Legenda de Categorias */}
        <div className="w-full space-y-2.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
          {categoryTotals.map((cat, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="font-medium text-zinc-200 truncate">{cat.name}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-zinc-100">{formatCurrency(cat.total)}</span>
                <span className="text-[10px] text-zinc-400 w-9 text-right font-semibold">
                  {cat.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
