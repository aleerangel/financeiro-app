'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { ClientWithStats, deleteClient } from '@/lib/actions/clients';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ClientModal } from './ClientModal';

interface ClientsListProps {
  initialClients: ClientWithStats[];
}

export function ClientsList({ initialClients }: ClientsListProps) {
  const [clients, setClients] = useState<ClientWithStats[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<ClientWithStats | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredClients = clients.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(term);
    const phoneMatch = c.phone?.toLowerCase().includes(term);
    const cpfMatch = c.cpf?.toLowerCase().includes(term);
    return nameMatch || phoneMatch || cpfMatch;
  });

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
    if (confirm(`Tem certeza que deseja remover o cliente "${name}"? Os atendimentos anteriores permanecerão no histórico.`)) {
      try {
        setDeletingId(id);
        await deleteClient(id);
        setClients((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao excluir cliente.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const getCleanPhone = (phone?: string | null) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return null;
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  return (
    <div className="space-y-6">
      {/* Resumo e Estatísticas de Clientes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
              Clientes Cadastrados
            </span>
            <span className="text-2xl font-bold text-zinc-100 mt-1 block">
              {totalClients}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
              Total de Atendimentos
            </span>
            <span className="text-2xl font-bold text-zinc-100 mt-1 block">
              {totalSalesAll}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Calendar className="w-5 h-5" />
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
      </div>

      {/* Barra de Busca e Ação de Novo Cliente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

      {/* Tabela de Clientes */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">Cliente</th>
                <th className="pb-3 font-semibold">Telefone</th>
                <th className="pb-3 font-semibold">CPF</th>
                <th className="pb-3 font-semibold text-center">Atendimentos</th>
                <th className="pb-3 font-semibold text-right">Total Gasto</th>
                <th className="pb-3 font-semibold text-right">Última Visita</th>
                <th className="pb-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredClients.map((client) => {
                const whatsappNumber = getCleanPhone(client.phone);

                return (
                  <tr key={client.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3.5 font-medium text-zinc-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-bold text-xs text-emerald-400 shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-zinc-100 block truncate max-w-[160px] sm:max-w-none">
                            {client.name}
                          </span>
                          {client.notes && (
                            <span className="text-[11px] text-zinc-500 flex items-center gap-1 truncate max-w-[200px]">
                              <FileText className="w-3 h-3 shrink-0" />
                              {client.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 text-zinc-300">
                      {client.phone ? (
                        <div className="flex items-center gap-1.5">
                          <span>{client.phone}</span>
                          {whatsappNumber && (
                            <a
                              href={`https://wa.me/${whatsappNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    <td className="py-3.5 text-zinc-400 font-mono text-[11px]">
                      {client.cpf || <span className="text-zinc-600">-</span>}
                    </td>

                    <td className="py-3.5 text-center font-bold text-zinc-200">
                      {client.totalSalesCount}
                    </td>

                    <td className="py-3.5 text-right font-extrabold text-emerald-400">
                      <div>{formatCurrency(client.totalSpent)}</div>
                      {client.totalSalesCount > 0 && (
                        <span className="text-[10px] text-zinc-500 font-normal block">
                          méd. {formatCurrency(client.totalSpent / client.totalSalesCount)}/visita
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 text-right text-zinc-400 text-[11px]">
                      {client.lastSaleDate
                        ? formatDate(client.lastSaleDate.split('T')[0])
                        : 'Nenhuma'}
                    </td>

                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
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
                    {searchTerm
                      ? 'Nenhum cliente encontrado com esse termo.'
                      : 'Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para começar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setClientToEdit(null);
        }}
        clientToEdit={clientToEdit}
        onSuccess={() => {
          // Atualiza lista
          window.location.reload();
        }}
      />
    </div>
  );
}
