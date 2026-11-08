'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard as CardIcon,
  Clock,
  CheckCircle2,
  ChevronDown,
  Landmark,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Transaction } from '@/types/database';
import { CreditCardWithUsage } from '@/lib/actions/credit-cards';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getTodayYMD } from '@/lib/date-utils';
import { getCardInvoiceStatus } from '@/lib/credit-card-utils';
import { isBusinessTransaction } from '@/lib/business-scope-utils';
import { toggleTransactionPaid } from '@/lib/actions/transactions';
import { toast } from 'sonner';

export interface UnifiedDailyPendingHubProps {
  pendingReceipts?: Transaction[];
  upcomingBills?: Transaction[];
  cards?: CreditCardWithUsage[];
  onReceiptConfirmed?: (id: string) => void;
  onBillPaid?: (id: string) => void;
  scopeFilter?: 'all' | 'business' | 'personal';
  className?: string;
}

interface PendingItem {
  id: string;
  kind: 'income' | 'expense' | 'invoice';
  description: string;
  amount: number;
  dueDate: string;
  categoryName?: string;
  accountName?: string;
  cardName?: string;
  card?: CreditCardWithUsage;
  isBusiness: boolean;
}

function getDueStatus(dueDateStr: string): {
  isOverdue: boolean;
  isToday: boolean;
  label: string;
  daysDiff: number;
} {
  const [y, m, d] = dueDateStr.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  due.setHours(0, 0, 0, 0);

  const todayStr = getTodayYMD();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const today = new Date(ty, tm - 1, td);
  today.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const pastDays = Math.abs(diffDays);
    return {
      isOverdue: true,
      isToday: false,
      daysDiff: diffDays,
      label: pastDays === 1 ? 'Venceu ontem' : `Atrasado há ${pastDays} dias`,
    };
  } else {
    return {
      isOverdue: false,
      isToday: true,
      daysDiff: 0,
      label: 'Vence hoje!',
    };
  }
}

export function UnifiedDailyPendingHub({
  pendingReceipts = [],
  upcomingBills = [],
  cards = [],
  onReceiptConfirmed,
  onBillPaid,
  scopeFilter = 'all',
  className = '',
}: UnifiedDailyPendingHubProps) {
  const [expanded, setExpanded] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const todayStr = useMemo(() => getTodayYMD(), []);

  // Consolidação de todas as pendências que vencem hoje ou estão atrasadas
  const items = useMemo<PendingItem[]>(() => {
    const list: PendingItem[] = [];

    // 1. Entradas previstas (due_date <= hoje e is_paid = false)
    for (const tx of pendingReceipts) {
      if (tx.is_paid) continue;
      if (tx.due_date > todayStr) continue; // REGRA: apenas hoje ou atrasados

      const isBiz = isBusinessTransaction(tx);
      if (scopeFilter === 'business' && !isBiz) continue;
      if (scopeFilter === 'personal' && isBiz) continue;

      list.push({
        id: tx.id,
        kind: 'income',
        description: tx.description,
        amount: Number(tx.amount || 0),
        dueDate: tx.due_date,
        categoryName: tx.category?.name,
        accountName: tx.account?.name,
        isBusiness: isBiz,
      });
    }

    // 2. Contas a pagar (due_date <= hoje e is_paid = false)
    for (const tx of upcomingBills) {
      if (tx.is_paid) continue;
      if (tx.due_date > todayStr) continue; // REGRA: apenas hoje ou atrasados

      const isBiz = isBusinessTransaction(tx);
      if (scopeFilter === 'business' && !isBiz) continue;
      if (scopeFilter === 'personal' && isBiz) continue;

      list.push({
        id: tx.id,
        kind: 'expense',
        description: tx.description,
        amount: Number(tx.amount || 0),
        dueDate: tx.due_date,
        categoryName: tx.category?.name,
        accountName: tx.account?.name,
        cardName: tx.credit_card?.name,
        isBusiness: isBiz,
      });
    }

    // 3. Faturas de cartão com vencimento hoje ou atrasadas
    if (scopeFilter !== 'business') {
      for (const card of cards) {
        const invAmount = Number(card.current_invoice || 0);
        if (invAmount <= 0) continue;

        const status = card.invoice_status || getCardInvoiceStatus(card);
        // Se a fatura fechada vence hoje ou já venceu e está com saldo
        if (status.dueDateStr && status.dueDateStr <= todayStr) {
          list.push({
            id: `card-inv-${card.id}`,
            kind: 'invoice',
            description: `Fatura Cartão ${card.name}`,
            amount: invAmount,
            dueDate: status.dueDateStr,
            cardName: card.name,
            card,
            isBusiness: false,
          });
        }
      }
    }

    // Ordenação contínua: primeiro os mais atrasados (dueDate ascendente)
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [pendingReceipts, upcomingBills, cards, todayStr, scopeFilter]);

  // Se não houver itens com vencimento para hoje ou atrasados, fica 100% limpo!
  if (items.length === 0) {
    return null;
  }

  // Cálculos de totais
  const totalIncomes = items
    .filter((i) => i.kind === 'income')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalExpenses = items
    .filter((i) => i.kind !== 'income')
    .reduce((sum, i) => sum + i.amount, 0);

  const hasOverdue = items.some((i) => getDueStatus(i.dueDate).isOverdue);

  const handleAction = async (item: PendingItem) => {
    if (item.kind === 'invoice') return; // Fatura direciona para o painel de cartões

    try {
      setActingId(item.id);
      await toggleTransactionPaid(item.id, true);

      if (item.kind === 'income') {
        toast.success(`Recebimento de ${formatCurrency(item.amount)} confirmado!`);
        if (onReceiptConfirmed) onReceiptConfirmed(item.id);
      } else {
        toast.success(`Pagamento de ${formatCurrency(item.amount)} confirmado!`);
        if (onBillPaid) onBillPaid(item.id);
      }
    } catch (err) {
      console.error('Erro ao processar confirmação:', err);
      toast.error('Erro ao processar confirmação.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${
        hasOverdue
          ? 'bg-gradient-to-r from-amber-500/10 via-[#0D121F] to-[#0D121F] border-amber-500/35 hover:border-amber-400/50'
          : 'bg-gradient-to-r from-[#FACC15]/10 via-[#0D121F] to-[#0D121F] border-[#FACC15]/30 hover:border-[#FACC15]/50'
      } ${className}`}
    >
      {/* Barra de Cabeçalho do Hub - Clicável para expandir/recolher */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition select-none active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              hasOverdue
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30'
            }`}
          >
            <Layers className="w-5 h-5 stroke-[2.2]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                {hasOverdue ? 'Atenção: Pendências & Vencimentos de Hoje' : 'Pendências & Confirmações de Hoje'}
              </h3>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                  hasOverdue
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'bg-[#FACC15]/15 text-[#FDE047] border border-[#FACC15]/30'
                }`}
              >
                {items.length} {items.length === 1 ? 'ação necessária' : 'ações necessárias'}
              </span>
            </div>

            <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">
              {expanded
                ? 'Toque para recolher a lista'
                : 'Valide os valores que entraram ou saíram para manter os saldos exatos'}
            </p>
          </div>
        </div>

        {/* Resumo Financeiro & Seta de Expansão */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden xs:flex flex-col items-end text-right tabular-nums">
            {totalIncomes > 0 && (
              <span className="text-xs font-bold text-emerald-400">
                +{formatCurrency(totalIncomes)}
              </span>
            )}
            {totalExpenses > 0 && (
              <span className="text-xs font-bold text-rose-400">
                -{formatCurrency(totalExpenses)}
              </span>
            )}
          </div>

          <div
            className={`w-7 h-7 rounded-full bg-[#151D30] border border-[#1E293B] flex items-center justify-center text-[#94A3B8] transition-transform duration-200 ${
              expanded ? 'rotate-180 text-[#F8FAFC] bg-[#1B253D] border-[#FACC15]/30' : 'hover:text-[#F8FAFC]'
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* Lista Unificada Expandida */}
      {expanded && (
        <div className="p-3.5 pt-0 space-y-2.5 border-t border-[#1E293B] animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-2 pb-0.5 px-1">
            <span>Ordene ou confirme com 1 toque:</span>
            <div className="flex items-center gap-2 text-[11px] tabular-nums">
              {totalIncomes > 0 && (
                <span className="text-emerald-400 font-semibold">Entradas: +{formatCurrency(totalIncomes)}</span>
              )}
              {totalExpenses > 0 && (
                <span className="text-rose-400 font-semibold">Saídas: -{formatCurrency(totalExpenses)}</span>
              )}
            </div>
          </div>

          {items.map((item) => {
            const status = getDueStatus(item.dueDate);
            const isActing = actingId === item.id;
            const isIncome = item.kind === 'income';
            const isInvoice = item.kind === 'invoice';

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[#080B11] border border-[#1E293B] gap-3 hover:border-[#FACC15]/40 transition shadow-sm"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  {/* Ícone Semântico do Tipo */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                      isIncome
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : isInvoice
                        ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                    ) : isInvoice ? (
                      <CardIcon className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>

                  {/* Informações da Transação */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-[#F8FAFC] truncate">
                        {item.description}
                      </span>

                      {/* Badge de Status Temporal */}
                      {status.isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.2 rounded shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                          {status.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.2 rounded shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {isIncome ? 'Previsto para hoje!' : 'Vence hoje!'}
                        </span>
                      )}

                      {item.isBusiness && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#FACC15]/15 text-[#FDE047] border border-[#FACC15]/30 shrink-0">
                          Negócio
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] mt-0.5 flex-wrap">
                      <span>Data: {formatDate(item.dueDate)}</span>
                      {item.categoryName && (
                        <>
                          <span className="text-[#64748B]">•</span>
                          <span className="text-zinc-300">{item.categoryName}</span>
                        </>
                      )}
                      {item.accountName && (
                        <>
                          <span className="text-[#64748B]">•</span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Landmark className="w-3 h-3" />
                            {item.accountName}
                          </span>
                        </>
                      )}
                      {item.cardName && !item.accountName && (
                        <>
                          <span className="text-[#64748B]">•</span>
                          <span className="flex items-center gap-1 text-indigo-400">
                            <CardIcon className="w-3 h-3" />
                            {item.cardName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Valor & Botão de Ação Direta */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-[#1E293B] sm:border-t-0">
                  <span
                    className={`text-sm sm:text-base font-extrabold tracking-tight tabular-nums ${
                      isIncome ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(item.amount)}
                  </span>

                  {isInvoice ? (
                    <Link
                      href="/cartoes"
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-[0.98] shadow-sm"
                    >
                      <span>Pagar Fatura</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleAction(item)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-[0.98] disabled:opacity-60 shadow-sm cursor-pointer ${
                        isIncome
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-[#080B11]'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      {isActing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Confirmando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{isIncome ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
