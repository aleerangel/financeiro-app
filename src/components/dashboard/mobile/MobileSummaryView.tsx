'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  PieChart,
  Scissors,
  Users,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Target,
  ShoppingBag,
} from 'lucide-react';
import {
  BusinessDashboardData,
  GeneralDashboardData,
  MonthlyGeneralStat,
  PeriodStat,
} from '@/lib/actions/dashboard';
import { formatCurrency } from '@/lib/utils';
import { useMobileNavigation } from '@/context/MobileNavigationContext';

interface MobileSummaryViewProps {
  businessData: BusinessDashboardData;
  generalData: GeneralDashboardData;
  yearlyStats?: MonthlyGeneralStat[];
  formattedMonth?: string;
  month?: number;
}

type PeriodMode = 'yearly' | 'monthly' | 'weekly';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function MobileSummaryView({
  businessData,
  generalData,
  yearlyStats = [],
  formattedMonth = '',
  month = 0,
}: MobileSummaryViewProps) {
  const { showValues } = useMobileNavigation();
  const formatHidden = (val: string) => (showValues ? val : '••••••');

  // Controle de Granularidade Temporal
  const [periodMode, setPeriodMode] = useState<PeriodMode>('yearly');
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(
    generalData.defaultWeekIndex ?? 0
  );
  const [showAllCategories, setShowAllCategories] = useState(false);

  // 1. Dados do Período Selecionado para o Gráfico
  const currentChartStats: PeriodStat[] = useMemo(() => {
    if (periodMode === 'yearly') {
      return yearlyStats.length > 0 ? yearlyStats : (generalData.yearlyStats || []);
    }
    if (periodMode === 'monthly') {
      return generalData.monthlyStats || [];
    }
    // weekly
    const weekStats = generalData.weeklyStatsByWeek?.[selectedWeekIndex];
    return weekStats && weekStats.length > 0 ? weekStats : [];
  }, [periodMode, yearlyStats, generalData, selectedWeekIndex]);

  // Totais do período ativo
  const periodTotals = useMemo(() => {
    const totalIncome = currentChartStats.reduce(
      (sum, s) => sum + (s.generalIncome || 0) + (s.serviceRevenue || 0),
      0
    );
    const totalExpense = currentChartStats.reduce(
      (sum, s) => sum + (s.generalExpense || 0),
      0
    );
    const balance = totalIncome - totalExpense;
    return { totalIncome, totalExpense, balance };
  }, [currentChartStats]);

  const maxChartValue = useMemo(() => {
    return Math.max(
      ...currentChartStats.map((s) =>
        Math.max((s.generalIncome || 0) + (s.serviceRevenue || 0), s.generalExpense || 0)
      ),
      100
    );
  }, [currentChartStats]);

  // 2. Comparativo MoM (Mês Atual vs Mês Anterior)
  const momComparison = useMemo(() => {
    const currentYearStats = yearlyStats.length > 0 ? yearlyStats : generalData.yearlyStats;
    const current = currentYearStats?.[month];
    const prev = month > 0 ? currentYearStats?.[month - 1] : null;

    const currentRev = (current?.serviceRevenue || 0) + (current?.generalIncome || 0);
    const prevRev = prev ? (prev.serviceRevenue || 0) + (prev.generalIncome || 0) : null;
    const revDiffPct =
      prevRev !== null && prevRev > 0
        ? Math.round(((currentRev - prevRev) / prevRev) * 100)
        : null;

    const currentExp = current?.generalExpense || 0;
    const prevExp = prev ? prev.generalExpense || 0 : null;
    const expDiffPct =
      prevExp !== null && prevExp > 0
        ? Math.round(((currentExp - prevExp) / prevExp) * 100)
        : null;

    return {
      currentRev,
      prevRev,
      revDiffPct,
      currentExp,
      prevExp,
      expDiffPct,
    };
  }, [yearlyStats, generalData.yearlyStats, month]);

  // 3. Projeção de Fechamento de Caixa
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

  // 4. Dias Mais Fortes da Barbearia (Agrupado por dia da semana)
  const strongDaysStats = useMemo(() => {
    const dayTotals: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    (businessData.monthlyStats || []).forEach((stat) => {
      if (stat.dateKey) {
        const parts = stat.dateKey.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12);
          const dayIndex = d.getDay();
          dayTotals[dayIndex] = (dayTotals[dayIndex] || 0) + (stat.revenue || 0);
        }
      }
    });

    const totalRev = Object.values(dayTotals).reduce((a, b) => a + b, 0) || 1;
    // Ordenar por maior receita, mas mostrar todos os dias ativos
    return [1, 2, 3, 4, 5, 6, 0] // Seg a Dom
      .map((dayIdx) => ({
        dayIdx,
        name: DAY_NAMES[dayIdx],
        revenue: dayTotals[dayIdx],
        percentage: Math.round((dayTotals[dayIdx] / totalRev) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [businessData.monthlyStats]);

  // 5. Custos Fixos vs Gastos Variáveis
  const { fixedTotal, variableTotal, categoryList, totalExpenseAmount } = useMemo(() => {
    const cats = (generalData.expenseCategoryEvolution || [])
      .map((cat) => {
        const amount = cat.monthlyRealized?.[month] || 0;
        const isFixed = cat.isVariable === false;
        return {
          name: cat.name,
          color: cat.color || '#f43f5e',
          amount,
          isFixed,
        };
      })
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const fixed = cats.reduce((sum, c) => (c.isFixed ? sum + c.amount : sum), 0);
    const variable = cats.reduce((sum, c) => (!c.isFixed ? sum + c.amount : sum), 0);

    return {
      fixedTotal: fixed,
      variableTotal: variable,
      categoryList: cats,
      totalExpenseAmount: fixed + variable,
    };
  }, [generalData.expenseCategoryEvolution, month]);

  const fixedPct = Math.round((fixedTotal / (totalExpenseAmount || 1)) * 100);
  const variablePct = 100 - fixedPct;

  return (
    <div className="space-y-4 pb-16">
      {/* SELETOR DE GRANULARIDADE TEMPORAL */}
      <div className="p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPeriodMode('yearly')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            periodMode === 'yearly'
              ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Anual
        </button>
        <button
          type="button"
          onClick={() => setPeriodMode('monthly')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            periodMode === 'monthly'
              ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => setPeriodMode('weekly')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            periodMode === 'weekly'
              ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Semanal
        </button>
      </div>

      {/* SELETOR DE SEMANAS (QUANDO MODO SEMANAL ESTIVER ATIVO) */}
      {periodMode === 'weekly' && generalData.weeksMeta && generalData.weeksMeta.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {generalData.weeksMeta.map((week) => {
            const isSelected = selectedWeekIndex === week.index;
            return (
              <button
                key={week.index}
                type="button"
                onClick={() => setSelectedWeekIndex(week.index)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                  isSelected
                    ? 'bg-zinc-800 border-emerald-500/50 text-emerald-400'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {week.shortLabel || week.label}
              </button>
            );
          })}
        </div>
      )}

      {/* BLOCO 1: CARDS ANALÍTICOS (MÊS A MÊS & PROJEÇÃO DE FECHAMENTO) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Comparativo Mês a Mês */}
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              MoM Receita
            </span>
            {momComparison.revDiffPct !== null && (
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                  momComparison.revDiffPct >= 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {momComparison.revDiffPct >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {momComparison.revDiffPct >= 0 ? `+${momComparison.revDiffPct}%` : `${momComparison.revDiffPct}%`}
              </span>
            )}
          </div>
          <div>
            <div className="text-sm font-black text-zinc-100">
              {formatHidden(formatCurrency(momComparison.currentRev))}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {momComparison.prevRev !== null
                ? `vs ${formatHidden(formatCurrency(momComparison.prevRev))} (mês anterior)`
                : 'Mês de referência'}
            </p>
          </div>
        </div>

        {/* Card 2: Projeção de Fechamento Barbearia */}
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-blue-400" />
              Projeção Caixa
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {formattedMonth ? formattedMonth.slice(0, 3) : 'Mês'}
            </span>
          </div>
          <div>
            <div className="text-sm font-black text-blue-400">
              {formatHidden(formatCurrency(bizSummary.projectedProfit || bizSummary.netProfit))}
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {bizSummary.pendingExpenses > 0
                ? `${formatHidden(formatCurrency(bizSummary.pendingExpenses))} a vencer`
                : 'Todas as despesas pagas'}
            </p>
          </div>
        </div>
      </div>

      {/* BLOCO 2: EVOLUÇÃO GRÁFICA DO PERÍODO ATIVO */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              {periodMode === 'yearly' && 'Evolução Anual (Meses)'}
              {periodMode === 'monthly' && `Evolução Diária • ${formattedMonth || 'Mês'}`}
              {periodMode === 'weekly' && 'Evolução Semanal (Dias)'}
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

        {/* Totais Rápidos do Período */}
        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
          <div>
            <span className="text-[10px] text-zinc-400 block">Entradas</span>
            <span className="text-xs font-bold text-emerald-400">
              {formatHidden(formatCurrency(periodTotals.totalIncome))}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 block">Saídas</span>
            <span className="text-xs font-bold text-rose-400">
              {formatHidden(formatCurrency(periodTotals.totalExpense))}
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

        {/* Gráfico de Barras Proporcionais */}
        {currentChartStats.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-6">
            Nenhum dado financeiro encontrado para este período.
          </p>
        ) : (
          <div className="pt-2 overflow-x-auto no-scrollbar">
            <div
              className={`flex items-end justify-between gap-1.5 h-36 pt-4 px-1 ${
                periodMode === 'monthly' ? 'min-w-[620px]' : 'min-w-full'
              }`}
            >
              {currentChartStats.map((stat, idx) => {
                const totalIncome = (stat.generalIncome || 0) + (stat.serviceRevenue || 0);
                const totalExpense = stat.generalExpense || 0;

                const incomeHeight = Math.max(
                  6,
                  Math.round((totalIncome / maxChartValue) * 100)
                );
                const expenseHeight = Math.max(
                  6,
                  Math.round((totalExpense / maxChartValue) * 100)
                );

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                  >
                    <div className="flex items-end gap-1 w-full justify-center h-24">
                      {/* Barra Entrada */}
                      <div
                        style={{ height: `${incomeHeight}%` }}
                        className="w-2 sm:w-2.5 bg-emerald-500 rounded-t-sm transition-all duration-300"
                        title={`Entradas: ${formatCurrency(totalIncome)}`}
                      />
                      {/* Barra Saída */}
                      <div
                        style={{ height: `${expenseHeight}%` }}
                        className="w-2 sm:w-2.5 bg-rose-500/80 rounded-t-sm transition-all duration-300"
                        title={`Saídas: ${formatCurrency(totalExpense)}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[32px] text-center">
                      {stat.label || `P${idx + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BLOCO 3: INTELIGÊNCIA OPERACIONAL DA BARBEARIA */}
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

        {/* Dias Mais Fortes da Semana */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              Dias Mais Fortes no Mês
            </span>
            <span className="text-[10px] text-zinc-400 uppercase">Receita no dia</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {strongDaysStats.slice(0, 4).map((day) => (
              <div
                key={day.dayIdx}
                className="p-2 bg-zinc-950/60 rounded-xl border border-zinc-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-zinc-200">{day.name}</span>
                    <span className="text-[10px] font-bold text-emerald-400">
                      {day.percentage}%
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-zinc-400">
                    {formatHidden(formatCurrency(day.revenue))}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-400">
                  #{strongDaysStats.indexOf(day) + 1}
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

      {/* BLOCO 4: RAIO-X DE GASTOS (FIXOS VS VARIÁVEIS & CATEGORIAS) */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Raio-X de Gastos do Mês
            </h3>
          </div>
          <span className="text-xs font-extrabold text-rose-400">
            {formatHidden(formatCurrency(totalExpenseAmount))}
          </span>
        </div>

        {/* Divisão Fixos vs Variáveis */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Fixos vs Variáveis</span>
            <span className="font-semibold text-zinc-300">
              {fixedPct}% Fixos • {variablePct}% Variáveis
            </span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full flex overflow-hidden">
            <div
              style={{ width: `${fixedPct}%` }}
              className="bg-amber-500 h-full transition-all duration-300"
              title={`Custos Fixos: ${fixedPct}%`}
            />
            <div
              style={{ width: `${variablePct}%` }}
              className="bg-rose-500 h-full transition-all duration-300"
              title={`Gastos Variáveis: ${variablePct}%`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800">
              <span className="text-[10px] font-bold text-amber-400 block">Custos Fixos</span>
              <span className="text-xs font-extrabold text-zinc-200">
                {formatHidden(formatCurrency(fixedTotal))}
              </span>
            </div>
            <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800">
              <span className="text-[10px] font-bold text-rose-400 block">Gastos Variáveis</span>
              <span className="text-xs font-extrabold text-zinc-200">
                {formatHidden(formatCurrency(variableTotal))}
              </span>
            </div>
          </div>
        </div>

        {/* Ranking de Categorias de Despesas */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          <span className="text-xs font-bold text-zinc-300 block">
            Distribuição por Categoria
          </span>

          {categoryList.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-4">
              Nenhuma despesa registrada neste mês.
            </p>
          ) : (
            <div className="space-y-3 pt-1">
              {(showAllCategories ? categoryList : categoryList.slice(0, 5)).map((cat, idx) => {
                const pct = Math.min(
                  100,
                  Math.round((cat.amount / (totalExpenseAmount || 1)) * 100)
                );

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-200">{cat.name}</span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                            cat.isFixed
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {cat.isFixed ? 'Fixo' : 'Variável'}
                        </span>
                      </div>
                      <span className="text-zinc-400 font-bold">
                        {formatHidden(formatCurrency(cat.amount))} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        className="h-full rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })}

              {categoryList.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((prev) => !prev)}
                  className="w-full py-2 flex items-center justify-center gap-1 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {showAllCategories ? (
                    <>
                      <span>Ver menos categorias</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Ver todas as {categoryList.length} categorias</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
