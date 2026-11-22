'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Calendar,
  Landmark,
  Zap,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { Recurrence, Account } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { getTodayYMD, getZonedParts } from '@/lib/date-utils';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { parseCurrencyInputToNumber, numberToCurrencyInputString } from '@/lib/currency-mask';
import { advanceRecurrencePayment } from '@/lib/actions/recurrences';
import { toast } from 'sonner';

interface AdvanceRecurrencePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurrence: Recurrence | null;
  accounts: Account[];
  onSuccess?: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function AdvanceRecurrencePaymentModal({
  isOpen,
  onClose,
  recurrence,
  accounts,
  onSuccess,
}: AdvanceRecurrencePaymentModalProps) {
  if (!isOpen || !recurrence) return null;

  return (
    <AdvanceRecurrencePaymentModalDialog
      onClose={onClose}
      recurrence={recurrence}
      accounts={accounts}
      onSuccess={onSuccess}
    />
  );
}

function AdvanceRecurrencePaymentModalDialog({
  onClose,
  recurrence,
  accounts,
  onSuccess,
}: Omit<AdvanceRecurrencePaymentModalProps, 'isOpen'> & { recurrence: Recurrence }) {
  const { month: curM, year: curY } = getZonedParts();

  // Opções de competências futuras para adiantar (próximos 3 meses)
  const futurePeriods = [1, 2, 3].map((offset) => {
    let m = curM + offset;
    let y = curY;
    while (m > 11) {
      m -= 12;
      y += 1;
    }
    return {
      month: m,
      year: y,
      label: `${MONTH_NAMES[m]} de ${y} (Vencimento dia ${recurrence.due_day})`,
    };
  });

  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const [amountStr, setAmountStr] = useState(() =>
    recurrence.amount ? numberToCurrencyInputString(recurrence.amount) : ''
  );
  const [paidDate, setPaidDate] = useState<string>(getTodayYMD());
  const [accountId, setAccountId] = useState<string>(
    recurrence.account_id || accounts[0]?.id || ''
  );
  const [submitting, setSubmitting] = useState(false);

  const numericAmount = parseCurrencyInputToNumber(amountStr);
  const selectedPeriod = futurePeriods[selectedPeriodIndex] || futurePeriods[0];
  const isExpense = recurrence.type === 'expense';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (numericAmount <= 0) {
      toast.error('Informe um valor maior que zero.');
      return;
    }

    try {
      setSubmitting(true);
      await advanceRecurrencePayment({
        recurrenceId: recurrence.id,
        targetMonth: selectedPeriod.month,
        targetYear: selectedPeriod.year,
        amount: numericAmount,
        accountId: accountId || null,
        paidDate,
      });

      toast.success(
        `Pagamento de "${recurrence.description}" adiantado com sucesso para a competência de ${MONTH_NAMES[selectedPeriod.month]}!`
      );
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adiantar pagamento.');
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
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 ${
                isExpense
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <Zap className="w-5 h-5 text-[#FACC15]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F8FAFC]">
                Adiantar Pagamento
              </h3>
              <span className="text-xs text-[#94A3B8]">
                {recurrence.description} • Dia {recurrence.due_day}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Card explicativo */}
          <div className="p-3.5 bg-[#080B11] rounded-2xl border border-[#1E293B] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FACC15]">
              <Zap className="w-4 h-4 shrink-0" />
              <span>Como funciona o adiantamento:</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              O pagamento será registrado no seu extrato com a data de quitação escolhida (hoje), quitando antecipadamente a conta fixa do próximo mês para não duplicar no vencimento.
            </p>
          </div>

          {/* Seleção da Competência a Adiantar */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#FACC15]" />
              Competência a Adiantar
            </label>
            <select
              value={selectedPeriodIndex}
              onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-[#080B11] border border-[#1E293B] rounded-xl text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FACC15]/50 transition"
            >
              {futurePeriods.map((p, idx) => (
                <option key={`${p.year}-${p.month}`} value={idx}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Valor a Pagar */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] block">
              Valor a Pagar
            </label>
            <div className="bg-[#080B11] p-3 rounded-xl border border-[#1E293B] flex items-center justify-center gap-1 focus-within:border-[#FACC15]/50 transition">
              <span className="text-xl font-bold text-[#64748B]">R$</span>
              <CurrencyInput
                placeholder="0,00"
                value={amountStr}
                onChangeValue={(_, formatted) => setAmountStr(formatted)}
                autoFocus
                className="w-36 bg-transparent text-2xl font-extrabold text-[#F8FAFC] text-center focus:outline-none placeholder:text-[#64748B] tabular-nums"
              />
            </div>
          </div>

          {/* Data do Pagamento / Quitação */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#FACC15]" />
              Data do Pagamento Efetivo
            </label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-[#080B11] border border-[#1E293B] rounded-xl text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FACC15]/50 transition"
            />
            <p className="text-[11px] text-[#64748B]">
              Data em que a baixa sairá do seu extrato e conta bancária.
            </p>
          </div>

          {/* Seleção da Conta Bancária Pagadora */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              Debitar de qual conta?
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#080B11] border border-[#1E293B] rounded-xl text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FACC15]/50 transition"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
              <option value="">Não debitar de conta cadastrada (externo)</option>
            </select>
          </div>

          {/* Rodapé com Botão de Confirmação */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || numericAmount <= 0}
              className="w-full py-3.5 px-4 bg-[#FACC15] hover:bg-[#FDE047] text-[#080B11] font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-[#FACC15]/10 disabled:opacity-40 text-center active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              {submitting
                ? 'Processando Adiantamento...'
                : `Confirmar Adiantamento de ${formatCurrency(numericAmount)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
