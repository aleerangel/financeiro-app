'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Users,
  Clock,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart2,
  CreditCard,
  Eye,
  Store,
} from 'lucide-react';
import {
  BusinessDashboardData,
  GeneralDashboardData,
  MonthlyGeneralStat,
  BusinessPeriodStat,
  getGeneralDashboardData,
  getBusinessDashboardData,
} from '@/lib/actions/dashboard';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { Transaction } from '@/types/database';
import {
  isBarbeariaServiceIncome,
  computeRevenueSplit,
  isMixedRevenueSplit,
} from '@/lib/business-scope-utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { SegmentIcon } from '@/components/ui/SegmentIcon';
import { MonthlyBarChart } from '../MonthlyBarChart';
import { CategoryDonutChart } from '../CategoryDonutChart';
import { SmoothLineChart, ChartSeries } from '../SmoothLineChart';
import { useIndependentChartPeriod } from '../ChartPeriodToolbar';

const MONTH_FULL_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MONTH_SHORT_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const EMPTY_BUSINESS_STATS: BusinessPeriodStat[] = [];

type SummarySubTab = 'overview' | 'business';

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
  const { profile, hasBusiness, businessName } = useBusinessProfile();
  const formatHidden = (val: string) => (showValues ? val : '••••••');

  // Subaba ativa no topo do Resumo
  const [activeSubTab, setActiveSubTab] = useState<SummarySubTab>('overview');

  // Filtro de métrica selecionada para a Evolução Financeira ('all' ou individual)
  const [selectedMetric, setSelectedMetric] = useState<
    'all' | 'totalIncome' | 'totalExpense' | 'netBalance'
  >('all');

  // Ref para controlar seleção de semana na transição entre meses
  const targetWeekRef = useRef<'first' | 'last' | null>(null);

  // 1. MOTOR NATIVO WEB DE EVOLUÇÃO GERAL (Inicializado com 'monthly' como default)
  const flowChart = useIndependentChartPeriod(
    year,
    month,
    generalData,
    yearlyStats,
    getGeneralDashboardData,
    'monthly'
  );

  // 2. MOTOR NATIVO WEB DE EVOLUÇÃO DO NEGÓCIO
  const businessChart = useIndependentChartPeriod<
    BusinessDashboardData,
    BusinessPeriodStat
  >(
    year,
    month,
    businessData,
    EMPTY_BUSINESS_STATS,
    getBusinessDashboardData,
    flowChart.period
  );

  // Sincroniza o período do gráfico do negócio quando o período do flowChart mudar
  const handlePeriodChange = (p: 'weekly' | 'monthly' | 'yearly') => {
    flowChart.setPeriod(p);
    businessChart.setPeriod(p);
  };

  // Seleciona primeira ou última semana após carregar novo mês no modo semanal
  useEffect(() => {
    if (targetWeekRef.current === 'last' && flowChart.weeksMeta.length > 0) {
      flowChart.handleWeekChange(flowChart.weeksMeta.length - 1);
      businessChart.handleWeekChange(flowChart.weeksMeta.length - 1);
      targetWeekRef.current = null;
    } else if (targetWeekRef.current === 'first' && flowChart.weeksMeta.length > 0) {
      flowChart.handleWeekChange(0);
      businessChart.handleWeekChange(0);
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
      businessChart.handleMonthChange(newMonth, newYear);
    } else if (flowChart.period === 'weekly') {
      if (flowChart.selectedWeekIndex > 0) {
        flowChart.handleWeekChange(flowChart.selectedWeekIndex - 1);
        businessChart.handleWeekChange(flowChart.selectedWeekIndex - 1);
      } else {
        targetWeekRef.current = 'last';
        const prevMonth = flowChart.month === 0 ? 11 : flowChart.month - 1;
        const prevYear = flowChart.month === 0 ? flowChart.year - 1 : flowChart.year;
        flowChart.handleMonthChange(prevMonth, prevYear);
        businessChart.handleMonthChange(prevMonth, prevYear);
      }
    } else if (flowChart.period === 'yearly') {
      const newYear = flowChart.year - 1;
      flowChart.handleYearChange(newYear);
      businessChart.handleYearChange(newYear);
    }
  };

  const handleNextPeriod = () => {
    if (flowChart.period === 'monthly') {
      const newMonth = flowChart.month === 11 ? 0 : flowChart.month + 1;
      const newYear = flowChart.month === 11 ? flowChart.year + 1 : flowChart.year;
      flowChart.handleMonthChange(newMonth, newYear);
      businessChart.handleMonthChange(newMonth, newYear);
    } else if (flowChart.period === 'weekly') {
      if (flowChart.selectedWeekIndex < flowChart.weeksMeta.length - 1) {
        flowChart.handleWeekChange(flowChart.selectedWeekIndex + 1);
        businessChart.handleWeekChange(flowChart.selectedWeekIndex + 1);
      } else {
        targetWeekRef.current = 'first';
        const nextMonth = flowChart.month === 11 ? 0 : flowChart.month + 1;
        const nextYear = flowChart.month === 11 ? flowChart.year + 1 : flowChart.year;
        flowChart.handleMonthChange(nextMonth, nextYear);
        businessChart.handleMonthChange(nextMonth, nextYear);
      }
    } else if (flowChart.period === 'yearly') {
      const newYear = flowChart.year + 1;
      flowChart.handleYearChange(newYear);
      businessChart.handleYearChange(newYear);
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

  // Séries do Gráfico Geral
  const flowSeries: ChartSeries[] = useMemo(
    () => [
      {
        id: 'totalIncome',
        name: 'Entradas',
        color: '#22c55e', // Verde esmeralda
        values: flowChart.activeStats.map((s) => s.generalIncome || 0),
        formatValue: (v) => formatHidden(formatCurrency(v)),
      },
      {
        id: 'totalExpense',
        name: 'Saídas',
        color: '#f43f5e', // Coral/Vermelho
        values: flowChart.activeStats.map((s) => s.generalExpense || 0),
        formatValue: (v) => formatHidden(formatCurrency(v)),
      },
      {
        id: 'netBalance',
        name: 'Balanço',
        color: '#3b82f6', // Azul
        values: flowChart.activeStats.map(
          (s) => (s.generalIncome || 0) - (s.generalExpense || 0)
        ),
        formatValue: (v) => formatHidden(formatCurrency(v)),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flowChart.activeStats, showValues]
  );

  // Séries do Gráfico do Negócio (Faturamento, Gastos do Negócio, Lucro Líquido Real)
  const businessSeries: ChartSeries[] = useMemo(
    () => [
      {
        id: 'revenue',
        name: 'Faturamento',
        color: '#22c55e', // Verde
        values: businessChart.activeStats.map((s) => s.revenue || 0),
        formatValue: (v) => formatHidden(formatCurrency(v)),
      },
      {
        id: 'expenses',
        name: `Gastos ${businessName}`,
        color: '#f43f5e', // Rosa/Vermelho
        values: businessChart.activeStats.map((s) => s.expenses || 0),
        formatValue: (v) => formatHidden(formatCurrency(v)),
      },
      {
        id: 'netProfit',
        name: 'Lucro Líquido',
        color: '#eab308', // Amarelo/Dourado
        values: businessChart.activeStats.map(
          (s) => s.netProfit ?? (s.revenue - (s.expenses || 0))
        ),
        formatValue: (v) => formatHidden(formatCurrency(v)),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businessChart.activeStats, businessName, showValues]
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

  const businessLabels = useMemo(() => {
    if (businessChart.period === 'monthly') {
      return businessChart.activeStats.map((_, idx) => `Sem ${idx + 1}`);
    }
    return businessChart.activeStats.map((s) => s.label);
  }, [businessChart.period, businessChart.activeStats]);

  const businessTooltipLabels = useMemo(
    () => businessChart.activeStats.map((s) => s.fullLabel || s.label),
    [businessChart.activeStats]
  );

  // Filtra as séries da Evolução Financeira conforme o botão clicado
  const displayedSeries = useMemo(() => {
    if (selectedMetric === 'all') return flowSeries;
    return flowSeries.filter((s) => s.id === selectedMetric);
  }, [flowSeries, selectedMetric]);

  // Série Dedicada: Evolução do Saldo em Contas (1 curva roxa)
  const balanceSeries: ChartSeries[] = useMemo(
    () => [
      {
        id: 'accountBalance',
        name: 'Saldo em Contas',
        color: '#a855f7', // Roxo Neon
        values: flowChart.activeStats.map((s) => s.accountBalance || 0),
        formatValue: (v) => formatHidden(formatCurrency(v)),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flowChart.activeStats, showValues]
  );

  // Indicadores de Saldo do Período Ativo (Saldo Final e Variação)
  const { finalBalance, balanceDelta } = useMemo(() => {
    const values = flowChart.activeStats.map((s) => s.accountBalance || 0);
    if (values.length === 0) {
      const currentTotal = accounts.reduce((sum, a) => sum + Number(a.current_balance || 0), 0);
      return { finalBalance: currentTotal, balanceDelta: 0 };
    }
    const first = values[0];
    const last = values[values.length - 1];
    return {
      finalBalance: last,
      balanceDelta: last - first,
    };
  }, [flowChart.activeStats, accounts]);

  // Total das contas ativas somadas
  const totalAccountsBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + Number(a.current_balance || 0), 0);
  }, [accounts]);

  // Receitas e Despesas correspondentes ao período ativo
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

  // Totais do Negócio no Período Ativo (Faturamento, Gastos e Lucro)
  const { bizRevenue, bizExpenses, bizNetProfit } = useMemo(() => {
    const rev = businessChart.activeStats.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const exp = businessChart.activeStats.reduce((sum, s) => sum + (s.expenses || 0), 0);
    const profit = rev - exp;
    return {
      bizRevenue: rev,
      bizExpenses: exp,
      bizNetProfit: profit,
    };
  }, [businessChart.activeStats]);

  // Estatísticas de dias mais fortes
  const strongDaysStats = useMemo(() => {
    const dayTotals: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const DAY_FULL_NAMES = [
      'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
      'Quinta-feira', 'Sexta-feira', 'Sábado',
    ];

    if (flowChart.period === 'weekly') {
      const activeWeekDays = businessData.weeklyStatsByWeek?.[flowChart.selectedWeekIndex] || [];
      activeWeekDays.forEach((stat) => {
        if (stat.dateKey) {
          const d = new Date(stat.dateKey + 'T12:00:00');
          const dayIdx = d.getDay();
          dayTotals[dayIdx] = (dayTotals[dayIdx] || 0) + (stat.revenue || 0);
        }
      });
    } else if (flowChart.period === 'monthly') {
      Object.values(businessData.weeklyStatsByWeek || {}).forEach((weekDays) => {
        weekDays.forEach((stat) => {
          if (stat.dateKey) {
            const d = new Date(stat.dateKey + 'T12:00:00');
            const dayIdx = d.getDay();
            dayTotals[dayIdx] = (dayTotals[dayIdx] || 0) + (stat.revenue || 0);
          }
        });
      });
    } else {
      periodTransactions
        .filter((t) => t.type === 'income' && isBarbeariaServiceIncome(t))
        .forEach((t) => {
          const d = new Date(t.due_date + 'T12:00:00');
          const dayIdx = d.getDay();
          dayTotals[dayIdx] = (dayTotals[dayIdx] || 0) + Number(t.amount || 0);
        });
    }

    const totalPeriodRevenue = Object.values(dayTotals).reduce((sum, v) => sum + v, 0);

    return [1, 2, 3, 4, 5, 6, 0]
      .map((dayIdx) => {
        const rev = dayTotals[dayIdx] || 0;
        const pct = totalPeriodRevenue > 0 ? Math.round((rev / totalPeriodRevenue) * 100) : 0;
        return {
          dayIndex: dayIdx,
          name: DAY_NAMES[dayIdx],
          fullName: DAY_FULL_NAMES[dayIdx],
          code: DAY_NAMES[dayIdx].toLowerCase(),
          revenue: rev,
          percentage: pct,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [flowChart.period, flowChart.selectedWeekIndex, businessData.weeklyStatsByWeek, periodTransactions]);

  // Divisão Serviços vs Produtos
  const revenueSplit = useMemo(() => {
    if (flowChart.period === 'monthly') {
      return businessData.revenueSplit || computeRevenueSplit(0, 0);
    }
    const sRev = periodTransactions
      .filter((t) => t.type === 'income' && isBarbeariaServiceIncome(t))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const pRev = businessData.revenueSplit?.productRevenue || 0;
    return computeRevenueSplit(sRev, pRev);
  }, [periodTransactions, flowChart.period, businessData.revenueSplit]);

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* ============================================================== */}
      {/* 1. ABAS SECUNDÁRIAS DO RESUMO (SE HOUVER NEGÓCIO CADASTRADO)  */}
      {/* ============================================================== */}
      {hasBusiness && (
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-900 border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeSubTab === 'overview'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Visão Geral</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('business')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeSubTab === 'business'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <SegmentIcon segment={profile.segment} className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">{businessName}</span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. SELETOR DE PERÍODO (COMPARTILHADO)                          */}
      {/* ============================================================== */}
      <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2.5 shadow-sm">
        {/* Pílulas de Granularidade */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
          <button
            type="button"
            onClick={() => handlePeriodChange('weekly')}
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
            onClick={() => handlePeriodChange('monthly')}
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
            onClick={() => handlePeriodChange('yearly')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              flowChart.period === 'yearly'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Anual
          </button>
        </div>

        {/* Navegação Touch do Período */}
        {flowChart.period === 'weekly' ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800/80 px-1.5 py-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  const newMonth = flowChart.month === 0 ? 11 : flowChart.month - 1;
                  const newYear = flowChart.month === 0 ? flowChart.year - 1 : flowChart.year;
                  flowChart.handleMonthChange(newMonth, newYear);
                  businessChart.handleMonthChange(newMonth, newYear);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 active:scale-90 transition shrink-0"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <select
                value={flowChart.month}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  flowChart.handleMonthChange(m, flowChart.year);
                  businessChart.handleMonthChange(m, flowChart.year);
                }}
                className="bg-transparent text-zinc-200 font-bold text-xs focus:outline-none cursor-pointer text-center truncate min-w-0 flex-1 px-1 py-0.5"
                aria-label="Selecionar mês"
              >
                {MONTH_SHORT_NAMES.map((mName, idx) => (
                  <option key={mName} value={idx} className="bg-zinc-900 text-zinc-100">
                    {mName} de {flowChart.year}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const newMonth = flowChart.month === 11 ? 0 : flowChart.month + 1;
                  const newYear = flowChart.month === 11 ? flowChart.year + 1 : flowChart.year;
                  flowChart.handleMonthChange(newMonth, newYear);
                  businessChart.handleMonthChange(newMonth, newYear);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 active:scale-90 transition shrink-0"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800/80 px-1.5 py-1 rounded-xl">
              <button
                type="button"
                disabled={flowChart.selectedWeekIndex <= 0}
                onClick={() => {
                  const w = Math.max(0, flowChart.selectedWeekIndex - 1);
                  flowChart.handleWeekChange(w);
                  businessChart.handleWeekChange(w);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 active:scale-90 transition disabled:opacity-30 disabled:pointer-events-none shrink-0"
                aria-label="Semana anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <select
                value={flowChart.selectedWeekIndex}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  flowChart.handleWeekChange(w);
                  businessChart.handleWeekChange(w);
                }}
                className="bg-transparent text-zinc-200 font-bold text-xs focus:outline-none cursor-pointer text-center truncate min-w-0 flex-1 px-1 py-0.5"
                aria-label="Selecionar semana"
              >
                {flowChart.weeksMeta.map((wm, idx) => (
                  <option key={wm.shortLabel} value={idx} className="bg-zinc-900 text-zinc-100">
                    Sem {idx + 1} ({wm.shortLabel})
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={flowChart.selectedWeekIndex >= flowChart.weeksMeta.length - 1}
                onClick={() => {
                  const w = Math.min(flowChart.weeksMeta.length - 1, flowChart.selectedWeekIndex + 1);
                  flowChart.handleWeekChange(w);
                  businessChart.handleWeekChange(w);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 active:scale-90 transition disabled:opacity-30 disabled:pointer-events-none shrink-0"
                aria-label="Próxima semana"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800/80 px-2 py-1 rounded-xl">
            <button
              type="button"
              onClick={handlePrevPeriod}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 active:scale-90 transition"
              aria-label="Período anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {flowChart.period === 'monthly' ? (
              <select
                value={flowChart.month}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  flowChart.handleMonthChange(m, flowChart.year);
                  businessChart.handleMonthChange(m, flowChart.year);
                }}
                className="bg-transparent text-xs font-extrabold uppercase tracking-wider text-zinc-200 text-center truncate px-2 focus:outline-none cursor-pointer"
                aria-label="Selecionar mês"
              >
                {MONTH_FULL_NAMES.map((mName, idx) => (
                  <option key={mName} value={idx} className="bg-zinc-900 text-zinc-100">
                    {mName} de {flowChart.year}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-200 text-center truncate px-2">
                {activePeriodLabel}
              </span>
            )}

            <button
              type="button"
              onClick={handleNextPeriod}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 active:scale-90 transition"
              aria-label="Próximo período"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* SUBABA 1: VISÃO GERAL                                          */}
      {/* ============================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          {/* Evolução Financeira */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 sm:p-5 space-y-3">
            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-zinc-950/80 rounded-xl border border-zinc-800/70 text-center">
              <button
                type="button"
                onClick={() => setSelectedMetric((prev) => (prev === 'totalIncome' ? 'all' : 'totalIncome'))}
                className={`flex flex-col justify-between p-2 rounded-lg transition-all active:scale-95 text-center ${
                  selectedMetric === 'totalIncome'
                    ? 'bg-emerald-500/15 border border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                    : selectedMetric !== 'all'
                    ? 'opacity-40 hover:opacity-80 border border-transparent'
                    : 'hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">Entradas</span>
                </div>
                <span className="text-xs sm:text-sm font-black text-emerald-400 my-0.5">
                  {formatHidden(formatCurrency(receivedIncome))}
                </span>
                <span className="text-[9px] text-zinc-400 block truncate leading-tight w-full">
                  {pendingIncome > 0 ? `prev: ${formatHidden(formatCurrency(totalIncome))}` : '100% recebido'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMetric((prev) => (prev === 'totalExpense' ? 'all' : 'totalExpense'))}
                className={`flex flex-col justify-between p-2 rounded-lg transition-all active:scale-95 text-center ${
                  selectedMetric === 'totalExpense'
                    ? 'bg-rose-500/15 border border-rose-500/50 shadow-sm ring-1 ring-rose-500/30'
                    : selectedMetric !== 'all'
                    ? 'opacity-40 hover:opacity-80 border border-transparent'
                    : 'hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">Saídas</span>
                </div>
                <span className="text-xs sm:text-sm font-black text-rose-400 my-0.5">
                  {formatHidden(formatCurrency(paidExpense))}
                </span>
                <span className="text-[9px] text-zinc-400 block truncate leading-tight w-full">
                  {pendingExpense > 0 ? `prev: ${formatHidden(formatCurrency(totalExpense))}` : '100% pago'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMetric((prev) => (prev === 'netBalance' ? 'all' : 'netBalance'))}
                className={`flex flex-col justify-between p-2 rounded-lg transition-all active:scale-95 text-center ${
                  selectedMetric === 'netBalance'
                    ? 'bg-blue-500/15 border border-blue-500/50 shadow-sm ring-1 ring-blue-500/30'
                    : selectedMetric !== 'all'
                    ? 'opacity-40 hover:opacity-80 border border-transparent'
                    : 'hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">Balanço</span>
                </div>
                <span className={`text-xs sm:text-sm font-black my-0.5 ${realizedBalance >= 0 ? 'text-zinc-100' : 'text-rose-400'}`}>
                  {formatHidden(formatCurrency(realizedBalance))}
                </span>
                <span className="text-[9px] text-zinc-400 block truncate leading-tight w-full">
                  prev: {formatHidden(formatCurrency(projectedBalance))}
                </span>
              </button>
            </div>

            <SmoothLineChart
              title="Evolução Financeira"
              subtitle={
                selectedMetric === 'all'
                  ? flowChart.subtitle
                  : `Filtrado por ${selectedMetric === 'totalIncome' ? 'Entradas' : selectedMetric === 'totalExpense' ? 'Saídas' : 'Balanço'}`
              }
              series={displayedSeries}
              labels={flowLabels}
              tooltipLabels={flowTooltipLabels}
              height={300}
              compactLayout={true}
            />
          </div>

          {/* Evolução do Saldo em Contas */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 sm:p-5 space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">
                    Saldo no Período
                  </span>
                  <span className="text-sm sm:text-base font-black text-purple-300">
                    {formatHidden(formatCurrency(finalBalance))}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block font-medium">
                  {accounts.length} {accounts.length === 1 ? 'conta ativa' : 'contas ativas'}
                </span>
                <div className="inline-flex items-center gap-1 mt-0.5">
                  {balanceDelta > 0 ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <TrendingUp className="w-3 h-3" />
                      +{formatHidden(formatCurrency(balanceDelta))}
                    </span>
                  ) : balanceDelta < 0 ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      <TrendingDown className="w-3 h-3" />
                      -{formatHidden(formatCurrency(Math.abs(balanceDelta)))}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                      Estável
                    </span>
                  )}
                </div>
              </div>
            </div>

            <SmoothLineChart
              title="Evolução do Saldo em Contas"
              subtitle={flowChart.subtitle}
              series={balanceSeries}
              labels={flowLabels}
              tooltipLabels={flowTooltipLabels}
              height={250}
              dynamicYScale={true}
              compactLayout={true}
            />
          </div>

          {/* Saldo das Contas Bancárias (Lista Analítica - Apenas se houver contas) */}
          {accounts && accounts.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                    Minhas Contas Bancárias
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-emerald-400">
                  Total: {formatHidden(formatCurrency(totalAccountsBalance))}
                </span>
              </div>

              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: acc.color || '#10b981' }}
                      >
                        {acc.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-zinc-100 text-xs block truncate">
                          {acc.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 block">
                          {acc.type === 'checking'
                            ? 'Conta Corrente'
                            : acc.type === 'savings'
                            ? 'Poupança'
                            : acc.type === 'investment'
                            ? 'Investimento'
                            : 'Carteira / Dinheiro'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-extrabold block ${
                          Number(acc.current_balance) >= 0 ? 'text-zinc-100' : 'text-rose-400'
                        }`}
                      >
                        {formatHidden(formatCurrency(acc.current_balance))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparativo de Receitas e Balanço Geral */}
          <MonthlyBarChart
            transactions={periodTransactions}
            accounts={accounts}
            incomeEvolution={generalData?.incomeCategoryEvolution || []}
            currentMonth={flowChart.month}
            year={flowChart.year}
            hideMonthSelector={true}
            periodLabel={activePeriodLabel}
          />

          {/* Gastos por Categoria (Gráfico de Rosca - Oculta se não houver gastos) */}
          {totalExpense > 0 && (
            <CategoryDonutChart
              transactions={periodTransactions}
              expenseEvolution={generalData?.expenseCategoryEvolution || []}
              currentMonth={flowChart.month}
              year={flowChart.year}
              hideMonthSelector={true}
              periodLabel={activePeriodLabel}
            />
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBABA 2: DESEMPENHO COMERCIAL (APENAS COM NEGÓCIO ATIVO)      */}
      {/* ============================================================== */}
      {activeSubTab === 'business' && hasBusiness && (
        <div className="space-y-4">
          {/* Gráfico do Negócio: Faturamento x Gastos x Lucro */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 sm:p-5 space-y-3">
            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-zinc-950/80 rounded-xl border border-zinc-800/70 text-center">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 block font-bold uppercase tracking-wider">
                  Faturamento
                </span>
                <span className="text-xs font-black text-emerald-400 block mt-0.5">
                  {formatHidden(formatCurrency(bizRevenue))}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] text-rose-400 block font-bold uppercase tracking-wider">
                  Gastos Negócio
                </span>
                <span className="text-xs font-black text-rose-400 block mt-0.5">
                  {formatHidden(formatCurrency(bizExpenses))}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] text-amber-400 block font-bold uppercase tracking-wider">
                  Lucro Líquido
                </span>
                <span className={`text-xs font-black block mt-0.5 ${bizNetProfit >= 0 ? 'text-zinc-100' : 'text-rose-400'}`}>
                  {formatHidden(formatCurrency(bizNetProfit))}
                </span>
              </div>
            </div>

            <SmoothLineChart
              title={`Desempenho Comercial • ${businessName}`}
              subtitle={businessChart.subtitle}
              series={businessSeries}
              labels={businessLabels}
              tooltipLabels={businessTooltipLabels}
              height={290}
              compactLayout={true}
            />
          </div>

          {/* Ponto de Equilíbrio (Break-Even) no Resumo Mobile */}
          {businessData.breakEven &&
            (businessData.breakEven.totalExpenses > 0 || businessData.breakEven.revenue > 0) && (
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">
                    Ponto de Equilíbrio (Mês)
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      businessData.breakEven.isReached
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {businessData.breakEven.isReached
                      ? 'Custos Cobertos'
                      : `${businessData.breakEven.progressPercent}% atingido`}
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      businessData.breakEven.isReached ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(0, businessData.breakEven.progressPercent))}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400">
                  {businessData.breakEven.isReached
                    ? `Superávit operacional de ${formatHidden(formatCurrency(businessData.breakEven.surplusAmount))} além das despesas do mês.`
                    : `Faltam ${formatHidden(formatCurrency(businessData.breakEven.remainingAmount))} para cobrir as despesas de ${formatHidden(formatCurrency(businessData.breakEven.totalExpenses))}.`}
                </p>
              </div>
            )}

          {/* Alerta de Estoque Baixo no Resumo Mobile */}
          {businessData.lowStockProducts && businessData.lowStockProducts.length > 0 && (
            <div className="p-4 bg-zinc-900 border border-rose-500/30 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400">
                  Estoque Baixo ({businessData.lowStockProducts.length})
                </span>
                <Link href="/produtos" className="text-xs text-rose-300 font-semibold">
                  Repor &rarr;
                </Link>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {businessData.lowStockProducts.map((prod) => (
                  <span
                    key={prod.id}
                    className="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 font-medium"
                  >
                    {prod.name}: {prod.stock_quantity} (mín. {prod.min_stock})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Divisão Serviços vs Produtos (Apenas se houver divisão mista) */}
          {isMixedRevenueSplit(revenueSplit) && (
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-bold text-zinc-200">Divisão de Receitas</span>
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
                  <SegmentIcon segment={profile.segment} className="w-4 h-4 text-emerald-500/50" />
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
          )}

          {/* Dias Mais Fortes (Apenas se houver faturamento no período) */}
          {strongDaysStats.some((d) => d.revenue > 0) && (
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
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
          )}

          {/* Top Clientes Mais Assíduos (Apenas se houver clientes) */}
          {businessData.topClients && businessData.topClients.length > 0 && (
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  Top Clientes do Mês
                </span>
                <Link
                  href="/clientes"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 shrink-0"
                >
                  Ver CRM <Eye className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-1.5">
                {businessData.topClients.slice(0, 4).map((client, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                        {idx + 1}º
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-zinc-100 block truncate">
                          {client.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 block">
                          Última visita: {formatDate(client.lastVisitDate)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-emerald-400 block">
                        {formatHidden(formatCurrency(client.totalSpent))}
                      </span>
                      <span className="text-[10px] text-blue-400 font-medium">
                        {client.visitsCount} {client.visitsCount === 1 ? 'visita' : 'visitas'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consumo por Meio de Pagamento (Contas & Cartões - Apenas se houver registros) */}
          {businessData.expensesBySource && businessData.expensesBySource.length > 0 && (
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <div>
                <h3 className="font-bold text-zinc-100 text-sm">
                  Consumo por Meio de Pagamento
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Quanto os gastos de {businessName} utilizaram de cada meio no período
                </p>
              </div>

              <div className="space-y-2.5">
                {businessData.expensesBySource.map((src) => (
                  <div
                    key={src.id}
                    className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: src.color || '#f59e0b' }}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-100 truncate">
                            {src.name}
                          </span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                            {src.type === 'card' ? 'Cartão' : 'Conta'}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          Pago: {formatHidden(formatCurrency(src.paidAmount))}
                          {src.pendingAmount > 0
                            ? ` • Fatura: ${formatHidden(formatCurrency(src.pendingAmount))}`
                            : ''}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-extrabold text-rose-400 shrink-0">
                      - {formatHidden(formatCurrency(src.totalAmount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimos Gastos do Negócio (Apenas se houver registros) */}
          {businessData.recentExpenses && businessData.recentExpenses.length > 0 && (
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-100 text-sm">
                    Últimos Gastos do Negócio
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Insumos, materiais e custos comerciais recentes
                  </p>
                </div>
                <Link
                  href="/transacoes"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 shrink-0"
                >
                  Extrato <Eye className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-2">
                {businessData.recentExpenses.slice(0, 5).map((exp) => (
                  <div
                    key={exp.id}
                    className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-zinc-100 text-xs block truncate">
                        {exp.description}
                      </span>
                      <span className="text-[10px] text-zinc-400 block">
                        {formatDate(exp.due_date)} • {exp.category_name} • {exp.source_name}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-rose-400 block">
                        - {formatHidden(formatCurrency(exp.amount))}
                      </span>
                      <span className={`text-[9px] font-semibold ${exp.is_paid ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {exp.is_paid ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lançamentos Recentes do Negócio (Apenas se houver registros) */}
          {businessData.recentSales && businessData.recentSales.length > 0 && (
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-100 text-sm">
                    Lançamentos Recentes
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Últimos atendimentos e vendas concluídos
                  </p>
                </div>
                <Link
                  href="/vendas"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 shrink-0"
                >
                  Vendas <Eye className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-2">
                {businessData.recentSales.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-zinc-100 text-xs block truncate">
                        {sale.client_name || 'Cliente Balcão'}
                      </span>
                      <span className="text-[10px] text-zinc-400 block">
                        {formatDate(sale.sale_date)} • {sale.account_name || 'Caixa'}
                      </span>
                    </div>

                    <span className="text-xs font-extrabold text-emerald-400 shrink-0">
                      + {formatHidden(formatCurrency(sale.total_amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
