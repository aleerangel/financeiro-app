'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Landmark,
  ArrowLeftRight,
  Sparkles,
  Clock,
} from 'lucide-react';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { CreditCardWithUsage } from '@/lib/actions/credit-cards';
import { Transaction } from '@/types/database';
import { GeneralDashboardData } from '@/lib/actions/dashboard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { WalletInvoiceCard } from '@/components/cards/WalletInvoiceCard';

export interface GeneralDashboardMobileProps {
  generalData?: GeneralDashboardData;
  transactions: Transaction[];
  accounts: AccountWithBalance[];
  cards: CreditCardWithUsage[];
  formattedMonth: string;
  loading?: boolean;
  upcomingBills?: Transaction[];
  onBillPaid?: (billId: string) => void;
  pendingReceipts?: Transaction[];
  onReceiptConfirmed?: (receiptId: string) => void;
  onEditBalance?: (account: AccountWithBalance) => void;
}

export function GeneralDashboardMobile({
  transactions,
  accounts,
  cards,
  formattedMonth,
}: GeneralDashboardMobileProps) {
  const { showValues } = useMobileNavigation();

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + Number(acc.current_balance || 0),
    0
  );

  // Rendimentos ganhos acumulados no mês
  const totalYieldMonth = accounts.reduce(
    (sum, acc) => sum + Number(acc.total_yield_current_month || 0),
    0
  );

  const receivedIncome = transactions
    .filter((t) => t.type === 'income' && t.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const pendingIncomeTransactions = useMemo(() => {
    return transactions.filter((t) => t.type === 'income' && !t.is_paid);
  }, [transactions]);

  const pendingIncome = useMemo(() => {
    return pendingIncomeTransactions.reduce((acc, curr) => acc + Number(curr.amount), 0);
  }, [pendingIncomeTransactions]);

  const pendingIncomeCount = pendingIncomeTransactions.length;

  const paidExpense = transactions
    .filter((t) => t.type === 'expense' && t.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const pendingExpense = transactions
    .filter((t) => t.type === 'expense' && !t.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const recentTransactions = transactions
    .filter((t) => !(t.recurrence_id && !t.is_paid))
    .slice(0, 5);

  const formatHidden = (val: string) => (showValues ? val : '••••••');

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Bloco Estilo Nubank: Conta & Saldo Disponível */}
      <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FACC15]/10 text-[#FACC15] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
              Conta
            </span>
          </div>
          <Link
            href="/contas"
            className="text-xs text-[#FACC15] hover:text-[#FDE047] flex items-center gap-0.5 transition-colors"
          >
            Ver contas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div>
          <span className="text-xs text-[#94A3B8] block">Saldo disponível</span>
          <h2 className="text-3xl font-extrabold text-[#F8FAFC] mt-1 tracking-tight tabular-nums">
            {formatHidden(formatCurrency(totalBalance))}
          </h2>
          {totalYieldMonth > 0 && (
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1 tabular-nums">
              <Sparkles className="w-3 h-3" /> Rendendo +{formatHidden(formatCurrency(totalYieldMonth))} este mês
            </span>
          )}
        </div>

        {/* Atalhos Rápidos Touch (estilo pílulas) */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#1E293B]/80 overflow-x-auto no-scrollbar">
          <Link
            href="/transacoes"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151D30] hover:bg-[#1B253D] border border-[#1E293B] text-[#F8FAFC] rounded-full text-xs font-semibold shrink-0 transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#FACC15]" />
            Extrato
          </Link>
          <Link
            href="/cartoes"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151D30] hover:bg-[#1B253D] border border-[#1E293B] text-[#F8FAFC] rounded-full text-xs font-semibold shrink-0 transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
            Cartões
          </Link>
          <Link
            href="/contas"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151D30] hover:bg-[#1B253D] border border-[#1E293B] text-[#F8FAFC] rounded-full text-xs font-semibold shrink-0 transition-colors"
          >
            <Landmark className="w-3.5 h-3.5 text-blue-400" />
            Bancos ({accounts.length})
          </Link>
        </div>
      </div>

      {/* 2. Bloco Estilo Carteira: Cartão de Crédito e Fatura Atual */}
      <WalletInvoiceCard
        cards={cards}
        showValues={showValues}
      />

      {/* 2.1. Bloco Estilo Nubank: A Receber no Mês (Pessoal) */}
      {pendingIncome > 0 && (
        <Link
          href="/transacoes"
          className="block p-5 bg-[#0D121F] border border-[#1E293B] hover:border-emerald-500/40 rounded-2xl space-y-3 transition-all active:scale-[0.99] group shadow-sm"
        >
          <div className="flex items-center justify-between text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                A Receber
              </span>
            </div>
            <span className="text-xs text-emerald-400 group-hover:text-emerald-300 font-semibold flex items-center gap-0.5 transition-colors">
              Ver receitas <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div>
            <span className="text-xs text-[#94A3B8] block font-medium">
              Previsto para {formattedMonth}
            </span>
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <h3 className="text-2xl font-extrabold text-emerald-400 tracking-tight tabular-nums">
                {formatHidden(formatCurrency(pendingIncome))}
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {pendingIncomeCount} {pendingIncomeCount === 1 ? 'receita agendada' : 'receitas agendadas'}
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* 3. Bloco Estilo Nubank: Entradas e Saídas do Mês */}
      <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl space-y-3">
        <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider block">
          Fluxo de {formattedMonth}
        </span>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-[#080B11]/80 border border-[#1E293B]/80 rounded-xl">
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold mb-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Receitas</span>
            </div>
            <span className="text-base font-extrabold text-emerald-400 block tabular-nums">
              {formatHidden(formatCurrency(receivedIncome))}
            </span>
          </div>

          <div className="p-3 bg-[#080B11]/80 border border-[#1E293B]/80 rounded-xl">
            <div className="flex items-center gap-1 text-rose-400 text-xs font-semibold mb-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Despesas Pagas</span>
            </div>
            <span className="text-base font-extrabold text-rose-400 block tabular-nums">
              {formatHidden(formatCurrency(paidExpense))}
            </span>
          </div>
        </div>

        {pendingExpense > 0 && (
          <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-1">
            <span>Despesas ainda pendentes:</span>
            <span className="text-amber-400 font-bold tabular-nums">{formatHidden(formatCurrency(pendingExpense))}</span>
          </div>
        )}
      </div>

      {/* 4. Bloco Estilo Nubank: Histórico de Movimentações */}
      {recentTransactions.length > 0 && (
        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider block">
              Últimas Movimentações
            </span>
            <Link
              href="/transacoes"
              className="text-xs text-[#FACC15] hover:text-[#FDE047] font-semibold flex items-center gap-0.5 transition-colors"
            >
              Ver extrato <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#1E293B]/80">
            {recentTransactions.map((t) => {
              const isIncome = t.type === 'income';

              return (
                <div key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-[#F8FAFC] block truncate">
                      {t.description}
                    </span>
                    <span className="text-[10px] text-[#64748B] block mt-0.5">
                      {formatDate(t.due_date)} • {t.category?.name || 'Geral'}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold shrink-0 tabular-nums ${
                      isIncome ? 'text-emerald-400' : 'text-[#F8FAFC]'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {formatHidden(formatCurrency(Number(t.amount)))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
