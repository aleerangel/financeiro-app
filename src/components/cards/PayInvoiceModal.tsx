'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Lock,
  Sparkles,
  Receipt,
  Landmark,
} from 'lucide-react';
import { CreditCardWithUsage, payCreditCardInvoiceAmount } from '@/lib/actions/credit-cards';
import { getAccounts, AccountWithBalance } from '@/lib/actions/accounts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCardWithUsage;
  month: number;
  year: number;
  monthName: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  isInvoiceOpen: boolean;
  dueDateStr: string;
  closingDateStr: string;
  onSuccess: () => void;
}

export function PayInvoiceModal({
  isOpen,
  onClose,
  card,
  month,
  year,
  monthName,
  totalAmount,
  paidAmount,
  pendingAmount,
  isInvoiceOpen,
  dueDateStr,
  closingDateStr,
  onSuccess,
}: PayInvoiceModalProps) {
  if (!isOpen) return null;

  return (
    <PayInvoiceModalDialog
      onClose={onClose}
      card={card}
      month={month}
      year={year}
      monthName={monthName}
      totalAmount={totalAmount}
      paidAmount={paidAmount}
      pendingAmount={pendingAmount}
      isInvoiceOpen={isInvoiceOpen}
      dueDateStr={dueDateStr}
      closingDateStr={closingDateStr}
      onSuccess={onSuccess}
    />
  );
}

type DialogProps = Omit<PayInvoiceModalProps, 'isOpen'>;

function PayInvoiceModalDialog({
  onClose,
  card,
  month,
  year,
  monthName,
  totalAmount,
  paidAmount,
  pendingAmount,
  isInvoiceOpen,
  dueDateStr,
  closingDateStr,
  onSuccess,
}: DialogProps) {
  const [payMode, setPayMode] = useState<'full' | 'partial'>('full');
  const [partialAmountStr, setPartialAmountStr] = useState('');
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getAccounts()
      .then((list) => {
        if (active) {
          setAccounts(list);
          if (list.length > 0) {
            setSelectedAccountId(list[0].id);
          }
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar contas bancárias:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const numericPartial = parseFloat(partialAmountStr.replace(',', '.')) || 0;
  const effectivePayAmount = payMode === 'full' || !isInvoiceOpen ? pendingAmount : numericPartial;

  const remainingAfterPayment = Math.max(0, pendingAmount - effectivePayAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (effectivePayAmount <= 0) {
      toast.error('Informe um valor de pagamento maior que zero');
      return;
    }

    if (effectivePayAmount > pendingAmount + 0.01) {
      toast.error(`O valor não pode ser maior que o saldo em aberto (${formatCurrency(pendingAmount)})`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await payCreditCardInvoiceAmount(
        card.id,
        month,
        year,
        effectivePayAmount,
        selectedAccountId || null
      );

      if (res.isFullyPaid) {
        toast.success(`Fatura de ${monthName} quitada integralmente!`);
      } else {
        toast.success(
          `Pagamento de ${formatCurrency(res.paidAmount)} registrado! Limite de ${formatCurrency(res.paidAmount)} liberado.`
        );
      }

      onClose();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar pagamento de fatura';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full sm:max-w-md max-h-[92vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 overflow-hidden">
        {/* Barra superior de toque (mobile) */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1 bg-zinc-700/80 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: card.color || '#8b5cf6' }}
            >
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                Pagar Fatura • {card.name}
              </h3>
              <span className="text-xs text-zinc-400">
                Competência de {monthName} de {year}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo Form com scroll */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Card Resumo do Status da Fatura */}
          <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Status da Competência</span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isInvoiceOpen
                    ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {isInvoiceOpen ? 'Fatura Aberta' : 'Fatura Fechada'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                  Total Lançado
                </span>
                <span className="text-sm font-extrabold text-zinc-200">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                  Já Pago
                </span>
                <span className="text-sm font-extrabold text-emerald-400">
                  {formatCurrency(paidAmount)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">
                Saldo Atual em Aberto:
              </span>
              <span className="text-lg font-extrabold text-amber-400">
                {formatCurrency(pendingAmount)}
              </span>
            </div>
          </div>

          {/* Opções de Pagamento */}
          {isInvoiceOpen ? (
            /* Regra Fatura Aberta (Estilo Nubank): Permite Pagar Total ou Parcial */
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Quanto você deseja pagar agora?
              </label>

              <div className="space-y-2">
                {/* Opção 1: Pagar valor total */}
                <label
                  onClick={() => setPayMode('full')}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                    payMode === 'full'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-zinc-100'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payMode"
                      checked={payMode === 'full'}
                      onChange={() => setPayMode('full')}
                      className="text-emerald-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                    />
                    <div>
                      <span className="text-xs font-bold block">
                        Pagar valor total em aberto
                      </span>
                      <span className="text-[11px] text-zinc-400 block">
                        Quita 100% dos lançamentos pendentes desta fatura
                      </span>
                    </div>
                  </div>
                  <strong className="text-xs font-extrabold text-emerald-400 ml-2">
                    {formatCurrency(pendingAmount)}
                  </strong>
                </label>

                {/* Opção 2: Pagar valor parcial (antecipação) */}
                <label
                  onClick={() => setPayMode('partial')}
                  className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 cursor-pointer transition ${
                    payMode === 'partial'
                      ? 'bg-purple-950/20 border-purple-500/40 text-zinc-100'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payMode"
                        checked={payMode === 'partial'}
                        onChange={() => setPayMode('partial')}
                        className="text-purple-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                      />
                      <div>
                        <span className="text-xs font-bold block">
                          Pagar outro valor (parcial)
                        </span>
                        <span className="text-[11px] text-zinc-400 block">
                          Antecipe parte da fatura e libere limite agora
                        </span>
                      </div>
                    </div>
                  </div>

                  {payMode === 'partial' && (
                    <div className="pt-2 border-t border-purple-500/20 space-y-2">
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center justify-center gap-1">
                        <span className="text-xl font-bold text-zinc-400">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={partialAmountStr}
                          onChange={(e) => setPartialAmountStr(e.target.value)}
                          autoFocus
                          className="w-36 bg-transparent text-2xl font-extrabold text-zinc-100 text-center focus:outline-none placeholder:text-zinc-600"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                        <span>Limite liberado imediatamente:</span>
                        <strong className="text-purple-300">
                          +{formatCurrency(numericPartial)}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                        <span>Saldo restante na fatura:</span>
                        <strong className="text-zinc-200">
                          {formatCurrency(remainingAfterPayment)}
                        </strong>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                <span className="flex items-center gap-1 text-zinc-300 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Como funciona no Nubank:
                </span>
                <p>
                  Até o fechamento em <strong>{formatDate(closingDateStr)}</strong>, você pode pagar qualquer valor. O limite é restabelecido na hora e o restante permanece em aberto.
                </p>
              </div>
            </div>
          ) : (
            /* Regra Fatura Fechada: Conforme solicitado pelo usuário, pagamento exclusivamente total */
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-2xl flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 space-y-1">
                  <span className="font-bold text-amber-300 block">
                    Fatura Fechada em {formatDate(closingDateStr)}
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Após o fechamento, o pagamento deve ser realizado no valor total integral da fatura ({formatCurrency(pendingAmount)}).
                  </p>
                </div>
              </div>

              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Valor Total a Pagar
                </span>
                <span className="text-2xl font-extrabold text-emerald-400">
                  {formatCurrency(pendingAmount)}
                </span>
                <span className="text-[11px] text-zinc-400 block mt-1">
                  Vencimento em {formatDate(dueDateStr)}
                </span>
              </div>
            </div>
          )}

          {/* Seleção da Conta Bancária Pagadora (INC-03) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              Debitar de qual conta bancária?
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatCurrency(acc.current_balance)})
                </option>
              ))}
              <option value="">Não debitar de nenhuma conta (pagamento externo)</option>
            </select>
            <p className="text-[11px] text-zinc-500">
              O valor pago abaterá o saldo da conta selecionada sem duplicar os gastos por categoria.
            </p>
          </div>

          {/* Rodapé com Botão de Confirmação */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || effectivePayAmount <= 0}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-40 text-center active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              {submitting
                ? 'Processando Pagamento...'
                : `Confirmar Pagamento de ${formatCurrency(effectivePayAmount)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
