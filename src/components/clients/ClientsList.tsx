'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  FileText,
  Pencil,
  Trash2,
  Calendar,
  DollarSign,
  MessageCircle,
  TrendingUp,
  Clock,
  Crown,
  Scissors,
  Eye,
  ArrowUpDown,
  Radar,
} from 'lucide-react';
import { ClientWithStats, deleteClient } from '@/lib/actions/clients';
import { ClientReturnStatus, getReturnPriorityScore } from '@/lib/client-analytics';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ClientModal } from './ClientModal';
import {
  ClientHistoryModal,
  getStatusBadgeStyle,
  buildWhatsappLink,
  formatShortDayMonth,
} from './ClientHistoryModal';
import { MobileKpiCarousel } from '@/components/dashboard/MobileKpiCarousel';

interface ClientsListProps {
  initialClients: ClientWithStats[];
}

type StatusFilter = 'all' | ClientReturnStatus | 'vip';
type SortOption = 'priority' | 'spent' | 'visits' | 'recent' | 'name';

export function ClientsList({ initialClients }: ClientsListProps) {
  const { confirm } = useConfirm();
  const [clients, setClients] = useState<ClientWithStats[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [modalOpen, setModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<ClientWithStats | null>(null);
  const [selectedClientForHistory, setSelectedClientForHistory] =
    useState<ClientWithStats | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Contadores por filtro
  const counts = useMemo(() => {
    const acc = {
      all: clients.length,
      in_window: 0,
      overdue: 0,
      missing: 0,
      on_track: 0,
      new: 0,
      vip: 0,
    };
    for (const c of clients) {
      acc[c.analytics.status]++;
      if (c.isVip) acc.vip++;
    }
    return acc;
  }, [clients]);

  // Clientes em destaque no Radar (Na Janela + Atrasados)
  const radarClients = useMemo(() => {
    return clients
      .filter(
        (c) =>
          c.analytics.status === 'in_window' || c.analytics.status === 'overdue'
      )
      .sort((a, b) => {
        const scoreDiff =
          getReturnPriorityScore(a.analytics.status) -
          getReturnPriorityScore(b.analytics.status);
        if (scoreDiff !== 0) return scoreDiff;
        return (
          (a.analytics.daysUntilExpected ?? 999) -
          (b.analytics.daysUntilExpected ?? 999)
        );
      })
      .slice(0, 6);
  }, [clients]);

  // Lista filtrada e ordenada
  const filteredClients = useMemo(() => {
    const list = clients.filter((c) => {
      if (statusFilter === 'vip') {
        if (!c.isVip) return false;
      } else if (statusFilter !== 'all') {
        if (c.analytics.status !== statusFilter) return false;
      }

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const nameMatch = c.name.toLowerCase().includes(term);
      const phoneMatch = c.phone?.toLowerCase().includes(term);
      const cpfMatch = c.cpf?.toLowerCase().includes(term);
      return nameMatch || phoneMatch || cpfMatch;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'priority') {
        const pDiff =
          getReturnPriorityScore(a.analytics.status) -
          getReturnPriorityScore(b.analytics.status);
        if (pDiff !== 0) return pDiff;
        return (
          (a.analytics.daysUntilExpected ?? 999) -
          (b.analytics.daysUntilExpected ?? 999)
        );
      }
      if (sortBy === 'spent') {
        return b.totalSpent - a.totalSpent || b.totalSalesCount - a.totalSalesCount;
      }
      if (sortBy === 'visits') {
        return b.totalSalesCount - a.totalSalesCount || b.totalSpent - a.totalSpent;
      }
      if (sortBy === 'recent') {
        const aTime = a.lastSaleDate ? new Date(a.lastSaleDate).getTime() : 0;
        const bTime = b.lastSaleDate ? new Date(b.lastSaleDate).getTime() : 0;
        return bTime - aTime;
      }
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [clients, searchTerm, statusFilter, sortBy]);

  const totalClients = clients.length;
  const totalSalesAll = clients.reduce((sum, c) => sum + c.totalSalesCount, 0);
  const totalRevenueAll = clients.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgTicketPerClient = totalClients > 0 ? totalRevenueAll / totalClients : 0;
  const avgTicketPerSale = totalSalesAll > 0 ? totalRevenueAll / totalSalesAll : 0;

  const handleEdit = (client: ClientWithStats) => {
    setClientToEdit(client);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Remover Cliente',
      description: `Tem certeza que deseja remover o cliente "${name}"? Os atendimentos anteriores permanecerão no histórico.`,
      confirmLabel: 'Remover Cliente',
      variant: 'danger',
    });

    if (ok) {
      try {
        setDeletingId(id);
        await deleteClient(id);
        setClients((prev) => prev.filter((c) => c.id !== id));
        toast.success(`Cliente "${name}" removido com sucesso!`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao excluir cliente.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filterPills: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'in_window', label: 'Na Janela', count: counts.in_window },
    { id: 'overdue', label: 'Atrasados', count: counts.overdue },
    { id: 'missing', label: 'Sumidos', count: counts.missing },
    { id: 'on_track', label: 'Em Dia', count: counts.on_track },
    { id: 'vip', label: 'VIPs', count: counts.vip },
    { id: 'new', label: 'Novos', count: counts.new },
  ];

  return (
    <div className="space-y-6">
      {/* Resumo e Estatísticas de Clientes (Desktop Grid / Mobile Carousel) */}
      <MobileKpiCarousel desktopGridClassName="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4" accentColor="emerald">
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
              Clientes Cadastrados
            </span>
            <span className="text-2xl font-bold text-zinc-100 mt-1 block">
              {totalClients}
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              {counts.vip} {counts.vip === 1 ? 'cliente VIP' : 'clientes VIP'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
              Previstos / Na Janela
            </span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              {counts.in_window}
            </span>
            <span className="text-[11px] text-amber-400/90 block mt-0.5">
              {counts.overdue > 0
                ? `+ ${counts.overdue} atrasado(s) do ciclo`
                : 'Nenhum atrasado no ciclo'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Radar className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
              Faturamento Acumulado
            </span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              {formatCurrency(totalRevenueAll)}
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              em {totalSalesAll} {totalSalesAll === 1 ? 'atendimento' : 'atendimentos'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
              Ticket Médio / Cliente
            </span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">
              {formatCurrency(avgTicketPerClient)}
            </span>
            {totalSalesAll > 0 && (
              <span className="text-[11px] text-zinc-500 block mt-0.5">
                {formatCurrency(avgTicketPerSale)} por atendimento
              </span>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </MobileKpiCarousel>

      {/* Painel Radar de Retorno: Clientes Na Janela ou Atrasados */}
      {radarClients.length > 0 && (
        <div className="p-5 bg-zinc-900/90 border border-emerald-500/25 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  Radar de Retorno — Prováveis Atendimentos
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {counts.in_window + counts.overdue} clientes
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Clientes que entraram na janela prevista de retorno ou passaram do seu ciclo habitual
                </p>
              </div>
            </div>
          </div>

          {/* Grid Desktop (>= md) */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {radarClients.map((client) => {
              const { analytics } = client;
              const whatsappUrl = buildWhatsappLink(client);

              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientForHistory(client)}
                  className="p-3.5 bg-zinc-950/80 hover:bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700 rounded-xl transition cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs text-zinc-100 truncate">
                          {client.name}
                        </span>
                        {client.isVip && (
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${getStatusBadgeStyle(
                          analytics.status
                        )}`}
                      >
                        {analytics.statusLabel}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        Ciclo: <strong className="text-zinc-200">~{analytics.cycleDays}d</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Janela:{' '}
                        <strong className="text-emerald-400">
                          {formatShortDayMonth(analytics.windowStartDate)} a{' '}
                          {formatShortDayMonth(analytics.windowEndDate)}
                        </strong>
                      </span>
                    </div>

                    {analytics.preferredWeekdays.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>
                          Costuma vir:{' '}
                          <strong className="text-blue-300">
                            {analytics.preferredWeekdays.join(' / ')}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/70"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] text-zinc-500">
                      Última vez há {analytics.daysSinceLastVisit}d
                    </span>

                    <div className="flex items-center gap-1.5">
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition"
                          title="Enviar lembrete no WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                          WhatsApp
                        </a>
                      )}

                      <Link
                        href={`/vendas?clientId=${client.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition"
                        title="Registrar atendimento"
                      >
                        <Scissors className="w-3 h-3 text-emerald-400" />
                        Atender
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Carrossel Touch Mobile (< md) */}
          <div className="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {radarClients.map((client) => {
              const { analytics } = client;
              const whatsappUrl = buildWhatsappLink(client);

              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientForHistory(client)}
                  className="p-3.5 bg-zinc-950/90 border border-zinc-800 rounded-xl flex flex-col justify-between gap-3 w-[80vw] max-w-[290px] shrink-0 snap-center cursor-pointer"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-sm text-zinc-100 truncate">
                          {client.name}
                        </span>
                        {client.isVip && (
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${getStatusBadgeStyle(
                          analytics.status
                        )}`}
                      >
                        {analytics.statusLabel}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-400">
                      Janela:{' '}
                      <strong className="text-emerald-400">
                        {formatShortDayMonth(analytics.windowStartDate)} a{' '}
                        {formatShortDayMonth(analytics.windowEndDate)}
                      </strong>
                    </div>

                    <span className="text-[11px] text-zinc-500 block">
                      Última vez há {analytics.daysSinceLastVisit}d
                    </span>
                  </div>

                  <div
                    className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/70"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    ) : (
                      <span className="text-[11px] text-zinc-500">Sem telefone</span>
                    )}
                    <Link
                      href={`/vendas?clientId=${client.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-semibold"
                    >
                      <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                      Atender
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra de Busca, Ordenação e Novo Cliente */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, telefone ou CPF..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs font-medium text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="priority" className="bg-zinc-900">
                  Ordenar: Prioridade de Retorno
                </option>
                <option value="spent" className="bg-zinc-900">
                  Ordenar: Maior Valor Gasto (VIP)
                </option>
                <option value="visits" className="bg-zinc-900">
                  Ordenar: Mais Atendimentos
                </option>
                <option value="recent" className="bg-zinc-900">
                  Ordenar: Última Visita
                </option>
                <option value="name" className="bg-zinc-900">
                  Ordenar: Ordem Alfabética (A-Z)
                </option>
              </select>
            </div>

            <button
              onClick={() => {
                setClientToEdit(null);
                setModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/10"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Novo Cliente
            </button>
          </div>
        </div>

        {/* Pílulas de Filtro por Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {filterPills.map((pill) => {
            const active = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 border ${
                  active
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-500 shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active
                      ? 'bg-zinc-950/20 text-zinc-950 font-extrabold'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
        {/* Versão Desktop (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">Cliente & Status</th>
                <th className="pb-3 font-semibold">Janela & Dias Prováveis</th>
                <th className="pb-3 font-semibold">Contato</th>
                <th className="pb-3 font-semibold text-center">Visitas</th>
                <th className="pb-3 font-semibold text-right">Total Gasto</th>
                <th className="pb-3 font-semibold text-right">Última Visita</th>
                <th className="pb-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredClients.map((client) => {
                const { analytics } = client;
                const whatsappUrl = buildWhatsappLink(client);

                return (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedClientForHistory(client)}
                    className="hover:bg-zinc-800/40 transition cursor-pointer"
                  >
                    <td className="py-3.5 font-medium text-zinc-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-bold text-xs text-emerald-400 shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-zinc-100 truncate max-w-[150px] sm:max-w-none">
                              {client.name}
                            </span>

                            {client.isVip && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                <Crown className="w-2.5 h-2.5 text-amber-400" />
                                VIP
                              </span>
                            )}

                            <span
                              className={`inline-flex items-center px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusBadgeStyle(
                                analytics.status
                              )}`}
                            >
                              {analytics.statusLabel}
                            </span>
                          </div>

                          {client.notes && (
                            <span className="text-[11px] text-zinc-500 flex items-center gap-1 truncate max-w-[220px]">
                              <FileText className="w-3 h-3 shrink-0" />
                              {client.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Coluna: Janela Prevista & Dias mais prováveis */}
                    <td className="py-3.5">
                      {analytics.cycleDays ? (
                        <div className="space-y-0.5">
                          <div className="text-zinc-200 font-semibold flex items-center gap-1.5">
                            <span>A cada ~{analytics.cycleDays}d</span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-emerald-400 text-[11px]">
                              {formatShortDayMonth(analytics.windowStartDate)} a{' '}
                              {formatShortDayMonth(analytics.windowEndDate)}
                            </span>
                          </div>
                          {analytics.preferredWeekdays.length > 0 && (
                            <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                              <span>Costuma vir:</span>
                              <span className="text-blue-400 font-semibold">
                                {analytics.preferredWeekdays.join(' / ')}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-[11px]">
                          Sem atendimentos
                        </span>
                      )}
                    </td>

                    {/* Contato */}
                    <td
                      className="py-3.5 text-zinc-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {client.phone ? (
                        <div className="flex items-center gap-1.5">
                          <span>{client.phone}</span>
                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition"
                              title="Chamar no WhatsApp com mensagem pronta"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    <td className="py-3.5 text-center font-bold text-zinc-200">
                      {client.totalSalesCount}
                    </td>

                    <td className="py-3.5 text-right font-extrabold text-emerald-400">
                      <div>{formatCurrency(client.totalSpent)}</div>
                      {client.totalSalesCount > 0 && (
                        <span className="text-[10px] text-zinc-500 font-normal block">
                          méd.{' '}
                          {formatCurrency(
                            client.totalSpent / client.totalSalesCount
                          )}
                          /visita
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 text-right text-zinc-300 text-[11px]">
                      {client.lastSaleDate ? (
                        <div>
                          <span className="block font-medium">
                            {formatDate(client.lastSaleDate.split('T')[0])}
                          </span>
                          {analytics.daysSinceLastVisit !== null && (
                            <span className="text-[10px] text-zinc-500 block">
                              {analytics.daysSinceLastVisit === 0
                                ? 'Hoje'
                                : `há ${analytics.daysSinceLastVisit}d`}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600">Nenhuma</span>
                      )}
                    </td>

                    <td
                      className="py-3.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedClientForHistory(client)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-zinc-800 transition"
                          title="Ver ficha e histórico de atendimentos"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/vendas?clientId=${client.id}`}
                          className="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-zinc-800 transition"
                          title="Novo atendimento para este cliente"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition"
                          title="Editar cliente"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id, client.name)}
                          disabled={deletingId === client.id}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition"
                          title="Excluir cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {searchTerm || statusFilter !== 'all'
                      ? 'Nenhum cliente encontrado para este filtro.'
                      : 'Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para começar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Versão Mobile Touch (< md): Cards estilo feed */}
        <div className="md:hidden space-y-3">
          {filteredClients.map((client) => {
            const { analytics } = client;
            const whatsappUrl = buildWhatsappLink(client);

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClientForHistory(client)}
                className="p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-3 cursor-pointer hover:border-zinc-700 transition"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-bold text-sm text-emerald-400 shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-zinc-100">
                          {client.name}
                        </span>
                        {client.isVip && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <Crown className="w-2.5 h-2.5 text-amber-400" />
                            VIP
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">
                        {client.phone || 'Sem telefone'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${getStatusBadgeStyle(
                      analytics.status
                    )}`}
                  >
                    {analytics.statusLabel}
                  </span>
                </div>

                {/* Métricas e Janela */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800/70">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Total Gasto</span>
                    <span className="font-extrabold text-emerald-400 text-sm">
                      {formatCurrency(client.totalSpent)}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      {client.totalSalesCount} {client.totalSalesCount === 1 ? 'visita' : 'visitas'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 block">Última Visita</span>
                    <span className="font-semibold text-zinc-200">
                      {client.lastSaleDate ? formatDate(client.lastSaleDate.split('T')[0]) : 'Nenhuma'}
                    </span>
                    {analytics.daysSinceLastVisit !== null && (
                      <span className="text-[10px] text-amber-400 font-medium block mt-0.5">
                        {analytics.daysSinceLastVisit === 0 ? 'Hoje' : `há ${analytics.daysSinceLastVisit}d`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div
                  className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/70"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Zap
                      </a>
                    )}
                    <Link
                      href={`/vendas?clientId=${client.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-semibold"
                    >
                      <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                      Atender
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(client)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition"
                      title="Editar cliente"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id, client.name)}
                      disabled={deletingId === client.id}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition"
                      title="Excluir cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredClients.length === 0 && (
            <div className="py-12 text-center text-zinc-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">
                {searchTerm || statusFilter !== 'all'
                  ? 'Nenhum cliente encontrado para este filtro.'
                  : 'Nenhum cliente cadastrado ainda.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <ClientHistoryModal
        client={selectedClientForHistory}
        onClose={() => setSelectedClientForHistory(null)}
        onEdit={(client) => handleEdit(client)}
      />

      <ClientModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setClientToEdit(null);
        }}
        clientToEdit={clientToEdit}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
