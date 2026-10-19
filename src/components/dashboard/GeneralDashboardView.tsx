'use client';

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
  Scissors,
} from 'lucide-react';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { CreditCardWithUsage } from '@/lib/actions/credit-cards';
import { Transaction } from '@/types/database';
import { MonthlyGeneralStat } from '@/lib/actions/dashboard';
import { SmoothLineChart, ChartSeries } from './SmoothLineChart';
import { MonthlyBarChart } from './MonthlyBarChart';
import { CategoryDonutChart } from './CategoryDonutChart';
import { formatCurrency, formatDate } from '@/lib/utils';

interface GeneralDashboardViewProps {
  yearlyStats: MonthlyGeneralStat[];
  transactions: Transaction[];
  accounts: AccountWithBalance[];
  cards: CreditCardWithUsage[];
  formattedMonth: string;
  loading?: boolean;
  onEditBalance?: (account: AccountWithBalance) => void;
}

export function GeneralDashboardView({
  yearlyStats,
  transactions,
  accounts,
  cards,
  formattedMonth,
  loading = false,
  onEditBalance,
}: GeneralDashboardViewProps) {
  // Configuração das 3 curvas solicitadas pelo usuário:
  // 1. Saldo de serviços (verde)
  // 2. Saldo geral (azul)
  // 3. Balanço de entrada e saída geral (âmbar)
  const chartSeries: ChartSeries[] = [
    {
      id: 'serviceRevenue',
      name: 'Saldo de Serviços',
      color: '#22c55e', // Verde esmeralda
      values: yearlyStats.map((s) => s.serviceRevenue),
      formatValue: (v) => formatCurrency(v),
    },
    {
      id: 'generalIncome',
      name: 'Saldo Geral (Entradas)',
      color: '#3b82f6', // Azul
      values: yearlyStats.map((s) => s.generalIncome),
      formatValue: (v) => formatCurrency(v),
    },
    {
      id: 'netBalance',
      name: 'Balanço Geral (Entrada - Saída)',
      color: '#f59e0b', // Âmbar
      values: yearlyStats.map((s) => s.netBalance),
      formatValue: (v) => formatCurrency(v),
    },
  ];

  // Cálculos do mês atual
  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0);
  const totalCardLimit = cards.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);
  const totalCardUsed = cards.reduce((sum, c) => sum + Number(c.used_limit || 0), 0);

  let receivedIncome = 0;
  let pendingIncome = 0;
  let barberShopIncome = 0;
  let otherIncome = 0;
  let paidExpense = 0;
  let pendingExpense = 0;

  for (const t of transactions) {
    const amt = Number(t.amount);
    if (t.type === 'income') {
      const isBarber =
        t.description.startsWith('Atendimento:') ||
        Boolean(t.notes?.includes('Atendimento')) ||
        Boolean(t.notes?.includes('Comanda:')) ||
        Boolean(t.category?.name?.toLowerCase().includes('barbearia')) ||
        Boolean(t.category?.name?.toLowerCase().includes('serviço'));

      if (isBarber) {
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

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Gráfico Geral com as 3 Curvas Solicitadas */}
      <SmoothLineChart
        title="Vendas, Receitas e Balanço Geral Mensal"
        series={chartSeries}
        height={280}
      />

      {/* Cards de Resumo Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Saldo em Contas */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Saldo Total em Contas
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">{formatCurrency(totalBalance)}</h2>
            <span className="text-[11px] text-zinc-500 mt-1 block">
              {accounts.length} {accounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
            </span>
          </div>
        </div>

        {/* Card Faturas de Cartão */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Faturas / Limite Usado
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-purple-300">{formatCurrency(totalCardUsed)}</h2>
            <span className="text-[11px] text-zinc-500 mt-1 block">
              de {formatCurrency(totalCardLimit)} limite total
            </span>
          </div>
        </div>

        {/* Card Receitas do Mês */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Receitas do Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-1">
              <h2 className="text-2xl font-bold text-emerald-400">{formatCurrency(receivedIncome)}</h2>
              {pendingIncome > 0 && (
                <span className="text-xs font-semibold text-zinc-400">
                  Total: {formatCurrency(totalIncome)}
                </span>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Scissors className="w-3 h-3" /> Barbearia: {formatCurrency(barberShopIncome)}
              </span>
              {otherIncome > 0 && (
                <span className="text-zinc-400 font-medium">
                  Outras: {formatCurrency(otherIncome)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card Despesas do Mês */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Despesas Pagas
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-rose-400">{formatCurrency(paidExpense)}</h2>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              {loading
                ? 'Calculando...'
                : pendingExpense > 0
                ? `+ ${formatCurrency(pendingExpense)} a pagar`
                : 'Todas as contas pagas'}
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos Visuais do Mês */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyBarChart transactions={transactions} />
        <CategoryDonutChart transactions={transactions} />
      </div>

      {/* Grid: Contas, Cartões e Últimas Transações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Minhas Contas */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-zinc-100 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-400" />
              Minhas Contas
            </h3>
            <Link href="/contas" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium">
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {accounts.map((acc) => (
              <div key={acc.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: acc.color || '#3b82f6' }}
                  />
                  <span className="text-sm font-medium text-zinc-200">{acc.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onEditBalance && onEditBalance(acc)}
                  className="flex items-center gap-1.5 hover:text-emerald-400 group/bal transition"
                  title="Editar saldo"
                >
                  <span className="text-sm font-bold text-zinc-100 group-hover/bal:text-emerald-400 transition">
                    {formatCurrency(acc.current_balance)}
                  </span>
                  <Pencil className="w-3 h-3 text-zinc-500 opacity-60 group-hover/bal:opacity-100 group-hover/bal:text-emerald-400 transition" />
                </button>
              </div>
            ))}

            {accounts.length === 0 && (
              <p className="py-6 text-center text-xs text-zinc-500">
                Nenhuma conta cadastrada ainda.
              </p>
            )}
          </div>
        </div>

        {/* Meus Cartões */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-zinc-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-400" />
              Meus Cartões
            </h3>
            <Link href="/cartoes" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {cards.map((card) => (
              <div key={card.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: card.color || '#8b5cf6' }}
                  />
                  <div>
                    <span className="text-sm font-medium text-zinc-200 block">{card.name}</span>
                    <span className="text-[10px] text-zinc-500">Vence dia {card.due_day}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-purple-300 block">
                    {formatCurrency(card.used_limit)}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Disp: {formatCurrency(card.available_limit)}
                  </span>
                </div>
              </div>
            ))}

            {cards.length === 0 && (
              <p className="py-6 text-center text-xs text-zinc-500">
                Nenhum cartão cadastrado ainda.
              </p>
            )}
          </div>
        </div>

        {/* Últimos Lançamentos do Mês */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-zinc-100 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
              Lançamentos do Mês
            </h3>
            <Link href="/transacoes" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {recentTransactions.map((t) => {
              const isIncome = t.type === 'income';

              return (
                <div key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-200 block truncate">
                      {t.description}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {formatDate(t.due_date)} • {t.category?.name || 'Geral'}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold shrink-0 ${
                      isIncome ? 'text-emerald-400' : 'text-zinc-200'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {formatCurrency(Number(t.amount))}
                  </span>
                </div>
              );
            })}

            {recentTransactions.length === 0 && (
              <p className="py-6 text-center text-xs text-zinc-500">
                Nenhum lançamento registrado em {formattedMonth}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

