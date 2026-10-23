'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp,
  Scissors,
  Users,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
} from 'lucide-react';
import {
  BusinessDashboardData,
  GeneralDashboardData,
  MonthlyGeneralStat,
  PeriodStat,
} from '@/lib/actions/dashboard';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { Transaction } from '@/types/database';
import { isBarbeariaServiceIncome } from '@/lib/business-scope-utils';
import { formatCurrency } from '@/lib/utils';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { MonthlyBarChart } from '../MonthlyBarChart';
import { CategoryDonutChart } from '../CategoryDonutChart';

const CategoryEvolutionModal = dynamic(
  () => import('../CategoryEvolutionModal').then((m) => m.CategoryEvolutionModal),
  { ssr: false }
);

interface MobileSummaryViewProps {
  businessData: BusinessDashboardData;
  generalData: GeneralDashboardData;
  yearlyStats?: MonthlyGeneralStat[];
  formattedMonth?: string;
  month?: number;
  year?: number;
  transactions?: Transaction[];
  accounts?: AccountWithBalance[];
}

type PeriodMode = 'yearly' | 'monthly' | 'weekly';

export function MobileSummaryView({
  businessData,
  generalData,
  yearlyStats = [],
  formattedMonth = '',
  month = new Date().getMonth(),
  year = new Date().getFullYear(),
  transactions = [],
  accounts = [],
}: MobileSummaryViewProps) {
  const { showValues } = useMobileNavigation();
  const formatHidden = (val: string) => (showValues ? val : '••••••');

  // Estado do Modal de Evolução por Categoria (quando clicar em Expandir no gráfico da web)
  const [evolutionModalState, setEvolutionModalState] = useState<{
    type: 'income' | 'expense';
    refMonth: number;
    refYear: number;
  } | null>(null);

  // Controle de Granularidade Temporal
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(
    generalData.defaultWeekIndex ?? 0
  );

  // 1. CARDS DO TOPO: RECEITAS E DESPESAS (REALIZADO + PREVISTO COM O QUE AINDA FALTA)
  const {
    receivedIncome,
    pendingIncome,
    totalIncome,
    paidExpense,
    pendingExpense,
    totalExpense,
  } = useMemo(() => {
    let recInc = 0;
    let pendInc = 0;
    let pdExp = 0;
    let pendExp = 0;

    if (transactions.length > 0) {
      for (const t of transactions) {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') {
          if (t.is_paid) {
            recInc += amt;
          } else {
            pendInc += amt;
          }
        } else if (t.type === 'expense') {
          if (t.is_paid) {
            pdExp += amt;
          } else {
            pendExp += amt;
          }
        }
      }
    } else {
      // Fallback em dados resumidos se transactions ainda não tiver carregado
      const curYearStat = yearlyStats[month] || generalData.yearlyStats?.[month];
      recInc = (curYearStat?.serviceRevenue || 0) + (curYearStat?.generalIncome || 0);
      pdExp = curYearStat?.generalExpense || 0;
      pendExp = businessData.monthSummary?.pendingExpenses || 0;
    }

    return {
      receivedIncome: recInc,
      pendingIncome: pendInc,
      totalIncome: recInc + pendInc,
      paidExpense: pdExp,
      pendingExpense: pendExp,
      totalExpense: pdExp + pendExp,
    };
  }, [transactions, yearlyStats, generalData.yearlyStats, month, businessData.monthSummary]);

  // 2. DADOS DO PERÍODO SELECIONADO PARA O GRÁFICO DE EVOLUÇÃO
  const currentChartStats: PeriodStat[] = useMemo(() => {
    if (periodMode === 'yearly') {
      return yearlyStats.length > 0 ? yearlyStats : (generalData.yearlyStats || []);
    }
    if (periodMode === 'monthly') {
      // monthlyStats são as semanas do mês ("Sem 1", "Sem 2", etc.)
      return (generalData.monthlyStats || []).map((s, idx) => ({
        ...s,
        label: `Semana ${idx + 1}`,
      }));
    }
    // weekly (dias da semana selecionada)
    const weekStats = generalData.weeklyStatsByWeek?.[selectedWeekIndex];
    return weekStats && weekStats.length > 0 ? weekStats : [];
  }, [periodMode, yearlyStats, generalData, selectedWeekIndex]);

  // Totais do período ativo
  const periodTotals = useMemo(() => {
    const income = currentChartStats.reduce(
      (sum, s) => sum + (s.generalIncome || 0) + (s.serviceRevenue || 0),
      0
    );
    const expense = currentChartStats.reduce(
      (sum, s) => sum + (s.generalExpense || 0),
      0
    );
    const balance = income - expense;
    return { income, expense, balance };
  }, [currentChartStats]);

  const maxChartValue = useMemo(() => {
    return Math.max(
      ...currentChartStats.map((s) =>
        Math.max((s.generalIncome || 0) + (s.serviceRevenue || 0), s.generalExpense || 0)
      ),
      100
    );
  }, [currentChartStats]);

  // 3. DIAS MAIS FORTES DA BARBEARIA NO MÊS (CÁLCULO PRECISO)
  const strongDaysStats = useMemo(() => {
    const dayTotals: Record<string, number> = {
      Seg: 0,
      Ter: 0,
      Qua: 0,
      Qui: 0,
      Sex: 0,
      Sáb: 0,
      Dom: 0,
    };

    const fullNames: Record<string, string> = {
      Seg: 'Segunda',
      Ter: 'Terça',
      Qua: 'Quarta',
      Qui: 'Quinta',
      Sex: 'Sexta',
      Sáb: 'Sábado',
      Dom: 'Domingo',
    };

    // 1. Somar de weeklyStatsByWeek (todas as semanas do mês)
    Object.values(businessData.weeklyStatsByWeek || {}).forEach((weekDays) => {
      weekDays.forEach((stat) => {
        if (stat.label && dayTotals[stat.label] !== undefined) {
          dayTotals[stat.label] += stat.revenue || 0;
        }
      });
    });

    // 2. Se por ventura weeklyStatsByWeek não somar nada, calcular via transações da barbearia
    const totalRevFromWeeks = Object.values(dayTotals).reduce((a, b) => a + b, 0);
    if (totalRevFromWeeks === 0 && transactions && transactions.length > 0) {
      const bizTxs = transactions.filter((t) => t.is_paid && isBarbeariaServiceIncome(t));
      bizTxs.forEach((t) => {
        if (t.due_date) {
          const parts = t.due_date.split('-');
          if (parts.length === 3) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12);
            const dowLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const label = dowLabels[d.getDay()];
            if (dayTotals[label] !== undefined) {
              dayTotals[label] += Number(t.amount);
            }
          }
        }
      });
    }

    const totalRev = Object.values(dayTotals).reduce((a, b) => a + b, 0) || 1;

    return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
      .map((code) => ({
        code,
        fullName: fullNames[code],
        revenue: dayTotals[code] || 0,
        percentage: Math.round(((dayTotals[code] || 0) / totalRev) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [businessData.weeklyStatsByWeek, transactions]);

  // Dados da Barbearia
  const bizSummary = businessData.monthSummary || {
    revenue: 0,
    paidExpenses: 0,
    pendingExpenses: 0,
    totalExpenses: 0,
    netProfit: 0,
    projectedProfit: 0,
    profitMargin: 0,
    averageTicket: 0,
  };

  const revenueSplit = businessData.revenueSplit || {
    serviceRevenue: 0,
    productRevenue: 0,
    servicePercentage: 0,
    productPercentage: 0,
    serviceCount: 0,
    productCount: 0,
  };

  return (
    <div className="space-y-5 pb-16">
      {/* 1. CARDS DO TOPO: RECEITAS E DESPESAS (REALIZADO + PREVISTO COM O QUE AINDA FALTA) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card Receita */}
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Receita Atual
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-emerald-400">
              {formatHidden(formatCurrency(receivedIncome))}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
              {pendingIncome > 0
                ? `+ ${formatHidden(formatCurrency(pendingIncome))} a receber (previsto: ${formatHidden(formatCurrency(totalIncome))})`
                : '100% recebido no mês'}
            </p>
          </div>
        </div>

        {/* Card Despesas */}
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              Despesas Pagas
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-rose-400">
              {formatHidden(formatCurrency(paidExpense))}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
              {pendingExpense > 0
                ? `+ ${formatHidden(formatCurrency(pendingExpense))} a pagar (previsto: ${formatHidden(formatCurrency(totalExpense))})`
                : 'Todas as contas pagas'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. SELETOR DE PERÍODO & GRÁFICO DE EVOLUÇÃO */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3.5">
        {/* Seletor Anual / Mensal / Semanal */}
        <div className="p-1 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPeriodMode('monthly')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              periodMode === 'monthly'
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode('yearly')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              periodMode === 'yearly'
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Anual
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode('weekly')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              periodMode === 'weekly'
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Semanal
          </button>
        </div>

        {/* Seletor de Semanas quando modo Semanal estiver ativo */}
        {periodMode === 'weekly' && generalData.weeksMeta && generalData.weeksMeta.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {generalData.weeksMeta.map((week) => {
              const isSelected = selectedWeekIndex === week.index;
              return (
                <button
                  key={week.index}
                  type="button"
                  onClick={() => setSelectedWeekIndex(week.index)}
                  className={`flex-shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                    isSelected
                      ? 'bg-zinc-800 border-emerald-500/50 text-emerald-400'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {week.shortLabel || week.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Cabeçalho do Gráfico */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              {periodMode === 'monthly' && `Evolução Mensal • ${formattedMonth || 'Mês Atual'}`}
              {periodMode === 'yearly' && `Evolução Anual • ${year}`}
              {periodMode === 'weekly' && 'Evolução Semanal • Dias da Semana'}
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

        {/* Totais do Período */}
        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
          <div>
            <span className="text-[10px] text-zinc-400 block">Entradas</span>
            <span className="text-xs font-bold text-emerald-400">
              {formatHidden(formatCurrency(periodTotals.income))}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 block">Saídas</span>
            <span className="text-xs font-bold text-rose-400">
              {formatHidden(formatCurrency(periodTotals.expense))}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 block">Balanço</span>
            <span
              className={`text-xs font-black ${
                periodTotals.balance >= 0 ? 'text-zinc-100' : 'text-rose-400'
              }`}
            >
              {formatHidden(formatCurrency(periodTotals.balance))}
            </span>
          </div>
        </div>

        {/* Barras do Gráfico (Perfeitamente dimensionadas, sem excesso de espaço) */}
        {currentChartStats.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-6">
            Nenhum dado financeiro encontrado para este período.
          </p>
        ) : (
          <div className="pt-2">
            <div className="flex items-end justify-between gap-1.5 h-32 pt-4 px-1 w-full">
              {currentChartStats.map((stat, idx) => {
                const totalInc = (stat.generalIncome || 0) + (stat.serviceRevenue || 0);
                const totalExp = stat.generalExpense || 0;

                const incomeHeight = Math.max(
                  6,
                  Math.round((totalInc / maxChartValue) * 100)
                );
                const expenseHeight = Math.max(
                  6,
                  Math.round((totalExp / maxChartValue) * 100)
                );

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                  >
                    <div className="flex items-end gap-1 w-full justify-center h-22">
                      {/* Barra Entrada */}
                      <div
                        style={{ height: `${incomeHeight}%` }}
                        className="w-3 max-w-[14px] bg-emerald-500 rounded-t-sm transition-all duration-300"
                        title={`Entradas: ${formatCurrency(totalInc)}`}
                      />
                      {/* Barra Saída */}
                      <div
                        style={{ height: `${expenseHeight}%` }}
                        className="w-3 max-w-[14px] bg-rose-500/85 rounded-t-sm transition-all duration-300"
                        title={`Saídas: ${formatCurrency(totalExp)}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[42px] text-center">
                      {stat.label || `P${idx + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. MÓDULOS COMPLETOS DA VERSÃO WEB DE ENTRADAS E SAÍDAS POR CATEGORIAS */}
      {/* Módulo de Entradas por Categoria */}
      <MonthlyBarChart
        transactions={transactions}
        accounts={accounts}
        incomeEvolution={generalData?.incomeCategoryEvolution || []}
        currentMonth={month}
        year={year}
        onExpandEvolution={(refMonth, refYear) =>
          setEvolutionModalState({ type: 'income', refMonth, refYear })
        }
      />

      {/* Módulo de Saídas por Categoria (Donut Chart) */}
      <CategoryDonutChart
        transactions={transactions}
        expenseEvolution={generalData?.expenseCategoryEvolution || []}
        currentMonth={month}
        year={year}
        onExpandEvolution={(refMonth, refYear) =>
          setEvolutionModalState({ type: 'expense', refMonth, refYear })
        }
      />

      {/* 4. INTELIGÊNCIA OPERACIONAL DA BARBEARIA */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Inteligência da Barbearia
            </h3>
          </div>
          <span className="text-xs font-extrabold text-emerald-400">
            {formatHidden(formatCurrency(bizSummary.revenue))}
          </span>
        </div>

        {/* Divisão Serviços vs Produtos */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Divisão de Receitas</span>
            <span className="font-semibold text-zinc-300">
              {Math.round(revenueSplit.servicePercentage)}% Serviços •{' '}
              {Math.round(revenueSplit.productPercentage)}% Produtos
            </span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full flex overflow-hidden">
            <div
              style={{ width: `${revenueSplit.servicePercentage}%` }}
              className="bg-emerald-500 h-full transition-all duration-300"
            />
            <div
              style={{ width: `${revenueSplit.productPercentage}%` }}
              className="bg-blue-500 h-full transition-all duration-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 block">Serviços</span>
                <span className="text-xs font-extrabold text-zinc-200">
                  {formatHidden(formatCurrency(revenueSplit.serviceRevenue))}
                </span>
              </div>
              <Scissors className="w-4 h-4 text-emerald-500/50" />
            </div>
            <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-400 block">Produtos</span>
                <span className="text-xs font-extrabold text-zinc-200">
                  {formatHidden(formatCurrency(revenueSplit.productRevenue))}
                </span>
              </div>
              <ShoppingBag className="w-4 h-4 text-blue-500/50" />
            </div>
          </div>
        </div>

        {/* Dias Mais Fortes no Mês */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              Dias Mais Fortes no Mês
            </span>
            <span className="text-[10px] text-zinc-400 uppercase">Receita no dia</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {strongDaysStats.slice(0, 4).map((day, idx) => (
              <div
                key={day.code}
                className="p-2 bg-zinc-950/60 rounded-xl border border-zinc-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-zinc-200">{day.fullName}</span>
                    <span className="text-[10px] font-bold text-emerald-400">
                      {day.percentage}%
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-zinc-400">
                    {formatHidden(formatCurrency(day.revenue))}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-400">
                  #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 3 Clientes do Mês */}
        {businessData.topClients && businessData.topClients.length > 0 && (
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                Clientes Mais Frequentes
              </span>
              <span className="text-[10px] text-zinc-400">Visitas & Total</span>
            </div>

            <div className="space-y-1.5">
              {businessData.topClients.slice(0, 3).map((client, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-zinc-950/60 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-zinc-200 truncate max-w-[140px]">
                      {client.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 block">
                      {formatHidden(formatCurrency(client.totalSpent))}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {client.visitsCount} {client.visitsCount === 1 ? 'visita' : 'visitas'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Evolução por Categoria (quando aberto) */}
      <CategoryEvolutionModal
        isOpen={evolutionModalState !== null}
        onClose={() => setEvolutionModalState(null)}
        type={evolutionModalState?.type || 'expense'}
        categories={
          evolutionModalState?.type === 'income'
            ? generalData?.incomeCategoryEvolution || []
            : generalData?.expenseCategoryEvolution || []
        }
        transactions={transactions}
        currentMonth={evolutionModalState?.refMonth ?? month}
        year={evolutionModalState?.refYear ?? year}
        formattedMonth={formattedMonth}
      />
    </div>
  );
}
