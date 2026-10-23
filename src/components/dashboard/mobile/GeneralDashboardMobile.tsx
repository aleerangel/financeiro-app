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
  AlertCircle,
} from 'lucide-react';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { CreditCardWithUsage } from '@/lib/actions/credit-cards';
import { Transaction } from '@/types/database';
import { GeneralDashboardData } from '@/lib/actions/dashboard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { getCardInvoiceStatus } from '@/lib/credit-card-utils';

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
  upcomingBills = [],
}: GeneralDashboardMobileProps) {
  const { showValues } = useMobileNavigation();

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + Number(acc.current_balance || 0),
    0
  );
  const totalCardLimit = cards.reduce(
    (sum, c) => sum + Number(c.credit_limit || 0),
    0
  );
  const totalCardUsed = cards.reduce(
    (sum, c) => sum + Number(c.used_limit || 0),
    0
  );
  const totalCardAvailable = Math.max(0, totalCardLimit - totalCardUsed);

  // Fatura atual: soma das faturas ativas de todos os cartões cadastrados
  const totalCurrentInvoice = useMemo(() => {
    return cards.reduce((sum, c) => sum + (Number(c.current_invoice) || 0), 0);
  }, [cards]);

  // Status de fatura aberta / fechada de cada cartão
  const cardsStatus = useMemo(() => {
    return cards.map((c) => ({
      card: c,
      status: c.invoice_status || getCardInvoiceStatus(c),
    }));
  }, [cards]);

  const primaryStatus = cardsStatus[0]?.status;

  // Rendimentos ganhos acumulados no mês
  const totalYieldMonth = accounts.reduce(
    (sum, acc) => sum + Number(acc.total_yield_current_month || 0),
    0
  );

  const receivedIncome = transactions
    .filter((t) => t.type === 'income' && t.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

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
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Conta
            </span>
          </div>
          <Link
            href="/contas"
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-0.5"
          >
            Ver contas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div>
          <span className="text-xs text-zinc-400 block">Saldo disponível</span>
          <h2 className="text-3xl font-extrabold text-zinc-100 mt-1 tracking-tight">
            {formatHidden(formatCurrency(totalBalance))}
          </h2>
          {totalYieldMonth > 0 && (
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <Sparkles className="w-3 h-3" /> Rendendo +{formatHidden(formatCurrency(totalYieldMonth))} este mês
            </span>
          )}
        </div>

        {/* Atalhos Rápidos Touch (estilo pílulas / círculos Nubank) */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80 overflow-x-auto no-scrollbar">
          <Link
            href="/transacoes"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 rounded-full text-xs font-semibold shrink-0"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
            Extrato
          </Link>
          <Link
            href="/cartoes"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 rounded-full text-xs font-semibold shrink-0"
          >
            <CreditCard className="w-3.5 h-3.5 text-purple-400" />
            Cartões
          </Link>
          <Link
            href="/contas"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 rounded-full text-xs font-semibold shrink-0"
          >
            <Landmark className="w-3.5 h-3.5 text-blue-400" />
            Bancos ({accounts.length})
          </Link>
        </div>
      </div>

      {/* Alerta de Contas a Vencer (se houver) */}
      {upcomingBills.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-amber-300 block">
                {upcomingBills.length} conta(s) a pagar
              </span>
              <span className="text-[11px] text-zinc-400 block truncate">
                Próxima: {upcomingBills[0]?.description} ({formatCurrency(Number(upcomingBills[0]?.amount || 0))})
              </span>
            </div>
          </div>
          <Link
            href="/transacoes?filter=pending"
            className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-lg shrink-0"
          >
            Pagar
          </Link>
        </div>
      )}

      {/* 2. Bloco Estilo Nubank: Cartão de Crédito */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Cartão de Crédito
            </span>
          </div>
          <Link
            href="/cartoes"
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-0.5"
          >
            Faturas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Topo do valor da Fatura e Indicador Aberta/Fechada */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs text-zinc-400 block font-medium">Fatura atual</span>
            <h3 className="text-2xl font-extrabold text-purple-300 mt-0.5 tracking-tight">
              {formatHidden(formatCurrency(totalCurrentInvoice))}
            </h3>
          </div>

          {/* Indicador de Fatura Aberta / Fechada */}
          {primaryStatus && (
            <div className="text-right flex flex-col items-end">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mb-1 ${
                  primaryStatus.isOpen
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    primaryStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {primaryStatus.statusLabel}
              </span>

              {primaryStatus.isOpen ? (
                <>
                  <span className="text-xs font-bold text-zinc-200">
                    {primaryStatus.closingLabel}
                  </span>
                  {primaryStatus.daysLeftLabel && (
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {primaryStatus.daysLeftLabel}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs font-bold text-zinc-200">
                  {primaryStatus.dueLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Se houver mais de 1 cartão, mostra status individual de cada um */}
        {cards.length > 1 && (
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            {cardsStatus.map(({ card, status }) => (
              <div key={card.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: card.color || '#8b5cf6' }}
                  />
                  <span className="text-zinc-300 font-medium truncate">{card.name}</span>
                </div>
                <div className="text-right shrink-0">
                  {status.isOpen ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-emerald-400 font-semibold">{status.closingLabel}</span>
                      {status.daysLeftLabel && (
                        <span className="text-[10px] text-zinc-400">({status.daysLeftLabel})</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-amber-300 font-semibold">{status.dueLabel}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Limite Total Usado e Limite Disponível */}
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
          <span>
            Limite total usado:{' '}
            <strong className="text-zinc-200 font-semibold">
              {formatHidden(formatCurrency(totalCardUsed))}
            </strong>
          </span>
          <span>
            Limite disponível:{' '}
            <strong className="text-emerald-400 font-semibold">
              {formatHidden(formatCurrency(totalCardAvailable))}
            </strong>
          </span>
        </div>

        {/* Barra de Limite */}
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-purple-500 transition-all rounded-full"
            style={{
              width: `${totalCardLimit > 0 ? Math.min(100, (totalCardUsed / totalCardLimit) * 100) : 0}%`,
            }}
          />
        </div>
      </div>

      {/* 3. Bloco Estilo Nubank: Entradas e Saídas do Mês */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">
          Fluxo de {formattedMonth}
        </span>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold mb-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Receitas</span>
            </div>
            <span className="text-base font-extrabold text-emerald-400 block">
              {formatHidden(formatCurrency(receivedIncome))}
            </span>
          </div>

          <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
            <div className="flex items-center gap-1 text-rose-400 text-xs font-semibold mb-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Despesas Pagas</span>
            </div>
            <span className="text-base font-extrabold text-rose-400 block">
              {formatHidden(formatCurrency(paidExpense))}
            </span>
          </div>
        </div>

        {pendingExpense > 0 && (
          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
            <span>Despesas ainda pendentes:</span>
            <span className="text-amber-400 font-bold">{formatHidden(formatCurrency(pendingExpense))}</span>
          </div>
        )}
      </div>

      {/* 4. Bloco Estilo Nubank: Histórico de Movimentações */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">
            Últimas Movimentações
          </span>
          <Link
            href="/transacoes"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5"
          >
            Ver extrato <ChevronRight className="w-3.5 h-3.5" />
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
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    {formatDate(t.due_date)} • {t.category?.name || 'Geral'}
                  </span>
                </div>

                <span
                  className={`text-xs font-bold shrink-0 ${
                    isIncome ? 'text-emerald-400' : 'text-zinc-200'
                  }`}
                >
                  {isIncome ? '+' : '-'} {formatHidden(formatCurrency(Number(t.amount)))}
                </span>
              </div>
            );
          })}

          {recentTransactions.length === 0 && (
            <p className="py-6 text-center text-xs text-zinc-500">
              Nenhuma movimentação neste mês.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
