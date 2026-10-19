'use client';

import { useState } from 'react';
import {
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Landmark,
  Loader2,
} from 'lucide-react';
import { Transaction } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toggleTransactionPaid } from '@/lib/actions/transactions';

interface PendingReceiptsAlertProps {
  receipts: Transaction[];
  onReceiptConfirmed?: (receiptId: string) => void;
}

function getReceiptStatus(dueDateStr: string): {
  isOverdue: boolean;
  label: string;
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
    const pastDays = Math.abs(diffDays);
    return {
      isOverdue: true,
      label: pastDays === 1 ? 'Previsto para ontem' : `Atrasado há ${pastDays} dias`,
    };
  } else {
    return {
      isOverdue: false,
      label: 'Previsto para hoje!',
    };
  }
}

export function PendingReceiptsAlert({
  receipts,
  onReceiptConfirmed,
}: PendingReceiptsAlertProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!receipts || receipts.length === 0) {
    return null;
  }

  const totalReceiptsAmount = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const displayedReceipts = expanded ? receipts : receipts.slice(0, 3);
  const remainingCount = receipts.length - 3;

  const handleConfirm = async (receiptId: string) => {
    try {
      setConfirmingId(receiptId);
      await toggleTransactionPaid(receiptId, true);
      if (onReceiptConfirmed) {
        onReceiptConfirmed(receiptId);
      }
    } catch (err) {
      console.error('Erro ao confirmar recebimento:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl border transition-all bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border-emerald-500/30">
      {/* Header do Alerta de Recebimento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100">
                Confirmar Recebimento de Entradas
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {receipts.length} {receipts.length === 1 ? 'entrada' : 'entradas'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              A data prevista foi atingida. Confirme se o valor já entrou na sua conta para atualizar o saldo.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
              Total a receber
            </span>
            <span className="text-base font-bold text-emerald-400">
              +{formatCurrency(totalReceiptsAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Recebimentos */}
      <div className="space-y-2.5">
        {displayedReceipts.map((receipt) => {
          const status = getReceiptStatus(receipt.due_date);
          const isConfirming = confirmingId === receipt.id;

          return (
            <div
              key={receipt.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 gap-3 hover:border-emerald-500/30 transition"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                {/* Badge de Status do Recebimento */}
                <div className="shrink-0 mt-0.5 sm:mt-0">
                  {status.isOverdue ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {status.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {status.label}
                    </span>
                  )}
                </div>

                {/* Descrição e Conta */}
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-zinc-200 block truncate">
                    {receipt.description}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5 flex-wrap">
                    <span>Data Prevista: {formatDate(receipt.due_date)}</span>
                    {receipt.category?.name && (
                      <>
                        <span>•</span>
                        <span className="text-zinc-400">{receipt.category.name}</span>
                      </>
                    )}
                    {receipt.account?.name && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Landmark className="w-3 h-3" />
                          {receipt.account.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Valor e Botão de Confirmação */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-zinc-800/60 sm:border-t-0">
                <span className="text-sm sm:text-base font-bold text-emerald-400">
                  +{formatCurrency(Number(receipt.amount))}
                </span>

                <button
                  type="button"
                  disabled={isConfirming}
                  onClick={() => handleConfirm(receipt.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
                  title="Confirmar Recebimento"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirmando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar Recebimento</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão de Ver Mais / Recolher se houver mais de 3 itens */}
      {receipts.length > 3 && (
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
                <span>Ver mais {remainingCount} {remainingCount === 1 ? 'entrada' : 'entradas'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
