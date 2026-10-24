'use client';

import { useState, useEffect } from 'react';
import {
  X,
  History,
  DollarSign,
  Crown,
  Calendar,
  Send,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { ClientSubscription, SubscriptionInvoice } from '@/types/database';
import { getSubscriptionInvoicesBySubscriptionId } from '@/lib/actions/subscriptions';
import { formatCurrency } from '@/lib/utils';
import { getTodayYMD } from '@/lib/date-utils';

interface SubscriptionInvoicesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: ClientSubscription | null;
  onPayInvoice: (invoice: SubscriptionInvoice) => void;
  onChargeWhatsApp: (invoice: SubscriptionInvoice) => void;
  onSendReceipt: (invoice: SubscriptionInvoice) => void;
}

export function SubscriptionInvoicesHistoryModal(
  props: SubscriptionInvoicesHistoryModalProps
) {
  if (!props.isOpen || !props.subscription) return null;
  return (
    <SubscriptionInvoicesHistoryDialog
      key={props.subscription.id}
      {...props}
      subscription={props.subscription}
    />
  );
}

function SubscriptionInvoicesHistoryDialog({
  onClose,
  subscription,
  onPayInvoice,
  onChargeWhatsApp,
  onSendReceipt,
}: SubscriptionInvoicesHistoryModalProps & { subscription: ClientSubscription }) {
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const today = getTodayYMD();

  useEffect(() => {
    let active = true;
    getSubscriptionInvoicesBySubscriptionId(subscription.id)
      .then((data) => {
        if (active) {
          setInvoices(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [subscription.id]);

  const clientName = subscription.client?.name || 'Cliente';
  const planName =
    subscription.custom_plan_name ||
    subscription.plan?.name ||
    'Plano de Assinatura';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              Histórico de Mensalidades
            </h2>
            <p className="text-xs text-zinc-400">
              Auditoria de faturas e pagamentos mensais do cliente
            </p>
          </div>
        </div>

        {/* Resumo do Assinante */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 mb-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-500 uppercase font-semibold">
              Assinante
            </span>
            <h3 className="text-base font-bold text-zinc-100">{clientName}</h3>
            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
              <Crown className="w-3.5 h-3.5 text-amber-400 inline" />
              {planName} • Todo dia {subscription.due_day}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-500 uppercase font-semibold">
              Valor Contratado
            </span>
            <p className="text-lg font-black text-emerald-400">
              {formatCurrency(subscription.price)}
              <span className="text-xs font-normal text-zinc-500">/mês</span>
            </p>
          </div>
        </div>

        {/* Lista de Faturas */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-10 rounded-2xl bg-zinc-950 border border-dashed border-zinc-800">
              <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-300">
                Nenhuma fatura registrada ainda
              </p>
            </div>
          ) : (
            invoices.map((inv) => {
              const isPaid = inv.status === 'paid';
              const isOverdue = !isPaid && inv.due_date < today;

              const [year, month] = inv.period_start.split('-');
              const monthLabel = new Date(
                Number(year),
                Number(month) - 1,
                1
              ).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

              return (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-100 capitalize">
                        {monthLabel}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          isPaid
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isOverdue
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {isPaid ? '✓ Quitado' : isOverdue ? 'Em Atraso' : 'Pendente'}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 mt-1">
                      Vencimento:{' '}
                      {new Date(inv.due_date + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                      {isPaid && inv.paid_at && (
                        <span className="text-emerald-400/90 ml-2">
                          • Pago em{' '}
                          {new Date(inv.paid_at + 'T12:00:00Z').toLocaleDateString(
                            'pt-BR'
                          )}
                          {inv.payment_method ? ` via ${inv.payment_method}` : ''}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-extrabold text-zinc-100">
                      {formatCurrency(inv.amount)}
                    </span>

                    {/* Ações */}
                    {!isPaid ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onChargeWhatsApp(inv);
                          }}
                          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                          title="Cobrar via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onPayInvoice(inv);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition flex items-center gap-1"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Receber
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSendReceipt(inv);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition flex items-center gap-1.5"
                        title="Enviar comprovante via WhatsApp"
                      >
                        <Send className="w-3 h-3 text-emerald-400" />
                        Recibo
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl bg-zinc-800 hover:bg-zinc-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

