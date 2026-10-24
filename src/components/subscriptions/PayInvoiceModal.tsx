'use client';

import { useState } from 'react';
import {
  X,
  CheckCircle2,
  Wallet,
  Calendar,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import { Account, SubscriptionInvoice, PaymentMethod } from '@/types/database';
import { paySubscriptionInvoice } from '@/lib/actions/subscriptions';
import { formatCurrency } from '@/lib/utils';
import { getTodayYMD } from '@/lib/date-utils';
import { toast } from 'sonner';

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SubscriptionInvoice | null;
  accounts: Account[];
  onSuccess: () => void;
  onRequestReceipt?: (invoice: SubscriptionInvoice) => void;
}

export function PayInvoiceModal({
  isOpen,
  onClose,
  invoice,
  accounts,
  onSuccess,
  onRequestReceipt,
}: PayInvoiceModalProps) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paidDate, setPaidDate] = useState(getTodayYMD());
  const [loading, setLoading] = useState(false);

  if (!isOpen || !invoice) return null;

  const clientName = invoice.client?.name || 'Cliente';
  const planName =
    invoice.subscription?.custom_plan_name ||
    invoice.subscription?.plan?.name ||
    'Mensalidade';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountId) {
      toast.error('Selecione a conta para depósito');
      return;
    }

    try {
      setLoading(true);
      await paySubscriptionInvoice({
        invoiceId: invoice.id,
        accountId,
        paidDate,
        paymentMethod,
      });

      toast.success(`Mensalidade de ${clientName} quitada com sucesso!`);
      const paidInvoiceCopy: SubscriptionInvoice = {
        ...invoice,
        status: 'paid',
        paid_at: paidDate,
        payment_method: paymentMethod,
        account_id: accountId,
      };

      onSuccess();
      onClose();

      if (onRequestReceipt) {
        onRequestReceipt(paidInvoiceCopy);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao dar baixa na mensalidade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Receber Mensalidade</h2>
            <p className="text-xs text-zinc-400">
              Dê baixa detalhada e registre a receita no seu extrato
            </p>
          </div>
        </div>

        {/* Card Resumo da Mensalidade */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 mb-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-zinc-500 uppercase font-semibold">Cliente</p>
              <p className="text-sm font-bold text-zinc-100">{clientName}</p>
              <p className="text-xs text-zinc-400">{planName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 uppercase font-semibold">Valor</p>
              <p className="text-lg font-black text-emerald-400">
                {formatCurrency(invoice.amount)}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-zinc-800/50 flex justify-between text-xs text-zinc-400">
            <span>Vencimento original:</span>
            <span className="font-medium text-zinc-300">
              {new Date(invoice.due_date + 'T12:00:00Z').toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Método de Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              Forma de Pagamento *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'pix', label: 'Pix' },
                { id: 'cash', label: 'Dinheiro' },
                { id: 'debit', label: 'Cartão Débito' },
                { id: 'credit', label: 'Cartão Crédito' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                    paymentMethod === m.id
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conta de Entrada */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              Conta de Destino (Saldo) *
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              required
            >
              <option value="" disabled>
                Selecione a conta
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Data do Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Data da Quitação
            </label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
            >
              <DollarSign className="w-4 h-4" />
              {loading ? 'Confirmando...' : 'Confirmar & Quitar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
