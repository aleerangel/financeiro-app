'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Scissors,
  Users,
  Clock,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
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
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { MonthlyBarChart } from '../MonthlyBarChart';
import { CategoryDonutChart } from '../CategoryDonutChart';
import { SmoothLineChart, ChartSeries } from '../SmoothLineChart';
import { useIndependentChartPeriod } from '../ChartPeriodToolbar';

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
  const { showValues } = useMobileNavigation();
  const formatHidden = (val: string) => (showValues ? val : '••••••');

  // Filtro de métrica selecionada para a Evolução Financeira ('all' ou individual)
  const [selectedMetric, setSelectedMetric] = useState<
    'all' | 'totalIncome' | 'totalExpense' | 'netBalance'
  >('all');

  // Ref para controlar seleção de semana na transição entre meses
  const targetWeekRef = useRef<'first' | 'last' | null>(null);

  // 1. MOTOR NATIVO WEB DE EVOLUÇÃO (Inicializado com 'monthly' como default)
  const flowChart = useIndependentChartPeriod(
    year,
    month,
    generalData,
    yearlyStats,
    getGeneralDashboardData,
    'monthly'
  );

  // Seleciona primeira ou última semana após carregar novo mês no modo semanal
  useEffect(() => {
    if (targetWeekRef.current === 'last' && flowChart.weeksMeta.length > 0) {
      flowChart.handleWeekChange(flowChart.weeksMeta.length - 1);
      targetWeekRef.current = null;
    } else if (targetWeekRef.current === 'first' && flowChart.weeksMeta.length > 0) {
      flowChart.handleWeekChange(0);
      targetWeekRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowChart.weeksMeta, flowChart.month]);

  // Navegação unificada pelo seletor único do topo (permite transição contínua entre meses no modo semanal)
  const handlePrevPeriod = () => {
    if (flowChart.period === 'monthly') {
      const newMonth = flowChart.month === 0 ? 11 : flowChart.month - 1;
      const newYear = flowChart.month === 0 ? flowChart.year - 1 : flowChart.year;
      flowChart.handleMonthChange(newMonth, newYear);
    } else if (flowChart.period === 'weekly') {
      if (flowChart.selectedWeekIndex > 0) {
        flowChart.handleWeekChange(flowChart.selectedWeekIndex - 1);
      } else {
        // Transição para a última semana do mês anterior
        targetWeekRef.current = 'last';
        const prevMonth = flowChart.month === 0 ? 11 : flowChart.month - 1;
        const prevYear = flowChart.month === 0 ? flowChart.year - 1 : flowChart.year;
        flowChart.handleMonthChange(prevMonth, prevYear);
      }
    } else if (flowChart.period === 'yearly') {
      const newYear = flowChart.year - 1;
      flowChart.handleYearChange(newYear);
    }
  };

  const handleNextPeriod = () => {
    if (flowChart.period === 'monthly') {
      const newMonth = flowChart.month === 11 ? 0 : flowChart.month + 1;
      const newYear = flowChart.month === 11 ? flowChart.year + 1 : flowChart.year;
      flowChart.handleMonthChange(newMonth, newYear);
    } else if (flowChart.period === 'weekly') {
      if (flowChart.selectedWeekIndex < flowChart.weeksMeta.length - 1) {
        flowChart.handleWeekChange(flowChart.selectedWeekIndex + 1);
      } else {
        // Transição para a primeira semana do mês seguinte
        targetWeekRef.current = 'first';
        const nextMonth = flowChart.month === 11 ? 0 : flowChart.month + 1;
        const nextYear = flowChart.month === 11 ? flowChart.year + 1 : flowChart.year;
        flowChart.handleMonthChange(nextMonth, nextYear);
      }
    } else if (flowChart.period === 'yearly') {
      const newYear = flowChart.year + 1;
      flowChart.handleYearChange(newYear);
    }
  };

  // Semana ativa
  const currentWeek = useMemo(() => {
    return flowChart.weeksMeta?.[flowChart.selectedWeekIndex];
  }, [flowChart.weeksMeta, flowChart.selectedWeekIndex]);

  // Transações estritamente filtradas para o período ativo
  const periodTransactions = useMemo(() => {
    if (flowChart.period === 'weekly' && currentWeek) {
      return transactions.filter(
        (t) => t.due_date >= currentWeek.startDate && t.due_date <= currentWeek.endDate
      );
    }
    return transactions;
  }, [transactions, flowChart.period, currentWeek]);

  // Label do período ativo para o seletor único e para os módulos
  const activePeriodLabel = useMemo(() => {
    if (flowChart.period === 'monthly') {
      return `${MONTH_FULL_NAMES[flowChart.month]} de ${flowChart.year}`;
    }
    if (flowChart.period === 'weekly') {
      const monthShort = MONTH_FULL_NAMES[flowChart.month].slice(0, 3);
      if (currentWeek) {
        return `Semana ${flowChart.selectedWeekIndex + 1} (${currentWeek.shortLabel}) • ${monthShort}/${flowChart.year}`;
      }
      return `Semana ${flowChart.selectedWeekIndex + 1} • ${monthShort}/${flowChart.year}`;
    }
    return `Ano de ${flowChart.year}`;
  }, [flowChart.period, flowChart.month, flowChart.year, currentWeek, flowChart.selectedWeekIndex]);

  // Séries do Gráfico
  const flowSeries: ChartSeries[] = useMemo(
    () => [
      {
        id: 'totalIncome',
        name: 'Entradas',
        color: '#22c55e', // Verde esmeralda
        values: flowChart.activeStats.map((s) => s.generalIncome || 0),
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
          (s) => (s.generalIncome || 0) - (s.generalExpense || 0)
        ),
        formatValue: (v) => formatCurrency(v),
      },
    ],
    [flowChart.activeStats]
  );

  // Rótulos do eixo X (no modo mensal: 'Sem 1', 'Sem 2'...)
  const flowLabels = useMemo(() => {
    if (flowChart.period === 'monthly') {
      return flowChart.activeStats.map((_, idx) => `Sem ${idx + 1}`);
    }
    return flowChart.activeStats.map((s) => s.label);
  }, [flowChart.period, flowChart.activeStats]);

  const flowTooltipLabels = useMemo(
    () => flowChart.activeStats.map((s) => s.fullLabel || s.label),
    [flowChart.activeStats]
  );

  // Filtra as séries da Evolução Financeira conforme o botão clicado
  const displayedSeries = useMemo(() => {
    if (selectedMetric === 'all') return flowSeries;
    return flowSeries.filter((s) => s.id === selectedMetric);
  }, [flowSeries, selectedMetric]);

  // 2. RECEITAS E DESPESAS CORRESPONDENTES AO PERÍODO ATIVO
  const {
    receivedIncome,
    pendingIncome,
    totalIncome,
    paidExpense,
    pendingExpense,
    totalExpense,
    realizedBalance,
    projectedBalance,
  } = useMemo(() => {
    let recInc = 0;
    let pendInc = 0;
    let pdExp = 0;
    let pendExp = 0;

    if (flowChart.period === 'weekly') {
      // No modo semanal: soma dos dias da semana ativa e pendências da semana
      recInc = flowChart.activeStats.reduce(
        (sum, d) => sum + (d.generalIncome || 0),
        0
      );
      pdExp = flowChart.activeStats.reduce(
        (sum, d) => sum + (d.generalExpense || 0),
        0
      );

      for (const t of periodTransactions) {
        const amt = Number(t.amount) || 0;
        if (!t.is_paid) {
          if (t.type === 'income') pendInc += amt;
          else if (t.type === 'expense') pendExp += amt;
        }
      }
    } else if (flowChart.period === 'yearly') {
      // No modo anual: soma consolidada dos 12 meses
      recInc = flowChart.activeStats.reduce(
        (sum, m) => sum + (m.generalIncome || 0),
        0
      );
      pdExp = flowChart.activeStats.reduce(
        (sum, m) => sum + (m.generalExpense || 0),
        0
      );

      for (const t of transactions) {
        const amt = Number(t.amount) || 0;
        if (!t.is_paid) {
          if (t.type === 'income') pendInc += amt;
          else if (t.type === 'expense') pendExp += amt;
        }
      }
    } else {
      // No modo mensal: transações do mês selecionado
      const isCurrentLoadedMonth = flowChart.month === month && flowChart.year === year;
      if (isCurrentLoadedMonth && periodTransactions.length > 0) {
        for (const t of periodTransactions) {
          const amt = Number(t.amount) || 0;
          if (t.type === 'income') {
            if (t.is_paid) recInc += amt;
            else pendInc += amt;
          } else if (t.type === 'expense') {
            if (t.is_paid) pdExp += amt;
            else pendExp += amt;
          }
        }
      } else {
        const curYearStat = yearlyStats[flowChart.month] || generalData?.yearlyStats?.[flowChart.month];
        recInc = curYearStat?.generalIncome || 0;
        pdExp = curYearStat?.generalExpense || 0;
        pendExp = isCurrentLoadedMonth ? businessData.monthSummary?.pendingExpenses || 0 : 0;
      }
    }

    return {
      receivedIncome: recInc,
      pendingIncome: pendInc,
      totalIncome: recInc + pendInc,
      paidExpense: pdExp,
      pendingExpense: pendExp,
      totalExpense: pdExp + pendExp,
      realizedBalance: recInc - pdExp,
      projectedBalance: recInc + pendInc - (pdExp + pendExp),
    };
  }, [
    flowChart.period,
    flowChart.activeStats,
    flowChart.month,
    flowChart.year,
    month,
    year,
    periodTransactions,
    transactions,
    yearlyStats,
    generalData?.yearlyStats,
    businessData.monthSummary,
  ]);

  // 3. DIAS MAIS FORTES DA BARBEARIA (CALCULADO NO PERÍODO ATIVO)
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

    if (flowChart.period === 'weekly') {
      // Se for semanal: usa os dias daquela semana ativa
      flowChart.activeStats.forEach((stat) => {
        if (stat.label && dayTotals[stat.label] !== undefined) {
          dayTotals[stat.label] += stat.serviceRevenue || 0;
        }
      });
    } else {
      // Se mensal ou anual: soma acumulada
      Object.values(businessData.weeklyStatsByWeek || {}).forEach((weekDays) => {
        weekDays.forEach((stat) => {
          if (stat.label && dayTotals[stat.label] !== undefined) {
            dayTotals[stat.label] += stat.revenue || 0;
          }
        });
      });
    }

    const totalRevFromWeeks = Object.values(dayTotals).reduce((a, b) => a + b, 0);
    if (totalRevFromWeeks === 0 && periodTransactions.length > 0) {
      const bizTxs = periodTransactions.filter((t) => t.is_paid && isBarbeariaServiceIncome(t));
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
  }, [flowChart.period, flowChart.activeStats, businessData.weeklyStatsByWeek, periodTransactions]);

  // Faturamento da barbearia para o período ativo
  const bizPeriodRevenue = useMemo(() => {
    if (flowChart.period === 'weekly' || flowChart.period === 'yearly') {
      return flowChart.activeStats.reduce((sum, s) => sum + (s.serviceRevenue || 0), 0);
    }
    return businessData.monthSummary?.revenue || 0;
  }, [flowChart.period, flowChart.activeStats, businessData.monthSummary]);

  // Divisão Serviços vs Produtos no período ativo
  const revenueSplit = useMemo(() => {
    let sRev = 0;
    let pRev = 0;

    for (const t of periodTransactions) {
      if (t.is_paid && isBarbeariaServiceIncome(t)) {
        sRev += Number(t.amount || 0);
      }
    }

    if (sRev === 0 && flowChart.period === 'monthly') {
      return businessData.revenueSplit || {
        serviceRevenue: 0,
        productRevenue: 0,
        servicePercentage: 100,
        productPercentage: 0,
      };
    }

    pRev = businessData.revenueSplit?.productRevenue || 0;
    const total = sRev + pRev || 1;

    return {
      serviceRevenue: sRev,
      productRevenue: pRev,
      servicePercentage: Math.round((sRev / total) * 100),
      productPercentage: 100 - Math.round((sRev / total) * 100),
    };
  }, [periodTransactions, flowChart.period, businessData.revenueSplit]);

  return (
    <div className="space-y-4 pb-16">
      {/* ============================================================== */}
      {/* SELETOR ÚNICO NO TOPO (SEMANAL | MENSAL [DEFAULT] | ANUAL)     */}
      {/* ============================================================== */}
      <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2.5 shadow-sm">
        {/* Linha 1: Pílulas de Granularidade (Semanal | Mensal | Anual) */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
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

        {/* Linha 2: Navegação Touch do Período (< Período Ativo >) */}
        <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800/80 px-2 py-1 rounded-xl">
          <button
            type="button"
            onClick={handlePrevPeriod}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 active:scale-90 transition"
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
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 active:scale-90 transition"
            aria-label="Próximo período"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. EVOLUÇÃO FINANCEIRA AMPLIADA (ALTA VISIBILIDADE)             */}
      {/* ============================================================== */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 sm:p-5 space-y-3">
        {/* Badges de Resumo do Período - Toque para filtrar o gráfico */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-zinc-950/80 rounded-xl border border-zinc-800/70 text-center">
          {/* Entradas */}
          <button
            type="button"
            onClick={() =>
              setSelectedMetric((prev) => (prev === 'totalIncome' ? 'all' : 'totalIncome'))
            }
            className={`flex flex-col justify-between p-2 rounded-lg transition-all active:scale-95 text-center ${
              selectedMetric === 'totalIncome'
                ? 'bg-emerald-500/15 border border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                : selectedMetric !== 'all'
                ? 'opacity-40 hover:opacity-80 border border-transparent'
                : 'hover:bg-zinc-900/60 border border-transparent'
            }`}
            title="Clique para filtrar apenas Entradas"
          >
            <div className="flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">
                Entradas
              </span>
            </div>
            <span className="text-xs sm:text-sm font-black text-emerald-400 my-0.5">
              {formatHidden(formatCurrency(receivedIncome))}
            </span>
            <span className="text-[9px] text-zinc-400 block truncate leading-tight w-full">
              {pendingIncome > 0
                ? `prev: ${formatHidden(formatCurrency(totalIncome))}`
                : '100% recebido'}
            </span>
          </button>

          {/* Saídas */}
          <button
            type="button"
            onClick={() =>
              setSelectedMetric((prev) => (prev === 'totalExpense' ? 'all' : 'totalExpense'))
            }
            className={`flex flex-col justify-between p-2 rounded-lg transition-all active:scale-95 text-center ${
              selectedMetric === 'totalExpense'
                ? 'bg-rose-500/15 border border-rose-500/50 shadow-sm ring-1 ring-rose-500/30'
                : selectedMetric !== 'all'
                ? 'opacity-40 hover:opacity-80 border border-transparent'
                : 'hover:bg-zinc-900/60 border border-transparent'
            }`}
            title="Clique para filtrar apenas Saídas"
          >
            <div className="flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
              <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">
                Saídas
              </span>
            </div>
            <span className="text-xs sm:text-sm font-black text-rose-400 my-0.5">
              {formatHidden(formatCurrency(paidExpense))}
            </span>
            <span className="text-[9px] text-zinc-400 block truncate leading-tight w-full">
              {pendingExpense > 0
                ? `prev: ${formatHidden(formatCurrency(totalExpense))}`
                : '100% pago'}
            </span>
          </button>

          {/* Balanço */}
          <button
            type="button"
            onClick={() =>
              setSelectedMetric((prev) => (prev === 'netBalance' ? 'all' : 'netBalance'))
            }
            className={`flex flex-col justify-between p-2 rounded-lg transition-all active:scale-95 text-center ${
              selectedMetric === 'netBalance'
                ? 'bg-blue-500/15 border border-blue-500/50 shadow-sm ring-1 ring-blue-500/30'
                : selectedMetric !== 'all'
                ? 'opacity-40 hover:opacity-80 border border-transparent'
                : 'hover:bg-zinc-900/60 border border-transparent'
            }`}
            title="Clique para filtrar apenas Balanço"
          >
            <div className="flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">
                Balanço
              </span>
            </div>
            <span
              className={`text-xs sm:text-sm font-black my-0.5 ${
                realizedBalance >= 0 ? 'text-zinc-100' : 'text-rose-400'
              }`}
            >
              {formatHidden(formatCurrency(realizedBalance))}
            </span>
            <span className="text-[9px] text-zinc-400 block truncate leading-tight w-full">
              prev: {formatHidden(formatCurrency(projectedBalance))}
            </span>
          </button>
        </div>

        {/* Dica para o usuário tocar e alternar as métricas */}
        <p className="text-[10px] text-zinc-400 text-center flex items-center justify-center gap-1.5 py-0.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
          <span>Toque em Entradas, Saídas ou Balanço para isolar a curva no gráfico</span>
        </p>

        {/* Gráfico Amplo e Nítido com a Métrica Selecionada */}
        <SmoothLineChart
          title="Evolução Financeira"
          subtitle={
            selectedMetric === 'all'
              ? flowChart.subtitle
              : `Exibindo somente ${
                  selectedMetric === 'totalIncome'
                    ? 'Entradas'
                    : selectedMetric === 'totalExpense'
                    ? 'Saídas'
                    : 'Balanço'
                } (toque no badge para voltar a todos)`
          }
          series={displayedSeries}
          labels={flowLabels}
          tooltipLabels={flowTooltipLabels}
          height={320}
          compactLayout={true}
        />
      </div>

      {/* ============================================================== */}
      {/* 2. RECEITAS E BALANÇO GERAL (SINCRONIZADO COM O PERÍODO ATIVO)   */}
      {/* ============================================================== */}
      <MonthlyBarChart
        transactions={periodTransactions}
        accounts={accounts}
        incomeEvolution={generalData?.incomeCategoryEvolution || []}
        currentMonth={flowChart.month}
        year={flowChart.year}
        hideMonthSelector={true}
        periodLabel={activePeriodLabel}
      />

      {/* ============================================================== */}
      {/* 3. GASTOS POR CATEGORIA (SINCRONIZADO COM O PERÍODO ATIVO)      */}
      {/* ============================================================== */}
      <CategoryDonutChart
        transactions={periodTransactions}
        expenseEvolution={generalData?.expenseCategoryEvolution || []}
        currentMonth={flowChart.month}
        year={flowChart.year}
        hideMonthSelector={true}
        periodLabel={activePeriodLabel}
      />

      {/* ============================================================== */}
      {/* 4. INTELIGÊNCIA OPERACIONAL DA BARBEARIA                       */}
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
            {formatHidden(formatCurrency(bizPeriodRevenue))}
          </span>
        </div>

        {/* Divisão Serviços vs Produtos */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Divisão de Receitas • {activePeriodLabel}</span>
            <span className="font-semibold text-zinc-300">
              {revenueSplit.servicePercentage}% Serviços • {revenueSplit.productPercentage}% Produtos
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

        {/* Dias Mais Fortes */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              {flowChart.period === 'weekly' ? 'Receita por Dia da Semana' : 'Dias Mais Fortes no Período'}
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

        {/* Top Clientes */}
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
    </div>
  );
}
