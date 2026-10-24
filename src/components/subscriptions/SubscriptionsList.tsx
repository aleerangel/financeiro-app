'use client';

import { useState, useMemo } from 'react';
import {
  Crown,
  Plus,
  Search,
  Sparkles,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  MessageCircle,
  Pencil,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import {
  Client,
  Account,
  SubscriptionPlan,
  ClientSubscription,
  SubscriptionInvoice,
} from '@/types/database';
import { BusinessMessageSettings } from '@/lib/whatsapp-templates';
import { formatCurrency } from '@/lib/utils';
import { getTodayYMD } from '@/lib/date-utils';
import {
  updateClientSubscriptionStatus,
  deleteClientSubscription,
} from '@/lib/actions/subscriptions';
import { SubscriptionModal } from './SubscriptionModal';
import { SubscriptionPlanModal } from './SubscriptionPlanModal';
import { PayInvoiceModal } from './PayInvoiceModal';
import { SubscriptionChargeWhatsAppModal } from './SubscriptionChargeWhatsAppModal';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

interface SubscriptionsListProps {
  initialSubscriptions: ClientSubscription[];
  clients: Client[];
  plans: SubscriptionPlan[];
  accounts: Account[];
  messageSettings?: BusinessMessageSettings | null;
  onRefresh: () => void;
}

type StatusFilter = 'all' | 'active' | 'pending' | 'overdue' | 'paid' | 'paused';

function getSubscriptionStatusInfo(sub: ClientSubscription, today: string) {
  if (sub.status === 'paused') {
    return { label: 'Pausada', color: 'zinc', type: 'paused' };
  }
  if (sub.status === 'canceled') {
    return { label: 'Cancelada', color: 'zinc', type: 'canceled' };
  }

  const invoice = sub.latest_invoice;
  if (!invoice) {
    return { label: 'Ativa', color: 'emerald', type: 'active' };
  }

  if (invoice.status === 'paid') {
    return { label: 'Em Dia (Pago)', color: 'emerald', type: 'paid' };
  }

  if (invoice.due_date < today) {
    return { label: 'Em Atraso', color: 'rose', type: 'overdue' };
  }

  return { label: 'Pendente', color: 'amber', type: 'pending' };
}

export function SubscriptionsList({
  initialSubscriptions,
  clients,
  plans,
  accounts,
  messageSettings,
  onRefresh,
}: SubscriptionsListProps) {
  const { confirm } = useConfirm();
  const [subscriptions] = useState<ClientSubscription[]>(initialSubscriptions);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  // Modais
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subToEdit, setSubToEdit] = useState<ClientSubscription | null>(null);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState<SubscriptionInvoice | null>(null);
  const [invoiceToCharge, setInvoiceToCharge] = useState<SubscriptionInvoice | null>(null);

  const today = getTodayYMD();

  // KPIs
  const stats = useMemo(() => {
    let activeCount = 0;
    let mrr = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    for (const sub of subscriptions) {
      if (sub.status === 'active') {
        activeCount++;
        mrr += Number(sub.price || 0);

        const statusInfo = getSubscriptionStatusInfo(sub, today);
        if (statusInfo.type === 'overdue') {
          overdueCount++;
        } else if (statusInfo.type === 'pending') {
          pendingCount++;
        }
      }
    }

    return { activeCount, mrr, pendingCount, overdueCount };
  }, [subscriptions, today]);

  // Filtros
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const clientName = sub.client?.name?.toLowerCase() || '';
      const planName = (sub.custom_plan_name || sub.plan?.name || '').toLowerCase();
      const matchesSearch =
        clientName.includes(searchTerm.toLowerCase()) ||
        planName.includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filter === 'all') return true;
      if (filter === 'active') return sub.status === 'active';
      if (filter === 'paused') return sub.status === 'paused';

      const statusInfo = getSubscriptionStatusInfo(sub, today);
      if (filter === 'paid') return statusInfo.type === 'paid';
      if (filter === 'pending') return statusInfo.type === 'pending';
      if (filter === 'overdue') return statusInfo.type === 'overdue';

      return true;
    });
  }, [subscriptions, searchTerm, filter, today]);

  const handleTogglePause = async (sub: ClientSubscription) => {
    const newStatus = sub.status === 'active' ? 'paused' : 'active';
    const actionText = newStatus === 'paused' ? 'pausar' : 'reativar';

    const confirmed = await confirm({
      title: `${newStatus === 'paused' ? 'Pausar' : 'Reativar'} Assinatura?`,
      description: `Deseja realmente ${actionText} a assinatura de ${sub.client?.name}?`,
      confirmLabel: newStatus === 'paused' ? 'Pausar' : 'Reativar',
    });

    if (!confirmed) return;

    try {
      await updateClientSubscriptionStatus(sub.id, newStatus);
      toast.success(`Assinatura ${newStatus === 'paused' ? 'pausada' : 'reativada'}!`);
      onRefresh();
    } catch {
      toast.error('Erro ao atualizar status da assinatura');
    }
  };

  const handleDelete = async (sub: ClientSubscription) => {
    const confirmed = await confirm({
      title: 'Cancelar Assinatura?',
      description: `Deseja remover a assinatura de ${sub.client?.name}? O histórico financeiro existente será mantido.`,
      confirmLabel: 'Cancelar Assinatura',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteClientSubscription(sub.id);
      toast.success('Assinatura removida com sucesso!');
      onRefresh();
    } catch {
      toast.error('Erro ao remover assinatura');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas (MRR, Assinantes, etc.) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">Assinantes Ativos</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-100">{stats.activeCount}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Clientes fidelizados</p>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">MRR (Recorrência)</span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400">
            {formatCurrency(stats.mrr)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Previsão mensal garantida</p>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">Vencendo no Mês</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400">{stats.pendingCount}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Aguardando pagamento</p>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">Em Atraso</span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400">{stats.overdueCount}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Cobrança prioritária</p>
        </div>
      </div>

      {/* Barra de Ações e Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Busca e Filtros Rápidos */}
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por cliente ou plano..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Somente Ativos</option>
              <option value="paid">🟢 Em Dia (Pago)</option>
              <option value="pending">🟡 Pendente (A Vencer)</option>
              <option value="overdue">🔴 Em Atraso</option>
              <option value="paused">⏸️ Pausados</option>
            </select>
          </div>
        </div>

        {/* Botões de Criação */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlansModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Planos ({plans.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setSubToEdit(null);
              setSubModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition shadow-lg shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4" />
            Novo Assinante
          </button>
        </div>
      </div>

      {/* Lista de Assinantes */}
      {filteredSubscriptions.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800">
          <Crown className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-200">
            Nenhuma assinatura encontrada
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchTerm || filter !== 'all'
              ? 'Tente ajustar os filtros de busca para encontrar o assinante.'
              : 'Cadastre seus clientes em planos mensais como "Clube do Corte" para garantir receita recorrente previsível!'}
          </p>
          {!searchTerm && filter === 'all' && (
            <button
              onClick={() => {
                setSubToEdit(null);
                setSubModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeiro Assinante
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSubscriptions.map((sub) => {
            const statusInfo = getSubscriptionStatusInfo(sub, today);
            const clientName = sub.client?.name || 'Cliente';
            const planName = sub.custom_plan_name || sub.plan?.name || 'Assinatura';
            const invoice = sub.latest_invoice;
            const canPay = invoice && invoice.status === 'pending';

            return (
              <div
                key={sub.id}
                className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700/80 transition flex flex-col justify-between"
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-zinc-100 text-sm">
                        {clientName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-100 leading-tight">
                          {clientName}
                        </h4>
                        <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Crown className="w-3 h-3 text-amber-400 inline" />
                          {planName}
                        </p>
                      </div>
                    </div>

                    {/* Badge de Status */}
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                        statusInfo.type === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : statusInfo.type === 'overdue'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : statusInfo.type === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Informações de Vencimento e Preço */}
                  <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/60 space-y-1.5 my-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Valor Recorrente:</span>
                      <span className="font-bold text-emerald-400">
                        {formatCurrency(sub.price)}
                        <span className="text-[10px] text-zinc-500 font-normal">/mês</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Dia de Vencimento:</span>
                      <span className="font-semibold text-zinc-300">
                        Todo dia {sub.due_day}
                      </span>
                    </div>

                    {invoice && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/40">
                        <span className="text-zinc-500">Fatura Atual:</span>
                        <span className="font-medium text-zinc-300">
                          {new Date(invoice.due_date + 'T12:00:00Z').toLocaleDateString(
                            'pt-BR'
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTogglePause(sub)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                      title={sub.status === 'active' ? 'Pausar assinatura' : 'Reativar assinatura'}
                    >
                      {sub.status === 'active' ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSubToEdit(sub);
                        setSubModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                      title="Editar assinatura"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(sub)}
                      className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Cancelar assinatura"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botão de WhatsApp */}
                    {invoice && (
                      <button
                        type="button"
                        onClick={() => setInvoiceToCharge(invoice)}
                        className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition flex items-center gap-1 text-xs font-semibold"
                        title="Enviar cobrança via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Cobrar</span>
                      </button>
                    )}

                    {/* Botão de Baixa / Receber */}
                    {canPay ? (
                      <button
                        type="button"
                        onClick={() => setInvoiceToPay(invoice)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Receber
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-500 font-medium px-2 py-1">
                        {statusInfo.type === 'paid' ? 'Quitado' : 'Sem fatura'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      {subModalOpen && (
        <SubscriptionModal
          isOpen={subModalOpen}
          onClose={() => setSubModalOpen(false)}
          clients={clients}
          plans={plans}
          subscriptionToEdit={subToEdit}
          onSuccess={onRefresh}
        />
      )}

      {plansModalOpen && (
        <SubscriptionPlanModal
          isOpen={plansModalOpen}
          onClose={() => setPlansModalOpen(false)}
          plans={plans}
          onPlansUpdated={onRefresh}
        />
      )}

      {invoiceToPay && (
        <PayInvoiceModal
          isOpen={Boolean(invoiceToPay)}
          onClose={() => setInvoiceToPay(null)}
          invoice={invoiceToPay}
          accounts={accounts}
          onSuccess={onRefresh}
        />
      )}

      {invoiceToCharge && (
        <SubscriptionChargeWhatsAppModal
          isOpen={Boolean(invoiceToCharge)}
          onClose={() => setInvoiceToCharge(null)}
          invoice={invoiceToCharge}
          messageSettings={messageSettings}
        />
      )}
    </div>
  );
}
