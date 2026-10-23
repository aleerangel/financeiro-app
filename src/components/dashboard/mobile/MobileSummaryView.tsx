'use client';

import React from 'react';
import {
  TrendingUp,
  PieChart,
  Scissors,
} from 'lucide-react';
import { BusinessDashboardData, GeneralDashboardData, MonthlyGeneralStat } from '@/lib/actions/dashboard';
import { formatCurrency } from '@/lib/utils';
import { useMobileNavigation } from '@/context/MobileNavigationContext';

interface MobileSummaryViewProps {
  businessData: BusinessDashboardData;
  generalData: GeneralDashboardData;
  yearlyStats?: MonthlyGeneralStat[];
  formattedMonth?: string;
  month?: number;
}

export function MobileSummaryView({
  businessData,
  generalData,
  yearlyStats = [],
  month = 0,
}: MobileSummaryViewProps) {
  const { showValues } = useMobileNavigation();

  const formatHidden = (val: string) => (showValues ? val : '••••••');

  // Dados da Barbearia
  const bizSummary = businessData.monthSummary || {
    revenue: 0,
    paidExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    averageTicket: 0,
  };

  const revenueSplit = businessData.revenueSplit || {
    serviceRevenue: 0,
    productRevenue: 0,
    servicePercentage: 0,
    productPercentage: 0,
  };

  // Últimos 6 meses para o gráfico de barras
  const recentStats = yearlyStats.slice(-6);
  const maxMonthlyAmount = Math.max(
    ...recentStats.map((s) =>
      Math.max(s.generalIncome + (s.serviceRevenue || 0), s.generalExpense)
    ),
    100
  );

  // Categorias de despesas no mês
  const topCategories = (generalData.expenseCategoryEvolution || [])
    .map((cat) => ({
      name: cat.name,
      color: cat.color,
      amount: cat.monthlyRealized?.[month] || 0,
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const totalCatExpenses = topCategories.reduce((sum, c) => sum + c.amount, 0) || 1;

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Evolução Mensal (Últimos 6 meses) */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Evolução dos Últimos Meses
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Entradas
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Saídas
            </span>
          </div>
        </div>

        {recentStats.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6">
            Sem dados históricos suficientes.
          </p>
        ) : (
          <div className="pt-2">
            <div className="flex items-end justify-between gap-2 h-32 pt-4 px-1">
              {recentStats.map((stat, idx) => {
                const totalIncome = stat.generalIncome + (stat.serviceRevenue || 0);
                const totalExpense = stat.generalExpense;

                const incomeHeight = Math.max(
                  8,
                  Math.round((totalIncome / maxMonthlyAmount) * 100)
                );
                const expenseHeight = Math.max(
                  8,
                  Math.round((totalExpense / maxMonthlyAmount) * 100)
                );

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="flex items-end gap-1 w-full justify-center h-24">
                      {/* Barra Entrada */}
                      <div
                        style={{ height: `${incomeHeight}%` }}
                        className="w-2.5 sm:w-3 bg-emerald-500 rounded-t-sm transition-all duration-300"
                        title={`Entradas: ${formatCurrency(totalIncome)}`}
                      />
                      {/* Barra Saída */}
                      <div
                        style={{ height: `${expenseHeight}%` }}
                        className="w-2.5 sm:w-3 bg-rose-500/80 rounded-t-sm transition-all duration-300"
                        title={`Saídas: ${formatCurrency(totalExpense)}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[36px]">
                      {stat.monthLabel ? stat.monthLabel.slice(0, 3) : `M${idx + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Barbearia: Divisão de Faturamento (Serviços x Produtos) */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Divisão de Faturamento • Barbearia
            </h3>
          </div>
          <span className="text-xs font-extrabold text-emerald-400">
            {formatHidden(formatCurrency(bizSummary.revenue))}
          </span>
        </div>

        {/* Barra de Progresso Dupla */}
        <div className="w-full h-3 bg-zinc-800 rounded-full flex overflow-hidden">
          <div
            style={{ width: `${revenueSplit.servicePercentage}%` }}
            className="bg-emerald-500 h-full transition-all duration-300"
            title={`Serviços: ${revenueSplit.servicePercentage}%`}
          />
          <div
            style={{ width: `${revenueSplit.productPercentage}%` }}
            className="bg-blue-500 h-full transition-all duration-300"
            title={`Produtos: ${revenueSplit.productPercentage}%`}
          />
        </div>

        {/* Legenda de Valores */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Serviços ({Math.round(revenueSplit.servicePercentage)}%)</span>
            </div>
            <span className="text-xs font-extrabold text-zinc-200 block mt-1">
              {formatHidden(formatCurrency(revenueSplit.serviceRevenue))}
            </span>
          </div>

          <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-1.5 text-blue-400 text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span>Produtos ({Math.round(revenueSplit.productPercentage)}%)</span>
            </div>
            <span className="text-xs font-extrabold text-zinc-200 block mt-1">
              {formatHidden(formatCurrency(revenueSplit.productRevenue))}
            </span>
          </div>
        </div>

        {/* Indicadores complementares */}
        <div className="pt-1 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/80">
          <span>Ticket Médio por Atendimento:</span>
          <strong className="text-zinc-200">{formatHidden(formatCurrency(bizSummary.averageTicket))}</strong>
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Margem de Lucro:</span>
          <strong className="text-emerald-400">{Math.round(bizSummary.profitMargin)}%</strong>
        </div>
      </div>

      {/* 3. Despesas por Categoria */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Maiores Gastos por Categoria
          </h3>
        </div>

        {topCategories.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">
            Nenhuma despesa registrada no mês.
          </p>
        ) : (
          <div className="space-y-3 pt-1">
            {topCategories.slice(0, 5).map((cat, idx) => {
              const pct = Math.min(100, Math.round((cat.amount / totalCatExpenses) * 100));

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-200">{cat.name}</span>
                    <span className="text-zinc-400 font-bold">
                      {formatHidden(formatCurrency(cat.amount))} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%`, backgroundColor: cat.color || '#f43f5e' }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
