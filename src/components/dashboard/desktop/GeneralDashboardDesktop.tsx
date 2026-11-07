'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Landmark,
  ArrowLeftRight,
  Pencil,
  Plus,
  ArrowRightLeft,
  PieChart,
} from 'lucide-react';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { CreditCardWithUsage } from '@/lib/actions/credit-cards';
import { getCardInvoiceStatus } from '@/lib/credit-card-utils';
import { Transaction } from '@/types/database';
import {
  GeneralDashboardData,
  MonthlyGeneralStat,
  getGeneralDashboardData,
} from '@/lib/actions/dashboard';
import { useDateContext } from '@/context/DateContext';
import dynamic from 'next/dynamic';
import { SmoothLineChart, ChartSeries } from '../SmoothLineChart';
import {
  ChartPeriodToolbar,
  ChartViewPeriod,
  useIndependentChartPeriod,
} from '../ChartPeriodToolbar';
import { MonthlyBarChart } from '../MonthlyBarChart';
import { CategoryDonutChart } from '../CategoryDonutChart';
import { isBarbeariaServiceIncome } from '@/lib/business-scope-utils';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Store } from 'lucide-react';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { WalletInvoiceCard } from '@/components/cards/WalletInvoiceCard';

const CategoryEvolutionModal = dynamic(
  () => import('../CategoryEvolutionModal').then((m) => m.CategoryEvolutionModal),
  { ssr: false }
);

export type ChartPeriod = ChartViewPeriod;

export interface GeneralDashboardDesktopProps {
  generalData?: GeneralDashboardData;
  yearlyStats?: MonthlyGeneralStat[];
  upcomingBills?: Transaction[];
  onBillPaid?: (billId: string) => void;
  pendingReceipts?: Transaction[];
  onReceiptConfirmed?: (receiptId: string) => void;
  transactions: Transaction[];
  accounts: AccountWithBalance[];
  cards: CreditCardWithUsage[];
  formattedMonth: string;
  loading?: boolean;
  onEditBalance?: (account: AccountWithBalance) => void;
}

export function GeneralDashboardDesktop({
  generalData,
  yearlyStats = [],
  transactions,
  accounts,
  cards,
  formattedMonth,
  loading = false,
  onEditBalance,
}: GeneralDashboardDesktopProps) {
  const { month, year } = useDateContext();
  const { hasBusiness, businessName } = useBusinessProfile();
  const { showValues } = useMobileNavigation();
  const formatHidden = (val: string) => (showValues ? val : '••••••');
  const [evolutionModalState, setEvolutionModalState] = useState<{
    type: 'income' | 'expense';
    refMonth: number;
    refYear: number;
  } | null>(null);

  // Período e referência independentes para o Gráfico 1: Fluxo
  const flowChart = useIndependentChartPeriod(
    year,
    month,
    generalData,
    yearlyStats,
    getGeneralDashboardData
  );

  // Período e referência independentes para o Gráfico 2: Evolução do Saldo em Contas
  const balanceChart = useIndependentChartPeriod(
    year,
    month,
    generalData,
    yearlyStats,
    getGeneralDashboardData
  );

  // 1. Gráfico de Fluxo (3 curvas com identidade Canário estrita)
  const flowSeries: ChartSeries[] = [
    {
      id: 'serviceRevenue',
      name: 'Saldo de Serviços',
      color: '#38BDF8', // Azul Safira
      values: flowChart.activeStats.map((s) => s.serviceRevenue),
      formatValue: (v) => formatHidden(formatCurrency(v)),
    },
    {
      id: 'generalIncome',
      name: 'Saldo Geral (Entradas)',
      color: '#94A3B8', // Ardósia Metálico
      values: flowChart.activeStats.map((s) => s.generalIncome),
      formatValue: (v) => formatHidden(formatCurrency(v)),
    },
    {
      id: 'netBalance',
      name: 'Balanço Geral (Entrada - Saída)',
      color: '#FACC15', // Canário Radiante
      values: flowChart.activeStats.map((s) => s.netBalance),
      formatValue: (v) => formatHidden(formatCurrency(v)),
    },
  ];

  // 2. Gráfico Dedicado: Evolução do Saldo em Contas (1 curva)
  const balanceSeries: ChartSeries[] = [
    {
      id: 'accountBalance',
      name: 'Saldo em Contas',
      color: '#FACC15', // Canário Radiante
      values: balanceChart.activeStats.map((s) => s.accountBalance),
      formatValue: (v) => formatHidden(formatCurrency(v)),
    },
  ];

  const flowLabels = flowChart.activeStats.map((s) => s.label);
  const flowTooltipLabels = flowChart.activeStats.map((s) => s.fullLabel || s.label);

  const balanceLabels = balanceChart.activeStats.map((s) => s.label);
  const balanceTooltipLabels = balanceChart.activeStats.map((s) => s.fullLabel || s.label);

  // Cálculos do mês atual
  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0);

  let receivedIncome = 0;
  let pendingIncome = 0;
  let barberShopIncome = 0;
  let otherIncome = 0;
  let paidExpense = 0;
  let pendingExpense = 0;

  for (const t of transactions) {
    const amt = Number(t.amount);
    if (t.type === 'income') {
      if (isBarbeariaServiceIncome(t)) {
        barberShopIncome += amt;
      } else {
        otherIncome += amt;
      }

      if (t.is_paid) receivedIncome += amt;
      else pendingIncome += amt;
    } else if (t.type === 'expense') {
      if (t.is_paid) paidExpense += amt;
      else pendingExpense += amt;
    }
  }

  const totalIncome = receivedIncome + pendingIncome;
  const receivedIncomePct =
    totalIncome > 0
      ? Math.min(100, Math.round((receivedIncome / totalIncome) * 100))
      : receivedIncome > 0
      ? 100
      : 0;

  let totalCurrentInvoice = 0;
  let totalUsed = 0;
  let totalAvailable = 0;
  for (const c of cards) {
    totalCurrentInvoice += Number(c.current_invoice || 0);
    totalUsed += Number(c.used_limit || 0);
    totalAvailable += Number(c.available_limit || 0);
  }

  const paidExpenseTotal = paidExpense + totalCurrentInvoice;
  const totalExpectedExpense = paidExpense + pendingExpense + totalCurrentInvoice;
  const paidExpensePct =
    totalExpectedExpense > 0
      ? Math.min(100, Math.round((paidExpenseTotal / totalExpectedExpense) * 100))
      : paidExpenseTotal > 0
      ? 100
      : 0;

  const recentTransactions = transactions
    .filter((t) => !(t.recurrence_id && !t.is_paid))
    .slice(0, 5);

  return (
    <div className="space-y-6 min-w-0">
      {/* 1. Primeira Linha: Indicadores principais na ordem Entradas -> Saídas -> Resultado (~145px) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-w-0">
        {/* Coluna 1: Entradas (Receitas do Mês) */}
        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between shadow-sm min-w-0">
          <div className="flex items-center justify-between text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Receitas do Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-400 tabular-nums">
              {formatHidden(formatCurrency(receivedIncome))}
            </h2>

            {/* Barra de Progresso / Realização da Receita */}
            <div className="my-2">
              <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mb-1">
                <span className="font-medium text-emerald-400">{receivedIncomePct}% recebido</span>
                <span>{pendingIncome > 0 ? `Restam ${formatHidden(formatCurrency(pendingIncome))}` : '100% liquidado'}</span>
              </div>
              <div className="w-full h-1.5 bg-[#080B11] rounded-full overflow-hidden border border-[#1E293B]">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${receivedIncomePct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mt-1 tabular-nums">
              <span>{pendingIncome > 0 ? `Total: ${formatHidden(formatCurrency(totalIncome))}` : 'Meta concluída'}</span>
              {hasBusiness && (
                <span className="text-[#64748B] truncate">{businessName}: {formatHidden(formatCurrency(barberShopIncome))}</span>
              )}
            </div>
          </div>
        </div>

        {/* Coluna 2: Saídas (Despesas Pagas + Faturas de Cartões) */}
        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between shadow-sm min-w-0">
          <div className="flex items-center justify-between text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Despesas & Gastos
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-rose-400 tabular-nums">
              {formatHidden(formatCurrency(paidExpenseTotal))}
            </h2>

            {/* Barra de Progresso / Realização da Despesa */}
            <div className="my-2">
              <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mb-1">
                <span className="font-medium text-rose-400">{paidExpensePct}% liquidado</span>
                <span>{pendingExpense > 0 ? `A pagar: ${formatHidden(formatCurrency(pendingExpense))}` : 'Faturas somadas'}</span>
              </div>
              <div className="w-full h-1.5 bg-[#080B11] rounded-full overflow-hidden border border-[#1E293B]">
                <div
                  className="h-full bg-rose-400 rounded-full transition-all duration-500"
                  style={{ width: `${paidExpensePct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mt-1 tabular-nums">
              <span>Pagas: {formatHidden(formatCurrency(paidExpense))}</span>
              <span>Faturas: {formatHidden(formatCurrency(totalCurrentInvoice))}</span>
            </div>
          </div>
        </div>

        {/* Coluna 3: Resultado Líquido & Saldo em Contas */}
        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between shadow-sm min-w-0 md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#FACC15]">
              Saldo Total em Contas
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FACC15]/10 border border-[#FACC15]/20 flex items-center justify-center text-[#FACC15] shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#F8FAFC] tabular-nums">{formatHidden(formatCurrency(totalBalance))}</h2>

            {/* Indicador de Balanço Operacional Mensal */}
            <div className="my-2">
              <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mb-1">
                <span className="text-[#94A3B8]">Resultado no mês</span>
                <span className={receivedIncome - paidExpenseTotal >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {receivedIncome - paidExpenseTotal >= 0 ? '+' : ''}{formatHidden(formatCurrency(receivedIncome - paidExpenseTotal))}
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#080B11] rounded-full overflow-hidden border border-[#1E293B]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    receivedIncome >= paidExpenseTotal ? 'bg-[#FACC15]' : 'bg-rose-500'
                  }`}
                  style={{
                    width: `${
                      receivedIncome > 0
                        ? Math.min(100, Math.max(12, Math.round((Math.max(0, receivedIncome - paidExpenseTotal) / receivedIncome) * 100)))
                        : 20
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mt-1 tabular-nums">
              <span className={receivedIncome - paidExpense >= 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                Balanço: {formatHidden(formatCurrency(receivedIncome - paidExpense))}
              </span>
              <span className="text-[#64748B]">
                {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Segunda Linha: Visão Analítica Simétrica (50% Receitas / 50% Despesas Lado a Lado) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
        {/* Esquerda (50%): Evolução de Entradas & Receitas por Categoria */}
        <div className="min-w-0">
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
        </div>

        {/* Direita (50%): Distribuição de Saídas & Gastos por Categoria */}
        <div className="min-w-0">
          <CategoryDonutChart
            transactions={transactions}
            expenseEvolution={generalData?.expenseCategoryEvolution || []}
            currentMonth={month}
            year={year}
            onExpandEvolution={(refMonth, refYear) =>
              setEvolutionModalState({ type: 'expense', refMonth, refYear })
            }
          />
        </div>
      </div>

      {/* 3. Terceira Linha: Detalhamento Operacional (Cartões Interativos, Lançamentos e Contas) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-w-0">
        {/* Bloco 1 (Proporção 1): Carteira Multi-Cartão Interativa */}
        <div className="xl:col-span-4 min-w-0">
          <WalletInvoiceCard
            cards={cards}
            showValues={showValues}
          />
        </div>

        {/* Bloco 2 (Proporção 1.3 - Central Expandido): Lançamentos Recentes do Mês */}
        <div className="xl:col-span-5 p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl space-y-4 shadow-sm min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[#F8FAFC] flex items-center gap-2 text-sm sm:text-base">
                <ArrowLeftRight className="w-4 h-4 text-[#FACC15]" />
                Lançamentos do Mês
              </h3>
              <Link href="/transacoes" className="text-xs text-[#FACC15] hover:text-[#FDE047] flex items-center gap-1 font-medium transition-colors">
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#1E293B]/80 max-h-[340px] overflow-y-auto scrollbar-thin">
              {recentTransactions.map((t) => {
                const isIncome = t.type === 'income';

                return (
                  <div key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-[#F8FAFC] block truncate">
                        {t.description}
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        {formatDate(t.due_date)} • {t.category?.name || 'Geral'}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold shrink-0 tabular-nums ${
                        isIncome ? 'text-emerald-400' : 'text-[#F8FAFC]'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatCurrency(Number(t.amount))}
                    </span>
                  </div>
                );
              })}

              {recentTransactions.length === 0 && (
                <p className="py-8 text-center text-xs text-[#64748B]">
                  Nenhum lançamento registrado em {formattedMonth}.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bloco 3 (Proporção 1): Minhas Contas Bancárias */}
        <div className="xl:col-span-3 p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl space-y-4 shadow-sm min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[#F8FAFC] flex items-center gap-2 text-sm sm:text-base">
                <Landmark className="w-4 h-4 text-[#FACC15]" />
                Minhas Contas
              </h3>
              <Link href="/contas" className="text-xs text-[#FACC15] hover:text-[#FDE047] flex items-center gap-1 font-medium transition-colors">
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#1E293B]/80 max-h-[340px] overflow-y-auto scrollbar-thin">
              {accounts.map((acc) => (
                <div key={acc.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: acc.color || '#3b82f6' }}
                    />
                    <span className="text-sm font-medium text-[#F8FAFC] truncate">{acc.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditBalance && onEditBalance(acc)}
                    className="flex items-center gap-1.5 hover:text-[#FACC15] group/bal transition shrink-0 cursor-pointer"
                    title="Editar saldo"
                  >
                    <span className="text-sm font-bold text-[#F8FAFC] group-hover/bal:text-[#FACC15] tabular-nums transition">
                      {formatCurrency(acc.current_balance)}
                    </span>
                    <Pencil className="w-3 h-3 text-[#64748B] opacity-60 group-hover/bal:opacity-100 group-hover/bal:text-[#FACC15] transition" />
                  </button>
                </div>
              ))}

              {accounts.length === 0 && (
                <p className="py-8 text-center text-xs text-[#64748B]">
                  Nenhuma conta cadastrada ainda.
                </p>
              )}
            </div>

            {/* Preenchimento inteligente quando há poucas contas: Concentração de Liquidez e Ações Rápidas */}
            {accounts.length > 0 && accounts.length <= 2 && (
              <div className="mt-3 space-y-3">
                <div className="p-3 bg-[#080B11]/80 border border-[#1E293B]/70 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                    <span className="font-semibold uppercase tracking-wider text-[10px] text-[#94A3B8]">
                      Concentração de Saldo
                    </span>
                    <span className="text-[#FACC15] font-medium text-[10px]">
                      {accounts.length === 1 ? '100% nesta conta' : 'Distribuição'}
                    </span>
                  </div>
                  {accounts.map((acc) => {
                    const pct =
                      totalBalance > 0
                        ? Math.max(
                            0,
                            Math.min(
                              100,
                              Math.round(
                                (Number(acc.current_balance || 0) / totalBalance) * 100
                              )
                            )
                          )
                        : 0;
                    return (
                      <div key={`dist-${acc.id}`} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span className="truncate max-w-[120px]">{acc.name}</span>
                          <span className="tabular-nums font-medium text-zinc-200">{pct}%</span>
                        </div>
                        <div className="w-full h-1 bg-[#1E293B] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: acc.color || '#3b82f6',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ações Rápidas */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/contas"
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#1E293B]/40 hover:bg-[#1E293B] border border-[#1E293B] text-[11px] font-medium text-zinc-300 hover:text-white transition"
                  >
                    <Plus className="w-3 h-3 text-[#FACC15]" />
                    Nova Conta
                  </Link>
                  <Link
                    href="/transacoes"
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#1E293B]/40 hover:bg-[#1E293B] border border-[#1E293B] text-[11px] font-medium text-zinc-300 hover:text-white transition"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-[#38BDF8]" />
                    Transferir
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#1E293B]/80 flex items-center justify-between text-xs">
            <span className="text-[#64748B]">Saldo Total</span>
            <span className="font-bold text-[#FACC15] text-sm tabular-nums">
              {formatCurrency(totalBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Quarta Linha: Curvas Históricas de Fluxo Consolidado e Evolução do Saldo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0 pt-2">
        <div className="min-w-0">
          <SmoothLineChart
            title="Fluxo de Caixa Consolidado"
            subtitle={flowChart.subtitle}
            series={flowSeries}
            labels={flowLabels}
            tooltipLabels={flowTooltipLabels}
            height={270}
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

        <div className="min-w-0">
          <SmoothLineChart
            title="Evolução do Saldo em Contas"
            subtitle={balanceChart.subtitle}
            series={balanceSeries}
            labels={balanceLabels}
            tooltipLabels={balanceTooltipLabels}
            height={270}
            dynamicYScale
            rightAction={
              <ChartPeriodToolbar
                period={balanceChart.period}
                onPeriodChange={balanceChart.setPeriod}
                year={balanceChart.year}
                month={balanceChart.month}
                onYearChange={balanceChart.handleYearChange}
                onMonthChange={balanceChart.handleMonthChange}
                weeksMeta={balanceChart.weeksMeta}
                selectedWeekIndex={balanceChart.selectedWeekIndex}
                onWeekChange={balanceChart.handleWeekChange}
                loading={balanceChart.loading}
              />
            }
          />
        </div>
      </div>

      {/* Modal de Evolução de Receitas ou Despesas por Categoria */}
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

