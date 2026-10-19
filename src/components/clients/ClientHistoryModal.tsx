'use client';

import Link from 'next/link';
import {
  X,
  Scissors,
  Calendar,
  Clock,
  Sparkles,
  Crown,
  MessageCircle,
  Pencil,
  TrendingUp,
  FileText,
  ShoppingBag,
} from 'lucide-react';
import { ClientWithStats } from '@/lib/actions/clients';
import { ClientReturnStatus } from '@/lib/client-analytics';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

interface ClientHistoryModalProps {
  client: ClientWithStats | null;
  onClose: () => void;
  onEdit: (client: ClientWithStats) => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferência',
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
}: ClientHistoryModalProps) {
  if (!client) return null;

  const { analytics, salesHistory } = client;
  const whatsappUrl = buildWhatsappLink(client);
  const avgTicket =
    client.totalSalesCount > 0 ? client.totalSpent / client.totalSalesCount : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho da Ficha */}
        <div className="p-5 border-b border-zinc-800 flex items-start justify-between gap-4 bg-zinc-950/60">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-lg text-emerald-400 shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-100 truncate">
                  {client.name}
                </h2>

                {client.isVip && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    <Crown className="w-3 h-3 text-amber-400" />
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

              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
                {client.phone && <span>Tel: {client.phone}</span>}
                {client.cpf && <span>CPF: {client.cpf}</span>}
                <span>
                  Cliente desde {formatDate(client.created_at.split('T')[0])}
                </span>
              </div>

              {client.notes && (
                <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1.5 bg-zinc-900/90 px-2.5 py-1.5 rounded-lg border border-zinc-800">
                  <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{client.notes}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="px-5 py-3 bg-zinc-900 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/vendas?clientId=${client.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs rounded-xl transition shadow-md shadow-emerald-500/10"
            >
              <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
              Novo Atendimento
            </Link>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-semibold text-xs rounded-xl border border-zinc-700/80 transition"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition"
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
            <div className="p-3.5 bg-zinc-950/70 border border-zinc-800/90 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Janela & Ciclo de Retorno
                </span>
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              {analytics.cycleDays ? (
                <>
                  <div className="text-sm font-bold text-zinc-100">
                    A cada ~{analytics.cycleDays} dias
                    {analytics.isEstimatedCycle && (
                      <span className="text-[10px] font-normal text-zinc-500 ml-1">
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
                <div className="text-xs text-zinc-500 py-1">
                  Aguardando 1º atendimento para calcular ciclo
                </div>
              )}
            </div>

            {/* 2. Dias Mais Prováveis */}
            <div className="p-3.5 bg-zinc-950/70 border border-zinc-800/90 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Dias Mais Prováveis
                </span>
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
              </div>
              {analytics.preferredWeekdaysFull.length > 0 ? (
                <>
                  <div className="text-sm font-bold text-zinc-100">
                    {analytics.preferredWeekdaysFull.join(' • ')}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Padrão calculado em {analytics.distinctVisitDays}{' '}
                    {analytics.distinctVisitDays === 1 ? 'visita' : 'visitas'}
                  </div>
                </>
              ) : (
                <div className="text-xs text-zinc-500 py-1">
                  Sem histórico de dias ainda
                </div>
              )}
            </div>

            {/* 3. Serviços Favoritos */}
            <div className="p-3.5 bg-zinc-950/70 border border-zinc-800/90 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Serviços / Produtos Favoritos
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              {analytics.favoriteItems.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {analytics.favoriteItems.map((item) => (
                    <span
                      key={item.name}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-medium"
                    >
                      <span>{item.name}</span>
                      <span className="text-[10px] font-bold text-emerald-400">
                        {item.count}x
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 py-1">
                  Nenhum item registrado
                </div>
              )}
            </div>

            {/* 4. Resumo Financeiro Individual */}
            <div className="p-3.5 bg-zinc-950/70 border border-zinc-800/90 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Faturamento & Ticket Médio
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-sm font-extrabold text-emerald-400">
                {formatCurrency(client.totalSpent)}{' '}
                <span className="text-xs font-normal text-zinc-400">
                  em {client.totalSalesCount}{' '}
                  {client.totalSalesCount === 1 ? 'atendimento' : 'atendimentos'}
                </span>
              </div>
              <div className="text-xs text-zinc-500">
                Ticket médio: {formatCurrency(avgTicket)} por visita
              </div>
            </div>
          </div>

          {/* Linha do Tempo de Atendimentos */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              Histórico de Atendimentos ({salesHistory.length})
            </h3>

            {salesHistory.length === 0 ? (
              <div className="py-10 text-center bg-zinc-950/40 border border-zinc-800/70 rounded-xl text-zinc-500 text-xs">
                Nenhum atendimento registrado para este cliente ainda.
              </div>
            ) : (
              <div className="space-y-2.5">
                {salesHistory.map((sale) => {
                  const items = sale.items || [];
                  return (
                    <div
                      key={sale.id}
                      className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-zinc-200">
                            {formatDateTime(sale.sale_date)}
                          </span>
                          {sale.payment_method && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 uppercase">
                              {PAYMENT_LABELS[sale.payment_method] || sale.payment_method}
                            </span>
                          )}
                        </div>

                        {items.length > 0 ? (
                          <p className="text-xs text-zinc-400 truncate">
                            {items
                              .map(
                                (i) =>
                                  `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.product_name}`
                              )
                              .join(', ')}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-500">Atendimento geral</p>
                        )}

                        {sale.notes && (
                          <p className="text-[11px] text-zinc-500 italic">
                            Obs: {sale.notes}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-emerald-400">
                          {formatCurrency(Number(sale.total_amount))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
