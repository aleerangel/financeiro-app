'use client';

import { useState } from 'react';
import { X, CheckCircle2, DollarSign } from 'lucide-react';
import { Account, PaymentMethod } from '@/types/database';
import { ClientWithStats } from '@/lib/actions/clients';
import { amortizeSale, amortizeClientDebt } from '@/lib/actions/sales';
import { formatCurrency } from '@/lib/utils';
import { getTodayYMD } from '@/lib/date-utils';
import { toast } from 'sonner';

export interface AmortizeTargetSale {
  id: string;
  client_name?: string;
  total_amount?: number;
  remaining_amount?: number;
}

export interface AmortizeClientTarget {
  id: string;
  name: string;
  totalDebt?: number;
}

interface AmortizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  // Modo 1: Amortização de comanda específica
  sale?: AmortizeTargetSale | null;
  // Modo 2: Amortização consolidada no cliente
  client?: ClientWithStats | AmortizeClientTarget | null;
  onSuccess?: () => void;
}

export function AmortizeModal({
  isOpen,
  onClose,
  accounts,
  sale,
  client,
  onSuccess,
}: AmortizeModalProps) {
  const isConsolidated = !sale && Boolean(client);

  const totalDebt = isConsolidated
    ? Number(client?.totalDebt || 0)
    : Number(sale?.remaining_amount ?? sale?.total_amount ?? 0);

  const clientName = isConsolidated ? client?.name : sale?.client_name;

  const [amountStr, setAmountStr] = useState(totalDebt > 0 ? String(totalDebt) : '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [paymentDate, setPaymentDate] = useState(getTodayYMD());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePayFull = () => {
    setAmountStr(String(totalDebt));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr.replace(',', '.'));

    if (isNaN(amount) || amount <= 0) {
      setError('Informe um valor de amortização válido maior que zero.');
      return;
    }

    if (amount > totalDebt) {
      setError(
        `O valor não pode ultrapassar o saldo devedor de ${formatCurrency(totalDebt)}.`
      );
      return;
    }

    if (!accountId) {
      setError('Selecione a conta bancária de entrada.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isConsolidated && client) {
        await amortizeClientDebt({
          clientId: client.id,
          amount,
          paymentMethod,
          accountId,
          notes: notes.trim() || undefined,
          amortizedAt: paymentDate,
        });
        toast.success(
          `Amortização de ${formatCurrency(amount)} registrada para ${client.name}!`
        );
      } else if (sale) {
        await amortizeSale({
          saleId: sale.id,
          amount,
          paymentMethod,
          accountId,
          notes: notes.trim() || undefined,
          amortizedAt: paymentDate,
        });
        toast.success(
          `Recebimento de ${formatCurrency(amount)} registrado com sucesso!`
        );
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar amortização.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              {isConsolidated ? 'Receber Débito do Cliente' : 'Amortizar Comanda'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cliente: <strong className="text-zinc-200">{clientName || 'Cliente'}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Débito */}
        <div className="px-5 py-3.5 bg-zinc-950/60 border-b border-zinc-800/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              Saldo Devedor Atual
            </span>
            <span className="text-xl font-black text-rose-400">
              {formatCurrency(totalDebt)}
            </span>
          </div>

          <button
            type="button"
            onClick={handlePayFull}
            className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold transition active:scale-95"
          >
            Quitar Total
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Valor a Amortizar */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Valor a Receber (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={totalDebt}
                required
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setError(null);
                }}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-bold text-base focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Forma de Pagamento e Conta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Forma de Pagto *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="pix">Pix</option>
                <option value="cash">Dinheiro em Espécie</option>
                <option value="debit">Cartão Débito</option>
                <option value="credit">Cartão Crédito</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Conta de Entrada *
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 transition"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Data do Pagamento */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Data do Recebimento
            </label>
            <div className="relative">
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Observação (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Pagamento adiantado via Pix"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 transition placeholder:text-zinc-600"
            />
          </div>

          {/* Botão de Envio */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !amountStr || parseFloat(amountStr) <= 0}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              {loading
                ? 'Registrando...'
                : `Confirmar Recebimento de ${formatCurrency(
                    parseFloat(amountStr || '0') || 0
                  )}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
