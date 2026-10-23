'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp,
  Scissors,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  BusinessDashboardData,
  GeneralDashboardData,
  MonthlyGeneralStat,
  getGeneralDashboardData,
} from '@/lib/actions/dashboard';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { Transaction } from '@/types/database';
import { isBarbeariaServiceIncome } from '@/lib/business-scope-utils';
import { formatCurrency } from '@/lib/utils';
import { useDateContext } from '@/context/DateContext';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { MonthlyBarChart } from '../MonthlyBarChart';
import { CategoryDonutChart } from '../CategoryDonutChart';
import { SmoothLineChart, ChartSeries } from '../SmoothLineChart';
import { useIndependentChartPeriod } from '../ChartPeriodToolbar';

const CategoryEvolutionModal = dynamic(
  () => import('../CategoryEvolutionModal').then((m) => m.CategoryEvolutionModal),
  { ssr: false }
);

const MONTH_FULL_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

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

export function MobileSummaryView({
  businessData,
  generalData,
  yearlyStats = [],
  month = new Date().getMonth(),
  year = new Date().getFullYear(),
  transactions = [],
  accounts = [],
}: MobileSummaryViewProps) {
  const { showValues, setShowValues } = useMobileNavigation();
  const { setMonthYear } = useDateContext();
  const formatHidden = (val: string) => (showValues ? val : '••••••');

  // 1. MOTOR NATIVO WEB DE EVOLUÇÃO (Inicializado com 'monthly' como default)
  const flowChart = useIndependentChartPeriod(
    year,
    month,
    generalData,
    yearlyStats,
    getGeneralDashboardData
  );

  // Garante que o modo inicial seja 'monthly' (Mensal como default)
  useEffect(() => {
    if (flowChart.period !== 'monthly') {
      flowChart.setPeriod('monthly');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navegação unificada pelo seletor único do topo
  const handlePrevPeriod = () => {
    if (flowChart.period === 'monthly') {
      const newMonth = flowChart.month === 0 ? 11 : flowChart.month - 1;
      const newYear = flowChart.month === 0 ? flowChart.year - 1 : flowChart.year;
      flowChart.handleMonthChange(newMonth, newYear);
      setMonthYear(newMonth, newYear);
    } else if (flowChart.period === 'weekly') {
      if (flowChart.selectedWeekIndex > 0) {
        flowChart.handleWeekChange(flowChart.selectedWeekIndex - 1);
      }
    } else if (flowChart.period === 'yearly') {
      const newYear = flowChart.year - 1;
      flowChart.handleYearChange(newYear);
      setMonthYear(flowChart.month, newYear);
    }
  };

  const handleNextPeriod = () => {
    if (flowChart.period === 'monthly') {
      const newMonth = flowChart.month === 11 ? 0 : flowChart.month + 1;
      const newYear = flowChart.month === 11 ? flowChart.year + 1 : flowChart.year;
      flowChart.handleMonthChange(newMonth, newYear);
      setMonthYear(newMonth, newYear);
    } else if (flowChart.period === 'weekly') {
      if (flowChart.selectedWeekIndex < flowChart.weeksMeta.length - 1) {
        flowChart.handleWeekChange(flowChart.selectedWeekIndex + 1);
      }
    } else if (flowChart.period === 'yearly') {
      const newYear = flowChart.year + 1;
      flowChart.handleYearChange(newYear);
      setMonthYear(flowChart.month, newYear);
    }
  };

  // Label do período ativo para o seletor único
  const activePeriodLabel = useMemo(() => {
    if (flowChart.period === 'monthly') {
      return `${MONTH_FULL_NAMES[flowChart.month]} de ${flowChart.year}`;
    }
    if (flowChart.period === 'weekly') {
      const currentWeek = flowChart.weeksMeta?.[flowChart.selectedWeekIndex];
      return currentWeek ? currentWeek.label : `Semana ${flowChart.selectedWeekIndex + 1}`;
    }
    return `Ano de ${flowChart.year}`;
  }, [flowChart.period, flowChart.month, flowChart.year, flowChart.weeksMeta, flowChart.selectedWeekIndex]);

  // Séries do Gráfico
  const flowSeries: ChartSeries[] = useMemo(
    () => [
      {
        id: 'totalIncome',
        name: 'Entradas',
        color: '#22c55e', // Verde esmeralda
        values: flowChart.activeStats.map(
          (s) => (s.serviceRevenue || 0) + (s.generalIncome || 0)
        ),
        formatValue: (v) => formatCurrency(v),
      },
      {
        id: 'totalExpense',
        name: 'Saídas',
        color: '#f43f5e', // Coral/Vermelho
        values: flowChart.activeStats.map((s) => s.generalExpense || 0),
        formatValue: (v) => formatCurrency(v),
      },
      {
        id: 'netBalance',
        name: 'Balanço',
        color: '#3b82f6', // Azul
        values: flowChart.activeStats.map(
          (s) => (s.serviceRevenue || 0) + (s.generalIncome || 0) - (s.generalExpense || 0)
        ),
        formatValue: (v) => formatCurrency(v),
      },
    ],
    [flowChart.activeStats]
  );

  const flowLabels = useMemo(
    () => flowChart.activeStats.map((s) => s.label),
    [flowChart.activeStats]
  );

  const flowTooltipLabels = useMemo(
    () => flowChart.activeStats.map((s) => s.fullLabel || s.label),
    [flowChart.activeStats]
  );

  // Totais do período ativo para exibição no cabeçalho do gráfico
  const periodTotals = useMemo(() => {
    const totalInc = flowChart.activeStats.reduce(
      (sum, s) => sum + (s.serviceRevenue || 0) + (s.generalIncome || 0),
      0
    );
    const totalExp = flowChart.activeStats.reduce(
      (sum, s) => sum + (s.generalExpense || 0),
      0
    );
    return {
      income: totalInc,
      expense: totalExp,
      balance: totalInc - totalExp,
    };
  }, [flowChart.activeStats]);

  // 2. RECEITAS E DESPESAS (REALIZADO + PREVISTO COM O QUE AINDA FALTA)
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
      const curYearStat = yearlyStats[flowChart.month] || generalData?.yearlyStats?.[flowChart.month];
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
  }, [transactions, yearlyStats, generalData?.yearlyStats, flowChart.month, businessData.monthSummary]);

  // 3. DIAS MAIS FORTES DA BARBEARIA NO MÊS
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

    Object.values(businessData.weeklyStatsByWeek || {}).forEach((weekDays) => {
      weekDays.forEach((stat) => {
        if (stat.label && dayTotals[stat.label] !== undefined) {
          dayTotals[stat.label] += stat.revenue || 0;
        }
      });
    });

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

  // Resumo da Barbearia
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

  // Estado do Modal de Evolução por Categoria
  const [evolutionModalState, setEvolutionModalState] = useState<{
    type: 'income' | 'expense';
    refMonth: number;
    refYear: number;
  } | null>(null);

  return (
    <div className="space-y-4 pb-16">
      {/* ============================================================== */}
      {/* SELETOR ÚNICO NO TOPO (SEMANAL | MENSAL [DEFAULT] | ANUAL)     */}
      {/* ============================================================== */}
      <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2.5 shadow-sm">
        {/* Linha 1: Pílulas de Granularidade e Botão de Privacidade */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
            <button
              type="button"
              onClick={() => flowChart.setPeriod('weekly')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                flowChart.period === 'weekly'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => flowChart.setPeriod('monthly')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                flowChart.period === 'monthly'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => flowChart.setPeriod('yearly')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                flowChart.period === 'yearly'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Anual
            </button>
          </div>

          {/* Botão de Privacidade */}
          <button
            type="button"
            onClick={() => setShowValues((prev) => !prev)}
            className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-200 transition active:scale-95"
            aria-label={showValues ? 'Ocultar valores' : 'Mostrar valores'}
            title={showValues ? 'Ocultar valores' : 'Mostrar valores'}
          >
            {showValues ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>

        {/* Linha 2: Navegação Touch do Período (< Período Ativo >) */}
        <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800/80 px-2 py-1 rounded-xl">
          <button
            type="button"
            onClick={handlePrevPeriod}
            disabled={flowChart.period === 'weekly' && flowChart.selectedWeekIndex <= 0}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 disabled:opacity-25 disabled:pointer-events-none active:scale-90 transition"
            aria-label="Período anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-200 text-center truncate px-2">
            {activePeriodLabel}
          </span>

          <button
            type="button"
            onClick={handleNextPeriod}
            disabled={
              flowChart.period === 'weekly' &&
              flowChart.selectedWeekIndex >= flowChart.weeksMeta.length - 1
            }
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 disabled:opacity-25 disabled:pointer-events-none active:scale-90 transition"
            aria-label="Próximo período"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. EVOLUÇÃO FINANCEIRA AMPLIADA (ALTA VISIBILIDADE)             */}
      {/* ============================================================== */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 sm:p-5 space-y-2">
        {/* Badges de Resumo Rápido do Período */}
        <div className="grid grid-cols-3 gap-2 p-2 bg-zinc-950/80 rounded-xl border border-zinc-800/70 text-center">
          <div>
            <span className="text-[10px] text-zinc-400 block font-medium">Entradas</span>
            <span className="text-xs font-bold text-emerald-400">
              {formatHidden(formatCurrency(periodTotals.income))}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 block font-medium">Saídas</span>
            <span className="text-xs font-bold text-rose-400">
              {formatHidden(formatCurrency(periodTotals.expense))}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 block font-medium">Balanço</span>
            <span
              className={`text-xs font-black ${
                periodTotals.balance >= 0 ? 'text-zinc-100' : 'text-rose-400'
              }`}
            >
              {formatHidden(formatCurrency(periodTotals.balance))}
            </span>
          </div>
        </div>

        {/* Gráfico Amplo e Nítido */}
        <SmoothLineChart
          title="Evolução Financeira"
          subtitle={flowChart.subtitle}
          series={flowSeries}
          labels={flowLabels}
          tooltipLabels={flowTooltipLabels}
          height={320}
          compactLayout={true}
        />
      </div>

      {/* ============================================================== */}
      {/* 2. RECEITAS E DESPESAS                                          */}
      {/* ============================================================== */}
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

      {/* ============================================================== */}
      {/* 3. RECEITAS E BALANÇO GERAL (SEM SELETOR INTERNO)               */}
      {/* ============================================================== */}
      <MonthlyBarChart
        transactions={transactions}
        accounts={accounts}
        incomeEvolution={generalData?.incomeCategoryEvolution || []}
        currentMonth={flowChart.month}
        year={flowChart.year}
        hideMonthSelector={true}
        onExpandEvolution={(m, y) =>
          setEvolutionModalState({ type: 'income', refMonth: m, refYear: y })
        }
      />

      {/* ============================================================== */}
      {/* 4. GASTOS POR CATEGORIA (SEM SELETOR INTERNO)                  */}
      {/* ============================================================== */}
      <CategoryDonutChart
        transactions={transactions}
        expenseEvolution={generalData?.expenseCategoryEvolution || []}
        currentMonth={flowChart.month}
        year={flowChart.year}
        hideMonthSelector={true}
        onExpandEvolution={(m, y) =>
          setEvolutionModalState({ type: 'expense', refMonth: m, refYear: y })
        }
      />

      {/* ============================================================== */}
      {/* 5. INTELIGÊNCIA OPERACIONAL DA BARBEARIA                       */}
      {/* ============================================================== */}
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

      {/* Modal de Evolução por Categoria */}
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
        currentMonth={evolutionModalState?.refMonth ?? flowChart.month}
        year={evolutionModalState?.refYear ?? flowChart.year}
        formattedMonth={activePeriodLabel}
      />
    </div>
  );
}
