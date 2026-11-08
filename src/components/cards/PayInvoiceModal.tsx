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
import {
  CreditCardWithUsage,
  payCreditCardInvoiceAmount,
  getCreditCardTransactions,
} from '@/lib/actions/credit-cards';
import { getAccounts, AccountWithBalance } from '@/lib/actions/accounts';
import { Transaction } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { parseCurrencyInputToNumber } from '@/lib/currency-mask';
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
  pendingTransactions?: Transaction[];
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
  pendingTransactions,
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
      pendingTransactions={pendingTransactions}
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
  pendingTransactions,
  onSuccess,
}: DialogProps) {
  const [payMode, setPayMode] = useState<'full' | 'partial'>('full');
  const [selectedTargetTxId, setSelectedTargetTxId] = useState<string>('');
  const [partialAmountStr, setPartialAmountStr] = useState('');
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [fetchedPendingItems, setFetchedPendingItems] = useState<Transaction[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pendingItems =
    pendingTransactions && pendingTransactions.length > 0
      ? pendingTransactions
      : fetchedPendingItems;

  useEffect(() => {
    let active = true;
    getAccounts()
      .then((list) => {
        if (active) {
          setAccounts(list);
          if (list.length > 0) {
            setSelectedAccountId((prev) => prev || list[0].id);
          }
          setLoadingAccounts(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar contas bancárias:', err);
        if (active) setLoadingAccounts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (pendingTransactions && pendingTransactions.length > 0) return;

    let active = true;
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    getCreditCardTransactions(card.id)
      .then((txs) => {
        if (!active) return;
        const filtered = txs.filter(
          (t) => !t.is_paid && t.due_date && t.due_date >= startDate && t.due_date <= endDate
        );
        setFetchedPendingItems(filtered);
      })
      .catch((err) => {
        console.error('Erro ao carregar itens da fatura:', err);
      });

    return () => {
      active = false;
    };
  }, [card.id, month, year, pendingTransactions]);

  const numericPartial = parseCurrencyInputToNumber(partialAmountStr);
  const effectivePayAmount = payMode === 'full' || !isInvoiceOpen ? pendingAmount : numericPartial;

  const selectedTargetItem = pendingItems.find((t) => t.id === selectedTargetTxId);
  const maxAllowed = selectedTargetItem ? Number(selectedTargetItem.amount) : pendingAmount;
  const remainingAfterPayment = Math.max(0, pendingAmount - effectivePayAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (effectivePayAmount <= 0) {
      toast.error('Informe um valor de pagamento maior que zero');
      return;
    }

    if (effectivePayAmount > maxAllowed + 0.009) {
      if (selectedTargetItem) {
        toast.error(
          `O valor não pode ser maior que o saldo deste lançamento (${formatCurrency(Number(selectedTargetItem.amount))})`
        );
      } else {
        toast.error(
          `O valor não pode ser maior que o saldo em aberto da fatura (${formatCurrency(pendingAmount)})`
        );
      }
      return;
    }

    try {
      setSubmitting(true);
      const accountToDebit =
        selectedAccountId === 'none'
          ? 'none'
          : selectedAccountId || (accounts.length > 0 ? accounts[0].id : null);

      const res = await payCreditCardInvoiceAmount(
        card.id,
        month,
        year,
        effectivePayAmount,
        accountToDebit,
        selectedTargetTxId || null
      );

      if (res.isFullyPaid) {
        toast.success(`Fatura de ${monthName} quitada integralmente!`);
      } else if (selectedTargetItem) {
        toast.success(
          `Adiantamento de ${formatCurrency(res.paidAmount)} em "${selectedTargetItem.description}" registrado! Limite liberado.`
        );
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
      <div className="relative w-full sm:max-w-md max-h-[92vh] flex flex-col bg-[#0D121F] border border-[#1E293B] rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 overflow-hidden">
        {/* Barra superior de toque (mobile) */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1 bg-[#1E293B] rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1E293B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: card.color || '#6366f1' }}
            >
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">
                Pagar Fatura • {card.name}
              </h3>
              <span className="text-xs text-[#94A3B8]">
                Competência de {monthName} de {year}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] bg-[#080B11] border border-[#1E293B] rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo Form com scroll */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Card Resumo do Status da Fatura */}
          <div className="p-4 bg-[#080B11] rounded-2xl border border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8] font-medium">Status da Competência</span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isInvoiceOpen
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {isInvoiceOpen ? 'Fatura Aberta' : 'Fatura Fechada'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1E293B]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#94A3B8] block">
                  Total Lançado
                </span>
                <span className="text-sm font-extrabold text-[#F8FAFC] tabular-nums">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#94A3B8] block">
                  Já Pago
                </span>
                <span className="text-sm font-extrabold text-emerald-400 tabular-nums">
                  {formatCurrency(paidAmount)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between">
              <span className="text-xs font-bold text-[#94A3B8]">
                Saldo Atual em Aberto:
              </span>
              <span className="text-lg font-extrabold text-amber-400 tabular-nums">
                {formatCurrency(pendingAmount)}
              </span>
            </div>
          </div>

          {/* Opções de Pagamento */}
          {isInvoiceOpen ? (
            /* Regra Fatura Aberta (Estilo Nubank): Permite Pagar Total ou Parcial */
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] block">
                Quanto você deseja pagar agora?
              </label>

              <div className="space-y-2">
                {/* Opção 1: Pagar valor total */}
                <label
                  onClick={() => setPayMode('full')}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                    payMode === 'full'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-[#F8FAFC]'
                      : 'bg-[#080B11] border-[#1E293B] text-[#94A3B8] hover:border-[#64748B]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payMode"
                      checked={payMode === 'full'}
                      onChange={() => setPayMode('full')}
                      className="text-[#FACC15] focus:ring-0 bg-[#080B11] border-[#1E293B]"
                    />
                    <div>
                      <span className="text-xs font-bold block text-[#F8FAFC]">
                        Pagar valor total em aberto
                      </span>
                      <span className="text-[11px] text-[#94A3B8] block">
                        Quita 100% dos lançamentos pendentes desta fatura
                      </span>
                    </div>
                  </div>
                  <strong className="text-xs font-extrabold text-emerald-400 ml-2 tabular-nums">
                    {formatCurrency(pendingAmount)}
                  </strong>
                </label>

                {/* Opção 2: Pagar valor parcial (antecipação) */}
                <label
                  onClick={() => setPayMode('partial')}
                  className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 cursor-pointer transition ${
                    payMode === 'partial'
                      ? 'bg-indigo-950/20 border-indigo-500/40 text-[#F8FAFC]'
                      : 'bg-[#080B11] border-[#1E293B] text-[#94A3B8] hover:border-[#64748B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payMode"
                        checked={payMode === 'partial'}
                        onChange={() => setPayMode('partial')}
                        className="text-[#FACC15] focus:ring-0 bg-[#080B11] border-[#1E293B]"
                      />
                      <div>
                        <span className="text-xs font-bold block text-[#F8FAFC]">
                          Pagar outro valor (parcial / adiantamento)
                        </span>
                        <span className="text-[11px] text-[#94A3B8] block">
                          Antecipe um lançamento específico ou quite parte da fatura
                        </span>
                      </div>
                    </div>
                  </div>

                  {payMode === 'partial' && (
                    <div className="pt-2 border-t border-indigo-500/20 space-y-3">
                      {/* Seletor de Lançamento Alvo */}
                      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 block">
                          Qual lançamento deseja antecipar?
                        </label>
                        <select
                          value={selectedTargetTxId}
                          onChange={(e) => {
                            const nextId = e.target.value;
                            setSelectedTargetTxId(nextId);
                            if (nextId) {
                              const target = pendingItems.find((t) => t.id === nextId);
                              if (target) {
                                setPartialAmountStr(Number(target.amount).toFixed(2).replace('.', ','));
                              }
                            }
                          }}
                          className="w-full px-3 py-2 bg-[#080B11] border border-[#1E293B] focus:border-[#FACC15]/50 rounded-xl text-xs text-[#F8FAFC] focus:outline-none transition"
                        >
                          <option value="">Abater saldo geral da fatura (automático)</option>
                          {pendingItems.map((tx) => {
                            const isInst = (tx.total_installments || 1) > 1;
                            const instBadge = isInst ? ` (${tx.current_installment}/${tx.total_installments})` : '';
                            return (
                              <option key={tx.id} value={tx.id}>
                                {tx.description}{instBadge} • {formatCurrency(Number(tx.amount))}
                              </option>
                            );
                          })}
                        </select>
                        {selectedTargetItem ? (
                          <p className="text-[11px] text-indigo-300/80">
                            Saldo deste lançamento: {formatCurrency(Number(selectedTargetItem.amount))}. Você pode adiantá-lo integralmente ou digitar um valor menor abaixo.
                          </p>
                        ) : (
                          <p className="text-[11px] text-[#94A3B8]">
                            O valor pago abaterá os lançamentos pendentes em ordem cronológica.
                          </p>
                        )}
                      </div>

                      {/* Input de Valor */}
                      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                          Valor a pagar agora:
                        </label>
                        <div className="bg-[#080B11] p-3 rounded-xl border border-[#1E293B] flex items-center justify-center gap-1 focus-within:border-[#FACC15]/50 transition">
                          <span className="text-xl font-bold text-[#64748B]">R$</span>
                          <CurrencyInput
                            placeholder="0,00"
                            value={partialAmountStr}
                            onChangeValue={(_, formatted) => setPartialAmountStr(formatted)}
                            autoFocus
                            className="w-36 bg-transparent text-2xl font-extrabold text-[#F8FAFC] text-center focus:outline-none placeholder:text-[#64748B] tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#94A3B8] px-1">
                        <span>Limite liberado imediatamente:</span>
                        <strong className="text-indigo-300 tabular-nums">
                          +{formatCurrency(numericPartial)}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#94A3B8] px-1">
                        <span>Saldo restante na fatura:</span>
                        <strong className="text-[#F8FAFC] tabular-nums">
                          {formatCurrency(remainingAfterPayment)}
                        </strong>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              <div className="p-3 bg-[#080B11] rounded-xl border border-[#1E293B] text-[11px] text-[#94A3B8] space-y-1">
                <span className="flex items-center gap-1 text-[#F8FAFC] font-semibold">
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
                <div className="text-xs text-[#94A3B8] space-y-1">
                  <span className="font-bold text-amber-300 block">
                    Fatura Fechada em {formatDate(closingDateStr)}
                  </span>
                  <p className="text-[11px] text-[#94A3B8]">
                    Após o fechamento, o pagamento deve ser realizado no valor total integral da fatura ({formatCurrency(pendingAmount)}).
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#080B11] rounded-2xl border border-[#1E293B] text-center">
                <span className="text-[10px] uppercase font-bold text-[#64748B] block mb-1">
                  Valor Total a Pagar
                </span>
                <span className="text-2xl font-extrabold text-emerald-400 tabular-nums">
                  {formatCurrency(pendingAmount)}
                </span>
                <span className="text-[11px] text-[#94A3B8] block mt-1">
                  Vencimento em {formatDate(dueDateStr)}
                </span>
              </div>
            </div>
          )}

          {/* Seleção da Conta Bancária Pagadora (INC-03) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              Debitar de qual conta bancária?
            </label>
            {loadingAccounts ? (
              <div className="w-full px-3.5 py-2.5 bg-[#080B11] border border-[#1E293B] rounded-xl text-xs text-[#64748B] animate-pulse">
                Carregando contas bancárias...
              </div>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#080B11] border border-[#1E293B] rounded-xl text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FACC15]/50 transition"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.current_balance)})
                  </option>
                ))}
                <option value="none">Não debitar de nenhuma conta (pagamento externo)</option>
              </select>
            )}
            <p className="text-[11px] text-[#64748B]">
              O valor pago abaterá o saldo da conta selecionada sem duplicar os gastos por categoria.
            </p>
          </div>

          {/* Rodapé com Botão de Confirmação */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || loadingAccounts || effectivePayAmount <= 0}
              className="w-full py-3.5 px-4 bg-[#FACC15] hover:bg-[#FDE047] text-[#080B11] font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-[#FACC15]/10 disabled:opacity-40 text-center active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              {submitting
                ? 'Processando Pagamento...'
                : loadingAccounts
                ? 'Carregando contas...'
                : `Confirmar Pagamento de ${formatCurrency(effectivePayAmount)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
