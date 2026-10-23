'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp,
  Scissors,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Calendar,
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
import {
  ChartPeriodToolbar,
  useIndependentChartPeriod,
} from '../ChartPeriodToolbar';

const CategoryEvolutionModal = dynamic(
  () => import('../CategoryEvolutionModal').then((m) => m.CategoryEvolutionModal),
  { ssr: false }
);

const MONTH_NAMES = [
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
  formattedMonth = '',
  month = new Date().getMonth(),
  year = new Date().getFullYear(),
  transactions = [],
  accounts = [],
}: MobileSummaryViewProps) {
  const { showValues } = useMobileNavigation();
  const formatHidden = (val: string) => (showValues ? val : '••••••');

  // Mês e ano de referência para as seções de detalhamento (Receitas, Despesas e Barbearia)
  const [refMonth, setRefMonth] = useState<number>(month);
  const [refYear, setRefYear] = useState<number>(year);

  // Navegação do seletor único de mês de referência
  const handlePrevRefMonth = () => {
    if (refMonth === 0) {
      setRefMonth(11);
      setRefYear((y) => y - 1);
    } else {
      setRefMonth((m) => m - 1);
    }
  };

  const handleNextRefMonth = () => {
    if (refMonth === 11) {
      setRefMonth(0);
      setRefYear((y) => y + 1);
    } else {
      setRefMonth((m) => m + 1);
    }
  };

  // Estado do Modal de Evolução por Categoria (quando clicar em Expandir no gráfico)
  const [evolutionModalState, setEvolutionModalState] = useState<{
    type: 'income' | 'expense';
    refMonth: number;
    refYear: number;
  } | null>(null);

  // 1. MOTOR NATIVO WEB DE EVOLUÇÃO (SmoothLineChart + ChartPeriodToolbar)
  const flowChart = useIndependentChartPeriod(
    year,
    month,
    generalData,
    yearlyStats,
    getGeneralDashboardData
  );

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
        color: '#f43f5e', // Rosa/Vermelho
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
      const curYearStat = yearlyStats[refMonth] || generalData?.yearlyStats?.[refMonth];
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
  }, [transactions, yearlyStats, generalData?.yearlyStats, refMonth, businessData.monthSummary]);

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

    // Somar a partir de weeklyStatsByWeek
    Object.values(businessData.weeklyStatsByWeek || {}).forEach((weekDays) => {
      weekDays.forEach((stat) => {
        if (stat.label && dayTotals[stat.label] !== undefined) {
          dayTotals[stat.label] += stat.revenue || 0;
        }
      });
    });

    // Fallback nas transações caso weeklyStatsByWeek esteja vazio
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

  return (
    <div className="space-y-4 pb-16">
      {/* 1. TOPO DA PÁGINA: EVOLUÇÃO FINANCEIRA AMPLIADA */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 sm:p-5">
        <SmoothLineChart
          title="Evolução Financeira"
          subtitle={flowChart.subtitle}
          series={flowSeries}
          labels={flowLabels}
          tooltipLabels={flowTooltipLabels}
          height={280}
          compactLayout={true}
          rightAction={
            <ChartPeriodToolbar
              period={flowChart.period}
              onPeriodChange={flowChart.setPeriod}
              year={flowChart.year}
              month={flowChart.month}
              onYearChange={flowChart.handleYearChange}
              onMonthChange={flowChart.handleMonthChange}
              weeksMeta={flowChart.weeksMeta}
              selectedWeekIndex={flowChart.selectedWeekIndex}
              onWeekChange={flowChart.handleWeekChange}
              loading={flowChart.loading}
            />
          }
        />
      </div>

      {/* 2. ABAIXO DA EVOLUÇÃO: RECEITAS E DESPESAS */}
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

      {/* 3. SELETOR DE MÊS DE REFERÊNCIA CENTRALIZADO */}
      <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Mês de Referência
          </span>
        </div>
        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-1.5 py-1 text-xs">
          <button
            type="button"
            onClick={handlePrevRefMonth}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select
            value={refMonth}
            onChange={(e) => setRefMonth(Number(e.target.value))}
            className="bg-transparent text-zinc-100 font-bold text-xs px-2 py-0.5 focus:outline-none cursor-pointer"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx} className="bg-zinc-900 text-zinc-100">
                {m}/{refYear}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleNextRefMonth}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. DEPOIS O RESTO: RECEITAS E BALANÇO GERAL (SEM SELETOR INTERNO) */}
      <MonthlyBarChart
        transactions={transactions}
        accounts={accounts}
        incomeEvolution={generalData?.incomeCategoryEvolution || []}
        currentMonth={refMonth}
        year={refYear}
        hideMonthSelector={true}
        onExpandEvolution={(m, y) =>
          setEvolutionModalState({ type: 'income', refMonth: m, refYear: y })
        }
      />

      {/* 5. GASTOS POR CATEGORIA (SEM SELETOR INTERNO) */}
      <CategoryDonutChart
        transactions={transactions}
        expenseEvolution={generalData?.expenseCategoryEvolution || []}
        currentMonth={refMonth}
        year={refYear}
        hideMonthSelector={true}
        onExpandEvolution={(m, y) =>
          setEvolutionModalState({ type: 'expense', refMonth: m, refYear: y })
        }
      />

      {/* 6. INTELIGÊNCIA OPERACIONAL DA BARBEARIA */}
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
        currentMonth={evolutionModalState?.refMonth ?? refMonth}
        year={evolutionModalState?.refYear ?? refYear}
        formattedMonth={formattedMonth}
      />
    </div>
  );
}
