'use client';

import { useState } from 'react';
import {
  Plus,
  Scissors,
  Users,
  DollarSign,
  TrendingUp,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Sale, Product, Account, Client } from '@/types/database';
import { deleteSale } from '@/lib/actions/sales';
import { formatCurrency } from '@/lib/utils';
import { getTodayYMD, getZonedYMD, getZonedTimeParts } from '@/lib/date-utils';
import { NewSaleModal } from './NewSaleModal';

interface SalesViewProps {
  initialSales: Sale[];
  products: Product[];
  accounts: Account[];
  clients?: Client[];
  initialClientId?: string | null;
}

export function SalesView({
  initialSales,
  products,
  accounts,
  clients,
  initialClientId = null,
}: SalesViewProps) {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [modalOpen, setModalOpen] = useState(Boolean(initialClientId));
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'today' | 'all'>('today');

  const todayDateStr = getTodayYMD();

  // Filtra as vendas de hoje no fuso de São Paulo
  const todaySales = sales.filter((s) => getZonedYMD(s.sale_date) === todayDateStr);
  const todayTotal = todaySales.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
  const todayClientsCount = todaySales.length;
  const todayAverageTicket = todayClientsCount > 0 ? todayTotal / todayClientsCount : 0;

  // Total do mês
  const monthTotal = sales.reduce((acc, curr) => acc + Number(curr.total_amount), 0);

  const displayedSales = filterMode === 'today' ? todaySales : sales;

  const handleDelete = async (id: string) => {
    if (confirm('Deseja estornar e excluir este atendimento? A receita correspondente será removida do financeiro.')) {
      try {
        setDeletingId(id);
        await deleteSale(id);
        setSales((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao excluir atendimento');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatSaleTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const { month, day, hour, minute } = getZonedTimeParts(d);
    const hours = String(hour).padStart(2, '0');
    const minutes = String(minute).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const mm = String(month + 1).padStart(2, '0');

    if (getZonedYMD(dateStr) === todayDateStr) {
      return `Hoje às ${hours}:${minutes}`;
    }
    return `${dd}/${mm} às ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo Operacional do Dia */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Faturamento Hoje */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Faturamento Hoje
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-emerald-400">
              {formatCurrency(todayTotal)}
            </h2>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Entradas registradas hoje
            </span>
          </div>
        </div>

        {/* Clientes Hoje */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Clientes Atendidos
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100">
              {todayClientsCount} {todayClientsCount === 1 ? 'cliente' : 'clientes'}
            </h2>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Comandas finalizadas hoje
            </span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Ticket Médio
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-purple-300">
              {formatCurrency(todayAverageTicket)}
            </h2>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Média por atendimento hoje
            </span>
          </div>
        </div>

        {/* Total no Mês */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Faturamento no Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100">
              {formatCurrency(monthTotal)}
            </h2>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Acumulado de atendimentos
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Botão Novo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterMode('today')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterMode === 'today'
                ? 'bg-zinc-100 text-zinc-900'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            Hoje ({todayClientsCount})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterMode === 'all'
                ? 'bg-zinc-100 text-zinc-900'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            Todas as Comandas ({sales.length})
          </button>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Novo Atendimento
        </button>
      </div>

      {/* Histórico de Comandas */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/80 overflow-hidden">
        {displayedSales.map((sale) => {
          const itemsDesc = sale.items
            ? sale.items
                .map((i) => `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.product_name}`)
                .join(', ')
            : 'Atendimento';

          return (
            <div
              key={sale.id}
              className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-800/30 transition group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Scissors className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-zinc-100 truncate">
                      {sale.client_name}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 uppercase tracking-wider font-semibold">
                      {sale.payment_method}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 mt-0.5 truncate">
                    {itemsDesc}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                    <span>{formatSaleTime(sale.sale_date)}</span>
                    <span>•</span>
                    <span>{sale.account?.name || 'Carteira'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-base font-extrabold text-emerald-400">
                  {formatCurrency(Number(sale.total_amount))}
                </span>

                <button
                  onClick={() => handleDelete(sale.id)}
                  disabled={deletingId === sale.id}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-xl transition opacity-60 group-hover:opacity-100"
                  title="Estornar comanda"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {displayedSales.length === 0 && (
          <div className="py-16 text-center text-zinc-500">
            <Scissors className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
            <p className="text-sm font-medium">Nenhum atendimento registrado {filterMode === 'today' ? 'hoje' : 'no período'}.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Clique em &quot;Novo Atendimento&quot; para abrir a comanda do próximo cliente.
            </p>
          </div>
        )}
      </div>

      <NewSaleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        products={products}
        accounts={accounts}
        clients={clients}
        initialClientId={initialClientId}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}

