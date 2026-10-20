'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Landmark,
  CreditCard,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Transaction } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { toggleTransactionPaid } from '@/lib/actions/transactions';

interface UpcomingBillsAlertProps {
  bills: Transaction[];
  onBillPaid?: (billId: string) => void;
}

function getDueStatus(dueDateStr: string): {
  type: 'overdue' | 'today' | 'upcoming';
  label: string;
  daysDiff: number;
} {
  const [y, m, d] = dueDateStr.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  due.setHours(0, 0, 0, 0);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      type: 'overdue',
      daysDiff: diffDays,
      label: overdueDays === 1 ? 'Venceu ontem' : `Venceu há ${overdueDays} dias`,
    };
  } else if (diffDays === 0) {
    return {
      type: 'today',
      daysDiff: 0,
      label: 'Vence hoje!',
    };
  } else if (diffDays === 1) {
    return {
      type: 'upcoming',
      daysDiff: 1,
      label: 'Vence amanhã',
    };
  } else {
    return {
      type: 'upcoming',
      daysDiff: diffDays,
      label: `Vence em ${diffDays} dias`,
    };
  }
}

export function UpcomingBillsAlert({ bills, onBillPaid }: UpcomingBillsAlertProps) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!bills || bills.length === 0) {
    return null;
  }

  const hasOverdue = bills.some((b) => getDueStatus(b.due_date).type === 'overdue');
  const hasToday = bills.some((b) => getDueStatus(b.due_date).type === 'today');
  const totalPendingAmount = bills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  // Exibe até 3 itens recolhido; se expandido, exibe todos
  const displayedBills = expanded ? bills : bills.slice(0, 3);
  const remainingCount = bills.length - 3;

  const handlePay = async (billId: string) => {
    try {
      setPayingId(billId);
      await toggleTransactionPaid(billId, true);
      toast.success('Conta marcada como paga!');
      if (onBillPaid) {
        onBillPaid(billId);
      }
    } catch (err) {
      console.error('Erro ao marcar conta como paga:', err);
      toast.error('Erro ao marcar conta como paga.');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        hasOverdue
          ? 'bg-gradient-to-r from-rose-950/40 via-zinc-900 to-zinc-900 border-rose-500/30'
          : hasToday
          ? 'bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border-amber-500/30'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      {/* Header do Alerta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              hasOverdue
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {hasOverdue ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100">
                {hasOverdue
                  ? 'Contas Vencidas e a Vencer'
                  : 'Contas Próximas do Vencimento'}
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  hasOverdue
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {bills.length} {bills.length === 1 ? 'pendência' : 'pendências'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Evite juros e multas mantendo suas contas pagas em dia.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
              Total a pagar
            </span>
            <span
              className={`text-base font-bold ${
                hasOverdue ? 'text-rose-400' : 'text-amber-400'
              }`}
            >
              {formatCurrency(totalPendingAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Contas */}
      <div className="space-y-2.5">
        {displayedBills.map((bill) => {
          const status = getDueStatus(bill.due_date);
          const isPaying = payingId === bill.id;

          return (
            <div
              key={bill.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 gap-3 hover:border-zinc-700/80 transition"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                {/* Badge de Status do Vencimento */}
                <div className="shrink-0 mt-0.5 sm:mt-0">
                  {status.type === 'overdue' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      {status.label}
                    </span>
                  ) : status.type === 'today' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      {status.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 rounded-md">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      {status.label}
                    </span>
                  )}
                </div>

                {/* Descrição e Categoria */}
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-zinc-200 block truncate">
                    {bill.description}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5 flex-wrap">
                    <span>Vencimento: {formatDate(bill.due_date)}</span>
                    {bill.category?.name && (
                      <>
                        <span>•</span>
                        <span className="text-zinc-400">{bill.category.name}</span>
                      </>
                    )}
                    {bill.account?.name && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Landmark className="w-3 h-3 text-emerald-400" />
                          {bill.account.name}
                        </span>
                      </>
                    )}
                    {bill.credit_card?.name && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-purple-400">
                          <CreditCard className="w-3 h-3" />
                          {bill.credit_card.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Valor e Botão de Ação Rápida */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-zinc-800/60 sm:border-t-0">
                <span className="text-sm sm:text-base font-bold text-zinc-100">
                  {formatCurrency(Number(bill.amount))}
                </span>

                <button
                  type="button"
                  disabled={isPaying}
                  onClick={() => handlePay(bill.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
                  title="Marcar como Pago"
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Pagar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão de Ver Mais / Recolher se houver mais de 3 itens */}
      {bills.length > 3 && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 font-medium transition"
          >
            {expanded ? (
              <>
                <span>Mostrar menos</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Ver mais {remainingCount} {remainingCount === 1 ? 'conta' : 'contas'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
