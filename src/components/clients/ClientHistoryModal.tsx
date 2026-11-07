'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  Crown,
  MessageCircle,
  Pencil,
  TrendingUp,
  FileText,
  ShoppingBag,
  HandCoins,
  CheckCircle2,
} from 'lucide-react';
import { ClientWithStats } from '@/lib/actions/clients';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { SegmentIcon } from '@/components/ui/SegmentIcon';
import {
  ClientReturnStatus,
  RawClientSale,
  RawClientSaleAmortization,
  computeClientMonthlyAverage,
} from '@/lib/client-analytics';
import { Sale, SalePaymentMethod, PaymentMethod } from '@/types/database';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

const SaleReceiptModal = dynamic(
  () => import('@/components/sales/SaleReceiptModal').then((m) => m.SaleReceiptModal),
  { ssr: false }
);

interface ClientHistoryModalProps {
  client: ClientWithStats | null;
  onClose: () => void;
  onEdit: (client: ClientWithStats) => void;
  onAmortizeClient?: (client: ClientWithStats) => void;
  onAmortizeSale?: (sale: RawClientSale) => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferência',
  on_credit: 'A Prazo',
};

export function getStatusBadgeStyle(status: ClientReturnStatus): string {
  switch (status) {
    case 'in_window':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'overdue':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'missing':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    case 'on_track':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'new':
    default:
      return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  }
}

export function buildWhatsappLink(client: ClientWithStats): string | null {
  if (!client.phone) return null;
  const digits = client.phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const fullPhone = digits.startsWith('55') ? digits : `55${digits}`;
  const firstName = client.name.split(' ')[0];

  let message = `Fala ${firstName}, tudo certo?`;
  const { status, preferredWeekdaysFull } = client.analytics;
  const dayHint =
    preferredWeekdaysFull.length > 0
      ? ` Vi aqui que você costuma dar um trato no visual por volta de ${preferredWeekdaysFull.join(' ou ').toLowerCase()}.`
      : '';

  if (status === 'in_window') {
    message = `Fala ${firstName}, tudo beleza? Já está chegando aquela época de renovar o corte!${dayHint} Bora garantir seu horário essa semana?`;
  } else if (status === 'overdue') {
    message = `Fala ${firstName}, tudo tranquilo? Passando pra lembrar que já passou daquele seu ciclo habitual de corte!${dayHint} Quando quiser dar um talento no visual, é só chamar!`;
  } else if (status === 'missing') {
    message = `Fala ${firstName}, tudo joia meu parceiro? Faz tempo que não aparece na barbearia! Quando quiser alinhar o corte novamente, as portas estão abertas.`;
  }

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}

export function formatShortDayMonth(ymd: string | null): string {
  if (!ymd) return '-';
  const [, m, d] = ymd.split('-');
  return `${d}/${m}`;
}

export function ClientHistoryModal({
  client,
  onClose,
  onEdit,
  onAmortizeClient,
  onAmortizeSale,
}: ClientHistoryModalProps) {
  const { profile, salesLabel } = useBusinessProfile();
  const [receiptSaleTarget, setReceiptSaleTarget] = useState<Sale | null>(null);
  if (!client) return null;

  const { analytics, salesHistory } = client;
  const whatsappUrl = buildWhatsappLink(client);
  const avgTicket =
    client.totalSalesCount > 0 ? client.totalSpent / client.totalSalesCount : 0;
  const avgMonthly = computeClientMonthlyAverage(client.salesHistory, client.totalSpent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0D121F] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho da Ficha */}
        <div className="p-5 border-b border-[#1E293B] flex items-start justify-between gap-4 bg-[#080B11]">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#FACC15]/10 border border-[#FACC15]/20 flex items-center justify-center font-bold text-lg text-[#FACC15] shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-[#F8FAFC] truncate">
                  {client.name}
                </h2>

                {client.isVip && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#FACC15]/15 text-[#FDE047] border border-[#FACC15]/30">
                    <Crown className="w-3 h-3 text-[#FACC15]" />
                    VIP
                  </span>
                )}

                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeStyle(
                    analytics.status
                  )}`}
                >
                  {analytics.statusLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#94A3B8] mt-1">
                {client.phone && <span>Tel: {client.phone}</span>}
                {client.cpf && <span>CPF: {client.cpf}</span>}
                <span>
                  Cliente desde {formatDate(client.created_at.split('T')[0])}
                </span>
              </div>

              {client.notes && (
                <p className="text-xs text-[#94A3B8] mt-2 flex items-center gap-1.5 bg-[#0D121F] px-2.5 py-1.5 rounded-lg border border-[#1E293B]">
                  <FileText className="w-3.5 h-3.5 text-[#FACC15] shrink-0" />
                  <span>{client.notes}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#151D30] transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="px-5 py-3 bg-[#080B11] border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/vendas?clientId=${client.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FACC15] hover:bg-[#FDE047] active:bg-[#EAB308] text-[#080B11] font-bold text-xs rounded-xl transition shadow-md shadow-[#FACC15]/20"
            >
              <SegmentIcon segment={profile.segment} className="w-3.5 h-3.5 stroke-[2.5]" />
              Novo(a) {salesLabel}
            </Link>

            {Number(client.totalDebt || 0) > 0 && onAmortizeClient && (
              <button
                type="button"
                onClick={() => onAmortizeClient(client)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs rounded-xl transition active:scale-95"
              >
                <HandCoins className="w-3.5 h-3.5" />
                Receber Débito ({formatCurrency(Number(client.totalDebt))})
              </button>
            )}

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#151D30] hover:bg-[#1E293B] text-emerald-400 font-semibold text-xs rounded-xl border border-[#1E293B] transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Chamar no WhatsApp
              </a>
            )}
          </div>

          <button
            onClick={() => {
              onClose();
              onEdit(client);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151D30] rounded-xl transition"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar Cadastro
          </button>
        </div>

        {/* Conteúdo Rolável */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* 4 Cards de Inteligência Preditiva */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Ciclo e Janela Prevista */}
            <div className="p-3.5 bg-[#080B11] border border-[#1E293B] rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Janela & Ciclo de Retorno
                </span>
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              {analytics.cycleDays ? (
                <>
                  <div className="text-sm font-bold text-[#F8FAFC]">
                    A cada ~{analytics.cycleDays} dias
                    {analytics.isEstimatedCycle && (
                      <span className="text-[10px] font-normal text-[#64748B] ml-1">
                        (estimativa 1ª visita)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-emerald-400 font-medium">
                    Janela prevista: {formatShortDayMonth(analytics.windowStartDate)} a{' '}
                    {formatShortDayMonth(analytics.windowEndDate)}
                  </div>
                </>
              ) : (
                <div className="text-xs text-[#64748B] py-1">
                  Aguardando 1º atendimento para calcular ciclo
                </div>
              )}
            </div>

            {/* 2. Dias Mais Prováveis */}
            <div className="p-3.5 bg-[#080B11] border border-[#1E293B] rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Dias Mais Prováveis
                </span>
                <Calendar className="w-3.5 h-3.5 text-[#6366F1]" />
              </div>
              {analytics.preferredWeekdaysFull.length > 0 ? (
                <>
                  <div className="text-sm font-bold text-[#F8FAFC]">
                    {analytics.preferredWeekdaysFull.join(' • ')}
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Padrão calculado em {analytics.distinctVisitDays}{' '}
                    {analytics.distinctVisitDays === 1 ? 'visita' : 'visitas'}
                  </div>
                </>
              ) : (
                <div className="text-xs text-[#64748B] py-1">
                  Sem histórico de dias ainda
                </div>
              )}
            </div>

            {/* 3. Serviços Favoritos */}
            <div className="p-3.5 bg-[#080B11] border border-[#1E293B] rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Serviços / Produtos Favoritos
                </span>
                <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" />
              </div>
              {analytics.favoriteItems.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {analytics.favoriteItems.map((item) => (
                    <span
                      key={item.name}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#151D30] border border-[#1E293B] text-xs text-[#F8FAFC] font-medium"
                    >
                      <span>{item.name}</span>
                      <span className="text-[10px] font-bold text-[#FACC15] tabular-nums">
                        {item.count}x
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#64748B] py-1">
                  Nenhum item registrado
                </div>
              )}
            </div>

            {/* 4. Resumo Financeiro Individual */}
            <div className="p-3.5 bg-[#080B11] border border-[#1E293B] rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Faturamento & Ticket Médio
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-sm font-extrabold text-emerald-400 tabular-nums">
                {formatCurrency(client.totalSpent)}{' '}
                <span className="text-xs font-normal text-[#94A3B8]">
                  acumulado ({client.totalSalesCount}{' '}
                  {client.totalSalesCount === 1 ? 'atendimento' : 'atendimentos'})
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#94A3B8] pt-1.5 border-t border-[#1E293B]/60 tabular-nums gap-1">
                <span>Por visita: <strong className="text-[#F8FAFC]">{formatCurrency(avgTicket)}</strong></span>
                <span>Média mensal: <strong className="text-amber-400">{formatCurrency(avgMonthly)}</strong></span>
              </div>
            </div>
          </div>

          {/* Linha do Tempo de Atendimentos */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-3 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-[#FACC15]" />
              Histórico de Atendimentos ({salesHistory.length})
            </h3>

            {salesHistory.length === 0 ? (
              <div className="py-10 text-center bg-[#080B11] border border-[#1E293B] rounded-xl text-[#64748B] text-xs">
                Nenhum atendimento registrado para este cliente ainda.
              </div>
            ) : (
              <div className="space-y-2.5">
                {salesHistory.map((sale) => {
                  const items = sale.items || [];
                  const isOnCredit = sale.payment_method === 'on_credit';
                  const remaining = Number(
                    sale.remaining_amount ?? (isOnCredit ? sale.total_amount : 0)
                  );
                  const isPending =
                    isOnCredit && sale.status !== 'paid' && remaining > 0;

                  return (
                    <div
                      key={sale.id}
                      className="p-3.5 bg-[#080B11] border border-[#1E293B] rounded-xl space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-[#F8FAFC]">
                              {formatDateTime(sale.sale_date)}
                            </span>
                            {sale.payment_method && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#151D30] text-[#94A3B8] uppercase">
                                {PAYMENT_LABELS[sale.payment_method] || sale.payment_method}
                              </span>
                            )}
                            {isOnCredit && (
                              <>
                                {isPending ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 tabular-nums">
                                    A Prazo • Faltam {formatCurrency(remaining)}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    Quitado
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {items.length > 0 ? (
                            <p className="text-xs text-[#94A3B8] truncate">
                              {items
                                .map(
                                  (i) =>
                                    `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.product_name}`
                                )
                                .join(', ')}
                            </p>
                          ) : (
                            <p className="text-xs text-[#64748B]">Atendimento geral</p>
                          )}

                          {sale.notes && (
                            <p className="text-[11px] text-[#64748B] italic">
                              Obs: {sale.notes}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-extrabold text-[#F8FAFC] block tabular-nums">
                            {formatCurrency(Number(sale.total_amount))}
                          </span>
                          <div className="flex items-center gap-1.5 justify-end mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const saleObj: Sale = {
                                  id: sale.id,
                                  user_id: '',
                                  client_id: client.id,
                                  client_name: client.name,
                                  total_amount: sale.total_amount,
                                  paid_amount: sale.paid_amount,
                                  remaining_amount: sale.remaining_amount,
                                  status: sale.status,
                                  payment_method: (sale.payment_method || 'money') as SalePaymentMethod,
                                  due_date: sale.due_date,
                                  account_id: null,
                                  transaction_id: null,
                                  sale_date: sale.sale_date,
                                  notes: sale.notes || null,
                                  created_at: sale.sale_date,
                                  items: sale.items?.map((item, idx) => ({
                                    id: String(idx),
                                    sale_id: sale.id,
                                    product_id: null,
                                    product_name: item.product_name,
                                    quantity: item.quantity,
                                    unit_price: item.unit_price,
                                    total_price: item.total_price,
                                    created_at: sale.sale_date,
                                  })),
                                  client: {
                                    id: client.id,
                                    user_id: '',
                                    name: client.name,
                                    phone: client.phone || null,
                                    cpf: client.cpf || null,
                                    created_at: client.created_at || '',
                                    updated_at: client.created_at || '',
                                  },
                                  amortizations: sale.amortizations?.map((a) => ({
                                    id: a.id,
                                    sale_id: sale.id,
                                    user_id: '',
                                    account_id: '',
                                    transaction_id: null,
                                    amount: a.amount,
                                    payment_method: (a.payment_method || 'money') as PaymentMethod,
                                    amortized_at: a.amortized_at,
                                    created_at: a.amortized_at,
                                    account: null,
                                  })),
                                };
                                setReceiptSaleTarget(saleObj);
                              }}
                              className="px-2 py-1 bg-[#151D30] hover:bg-[#1E293B] text-slate-300 hover:text-[#FACC15] font-semibold text-[10px] rounded-lg transition inline-flex items-center gap-1 border border-[#1E293B]"
                              title="Gerar Nota de Serviço / Venda"
                            >
                              <FileText className="w-3 h-3" />
                              Nota
                            </button>

                            {isOnCredit && isPending && onAmortizeSale && (
                              <button
                                type="button"
                                onClick={() => onAmortizeSale(sale)}
                                className="px-2.5 py-1 bg-[#FACC15]/15 hover:bg-[#FACC15]/25 border border-[#FACC15]/30 text-[#FDE047] font-bold text-[10px] rounded-lg transition inline-flex items-center gap-1 active:scale-95"
                              >
                                <HandCoins className="w-3 h-3" />
                                Amortizar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Histórico de Amortizações desta comanda */}
                      {sale.amortizations && sale.amortizations.length > 0 && (
                        <div className="pt-2 border-t border-[#1E293B]/60 space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] block">
                            Amortizações Realizadas ({sale.amortizations.length}):
                          </span>
                          <div className="space-y-0.5">
                            {sale.amortizations.map((am: RawClientSaleAmortization) => (
                              <div
                                key={am.id}
                                className="text-[11px] text-[#94A3B8] flex items-center justify-between bg-[#0D121F] px-2 py-1 rounded-md border border-[#1E293B]/50"
                              >
                                <span>
                                  {formatDate(am.amortized_at.split('T')[0])} •{' '}
                                  {PAYMENT_LABELS[am.payment_method] || am.payment_method}
                                </span>
                                <strong className="text-emerald-400 font-semibold tabular-nums">
                                  +{formatCurrency(Number(am.amount))}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {receiptSaleTarget && (
        <SaleReceiptModal
          isOpen={Boolean(receiptSaleTarget)}
          onClose={() => setReceiptSaleTarget(null)}
          sale={receiptSaleTarget}
        />
      )}
    </div>
  );
}

