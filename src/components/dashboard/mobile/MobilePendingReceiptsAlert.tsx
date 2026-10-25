'use client';

import { useState } from 'react';
import {
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  ChevronDown,
  Landmark,
  Loader2,
} from 'lucide-react';
import { Transaction } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { toggleTransactionPaid } from '@/lib/actions/transactions';

export interface MobilePendingReceiptsAlertProps {
  receipts?: Transaction[];
  onReceiptConfirmed?: (receiptId: string) => void;
  title?: string;
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

export function MobilePendingReceiptsAlert({
  receipts = [],
  onReceiptConfirmed,
  title = 'Confirmar Recebimento de Entradas',
}: MobilePendingReceiptsAlertProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (!receipts || receipts.length === 0) {
    return null;
  }

  const totalAmount = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const handleConfirm = async (receipt: Transaction) => {
    try {
      setConfirmingId(receipt.id);
      await toggleTransactionPaid(receipt.id, true);
      toast.success(`Recebimento de ${formatCurrency(Number(receipt.amount))} confirmado!`);
      if (onReceiptConfirmed) {
        onReceiptConfirmed(receipt.id);
      }
    } catch (err) {
      console.error('Erro ao confirmar recebimento:', err);
      toast.error('Erro ao confirmar recebimento.');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-900 border-emerald-500/30 overflow-hidden shadow-lg shadow-emerald-950/20 transition-all">
      {/* Barra de cabeçalho clicável para expandir/recolher */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-emerald-500/5 transition select-none active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-zinc-100 truncate">
                {title}
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                {receipts.length} {receipts.length === 1 ? 'entrada' : 'entradas'}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 block truncate mt-0.5">
              {expanded ? 'Toque para recolher' : 'Data prevista atingida • Toque para ver'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className="text-xs font-extrabold text-emerald-400 block tracking-tight">
              +{formatCurrency(totalAmount)}
            </span>
          </div>
          <div
            className={`w-6 h-6 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 transition-transform duration-200 ${
              expanded ? 'rotate-180 text-emerald-400 bg-emerald-500/10' : ''
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </button>

      {/* Lista expansível de entradas pendentes */}
      {expanded && (
        <div className="p-3 pt-0 space-y-2 border-t border-emerald-500/15 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[11px] text-zinc-400 pt-2 pb-1 px-1">
            Confirme se o dinheiro já caiu na sua conta para atualizar o saldo:
          </p>

          {receipts.map((receipt) => {
            const status = getReceiptStatus(receipt.due_date);
            const isConfirming = confirmingId === receipt.id;

            return (
              <div
                key={receipt.id}
                className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/90 space-y-2.5 hover:border-emerald-500/30 transition shadow-sm"
              >
                {/* Linha superior: Status e Valor */}
                <div className="flex items-center justify-between gap-2">
                  <div>
                    {status.isOverdue ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {status.label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {status.label}
                      </span>
                    )}
                  </div>

                  <span className="text-sm font-extrabold text-emerald-400 tracking-tight">
                    +{formatCurrency(Number(receipt.amount))}
                  </span>
                </div>

                {/* Descrição e Detalhes */}
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-100 block truncate">
                    {receipt.description}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5 flex-wrap">
                    <span>Previsto: {formatDate(receipt.due_date)}</span>
                    {receipt.category?.name && (
                      <>
                        <span>•</span>
                        <span className="text-zinc-300 font-medium">{receipt.category.name}</span>
                      </>
                    )}
                    {receipt.account?.name && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <Landmark className="w-2.5 h-2.5" />
                          {receipt.account.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Botão de Confirmação Direta em 1 Toque */}
                <button
                  type="button"
                  disabled={isConfirming}
                  onClick={() => handleConfirm(receipt)}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] disabled:opacity-60 shadow-sm"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirmando entrada...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar Recebimento</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
