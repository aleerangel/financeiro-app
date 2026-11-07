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

  const recentTransactions = transactions
    .filter((t) => !(t.recurrence_id && !t.is_paid))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 1. Primeira Linha: Indicadores principais em 3 colunas de larguras equivalentes (gap ~16px, altura ~134px) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Coluna 1: Saldo Total em Contas */}
        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between min-h-[134px] shadow-sm">
          <div className="flex items-center justify-between text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Saldo Total em Contas
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FACC15]/10 border border-[#FACC15]/20 flex items-center justify-center text-[#FACC15] shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#F8FAFC] tabular-nums">{formatHidden(formatCurrency(totalBalance))}</h2>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              {accounts.length} {accounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
            </span>
          </div>
        </div>

        {/* Coluna 2: Fatura Atual com Carteira Multi-Cartão */}
        <div className="min-h-[134px]">
          <WalletInvoiceCard
            cards={cards}
            showValues={showValues}
          />
        </div>

        {/* Coluna 3: Fluxo Operacional (Receitas do Mês & Despesas Pagas) */}
        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex flex-col justify-between min-h-[134px] shadow-sm">
          <div className="grid grid-cols-2 gap-3 divide-x divide-[#1E293B]/80 h-full">
            <div className="flex flex-col justify-between pr-1">
              <div className="flex items-center justify-between text-[#94A3B8] mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider truncate">
                  Receitas
                </span>
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold text-emerald-400 block tabular-nums">
                  {formatHidden(formatCurrency(receivedIncome))}
                </span>
                {pendingIncome > 0 ? (
                  <span className="text-[10px] text-[#94A3B8] block truncate">
                    Total: {formatHidden(formatCurrency(totalIncome))}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#64748B] block truncate">
                    {hasBusiness ? `${businessName}: ${formatHidden(formatCurrency(barberShopIncome))}` : '100% recebido'}
                  </span>
                )}
              </div>
            </div>

            <div className="pl-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#94A3B8] mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider truncate">
                  Despesas
                </span>
                <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold text-rose-400 block tabular-nums">
                  {formatHidden(formatCurrency(paidExpense))}
                </span>
                <span className="text-[10px] text-[#94A3B8] block truncate">
                  {loading
                    ? 'Calculando...'
                    : pendingExpense > 0
                    ? `+ ${formatHidden(formatCurrency(pendingExpense))} aberto`
                    : 'Todas pagas'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Segunda Linha: Gráfico Principal (~2/3) e Bloco Lateral (~1/3) com gap ~20px */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna Esquerda (~2/3): Gráfico Principal de Fluxo */}
        <div className="lg:col-span-2">
          <SmoothLineChart
            title="Fluxo (Vendas, Receitas e Balanço)"
            subtitle={flowChart.subtitle}
            series={flowSeries}
            labels={flowLabels}
            tooltipLabels={flowTooltipLabels}
            height={280}
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

        {/* Coluna Direita (~1/3): Bloco Lateral de Gastos por Categoria */}
        <div className="lg:col-span-1">
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

      {/* 3. Terceira Linha: Três Blocos horizontais com proporção aproximada 1 : 1.3 : 1 e gap ~20px */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bloco 1 (1 parte): Minhas Contas */}
        <div className="lg:col-span-3 xl:col-span-4 p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#F8FAFC] flex items-center gap-2 text-sm sm:text-base">
              <Landmark className="w-4 h-4 text-[#FACC15]" />
              Minhas Contas
            </h3>
            <Link href="/contas" className="text-xs text-[#FACC15] hover:text-[#FDE047] flex items-center gap-1 font-medium transition-colors">
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#1E293B]/80 max-h-[300px] overflow-y-auto scrollbar-thin">
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
              <p className="py-6 text-center text-xs text-[#64748B]">
                Nenhuma conta cadastrada ainda.
              </p>
            )}
          </div>
        </div>

        {/* Bloco 2 (1.3 partes): Meus Cartões */}
        <div className="lg:col-span-5 xl:col-span-4 p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#F8FAFC] flex items-center gap-2 text-sm sm:text-base">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              Meus Cartões
            </h3>
            <Link href="/cartoes" className="text-xs text-[#FACC15] hover:text-[#FDE047] flex items-center gap-1 font-medium transition-colors">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#1E293B]/80 max-h-[300px] overflow-y-auto scrollbar-thin">
            {cards.map((card) => {
              const cardStatus = card.invoice_status || getCardInvoiceStatus(card);
              return (
                <div key={card.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: card.color || '#6366f1' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#F8FAFC] truncate block">{card.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border shrink-0 ${
                            cardStatus.isOpen
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {cardStatus.isOpen ? 'Aberta' : 'Fechada'}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#94A3B8] mt-0.5 truncate">
                        {cardStatus.isOpen ? (
                          <span>
                            <strong className="text-[#F8FAFC] font-semibold">{cardStatus.closingLabel}</strong>
                            {cardStatus.daysLeftLabel && (
                              <span className="text-[#64748B] ml-1">({cardStatus.daysLeftLabel})</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-amber-300 font-medium">{cardStatus.dueLabel}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-[#94A3B8] block font-medium">Fatura</span>
                    <span className="text-sm font-bold text-indigo-300 block tabular-nums">
                      {formatCurrency(card.current_invoice ?? 0)}
                    </span>
                    <div className="text-[10px] text-[#64748B] flex items-center justify-end gap-1.5 mt-0.5 tabular-nums">
                      <span className="text-emerald-400 font-medium">Disp: {formatCurrency(card.available_limit)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {cards.length === 0 && (
              <p className="py-6 text-center text-xs text-[#64748B]">
                Nenhum cartão cadastrado ainda.
              </p>
            )}
          </div>
        </div>

        {/* Bloco 3 (1 parte): Lançamentos do Mês */}
        <div className="lg:col-span-4 p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#F8FAFC] flex items-center gap-2 text-sm sm:text-base">
              <ArrowLeftRight className="w-4 h-4 text-[#FACC15]" />
              Lançamentos do Mês
            </h3>
            <Link href="/transacoes" className="text-xs text-[#FACC15] hover:text-[#FDE047] flex items-center gap-1 font-medium transition-colors">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#1E293B]/80 max-h-[300px] overflow-y-auto scrollbar-thin">
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
              <p className="py-6 text-center text-xs text-[#64748B]">
                Nenhum lançamento registrado em {formattedMonth}.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Painéis Analíticos Complementares com espaçamento de 24px */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
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

        <SmoothLineChart
          title="Evolução do Saldo em Contas"
          subtitle={balanceChart.subtitle}
          series={balanceSeries}
          labels={balanceLabels}
          tooltipLabels={balanceTooltipLabels}
          height={260}
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

