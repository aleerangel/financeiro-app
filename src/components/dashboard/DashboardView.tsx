'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ChevronRight,
  Landmark,
  ArrowLeftRight,
  Scissors,
} from 'lucide-react';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { CreditCardWithUsage } from '@/lib/actions/credit-cards';
import { Category, Transaction } from '@/types/database';
import { useDateContext } from '@/context/DateContext';
import { getTransactions } from '@/lib/actions/transactions';
import { syncMonthlyRecurrences } from '@/lib/actions/recurrences';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { CategoryDonutChart } from './CategoryDonutChart';
import { MonthlyBarChart } from './MonthlyBarChart';

interface DashboardViewProps {
  initialAccounts: AccountWithBalance[];
  initialCards: CreditCardWithUsage[];
  categories: Category[];
}

export function DashboardView({
  initialAccounts,
  initialCards,
  categories,
}: DashboardViewProps) {
  const { month, year, formattedMonth } = useDateContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      await syncMonthlyRecurrences(month, year);
      const data = await getTransactions(month, year);
      setTransactions(data);
    } catch (err) {
      console.error('Erro ao buscar transações do dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    let active = true;
    syncMonthlyRecurrences(month, year)
      .then(() => getTransactions(month, year))
      .then((data) => {
        if (active) {
          setTransactions(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar transações:', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [month, year]);

  // Cálculos consolidados
  const totalBalance = initialAccounts.reduce((acc, curr) => acc + curr.current_balance, 0);
  const totalCardUsed = initialCards.reduce((acc, curr) => acc + curr.used_limit, 0);
  const totalCardLimit = initialCards.reduce((acc, curr) => acc + Number(curr.credit_limit), 0);

  // Receitas Realizadas (Recebidas) vs Previstas (A Receber)
  const receivedIncome = transactions
    .filter((t) => t.type === 'income' && t.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const pendingIncome = transactions
    .filter((t) => t.type === 'income' && !t.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  // Despesas Realizadas (Pagas) vs Previstas (A Pagar)
  const paidExpense = transactions
    .filter((t) => t.type === 'expense' && t.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const pendingExpense = transactions
    .filter((t) => t.type === 'expense' && !t.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Boas-vindas e Ação Rápida */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Visão Geral</h1>
          <p className="text-sm text-zinc-400">Resumo financeiro de {formattedMonth}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/vendas"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-medium text-xs sm:text-sm rounded-xl transition border border-zinc-700/60 shadow-sm"
          >
            <Scissors className="w-4 h-4 text-emerald-400" />
            <span>Atendimento</span>
          </Link>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Cards de Resumo Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Saldo em Contas */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Saldo Total em Contas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">{formatCurrency(totalBalance)}</h2>
            <span className="text-[11px] text-zinc-500 mt-1 block">
              {initialAccounts.length} {initialAccounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
            </span>
          </div>
        </div>

        {/* Card Faturas de Cartão */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Faturas / Limite Usado</span>
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
            <span className="text-xs font-semibold uppercase tracking-wider">Receitas Recebidas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-400">{formatCurrency(receivedIncome)}</h2>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              {loading
                ? 'Calculando...'
                : pendingIncome > 0
                ? `+ ${formatCurrency(pendingIncome)} a receber`
                : 'Nenhuma receita pendente'}
            </span>
          </div>
        </div>

        {/* Card Despesas do Mês */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Despesas Pagas</span>
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
            <Link href="/contas" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {initialAccounts.map((acc) => (
              <div key={acc.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: acc.color || '#3b82f6' }}
                  />
                  <span className="text-sm font-medium text-zinc-200">{acc.name}</span>
                </div>
                <span className="text-sm font-bold text-zinc-100">
                  {formatCurrency(acc.current_balance)}
                </span>
              </div>
            ))}

            {initialAccounts.length === 0 && (
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
            <Link href="/cartoes" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {initialCards.map((card) => (
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

            {initialCards.length === 0 && (
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
            <Link href="/transacoes" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
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

      <TransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        accounts={initialAccounts}
        cards={initialCards}
        categories={categories}
        onSuccess={refreshData}
      />
    </div>
  );
}
