'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  AlertTriangle,
  Users,
  TrendingUp,
  Search,
  X,
  FileSpreadsheet,
  FileText,
  FileCode,
  Download,
  Filter,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react';
import { Account } from '@/types/database';
import { DebtsOverviewSummary } from '@/lib/actions/sales';
import { DebtClientCard } from './DebtClientCard';
import { formatCurrency } from '@/lib/utils';
import { exportDebtsReport, ExportFormat } from '@/lib/export-utils';

interface FiadosViewProps {
  initialSummary: DebtsOverviewSummary;
  accounts: Account[];
}

type FilterTab = 'all' | 'overdue' | 'soon' | 'no_due';
type SortOption = 'amount_desc' | 'amount_asc' | 'urgency' | 'name_asc';

export function FiadosView({ initialSummary, accounts }: FiadosViewProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortOption, setSortOption] = useState<SortOption>('amount_desc');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleRefresh = () => {
    router.refresh();
  };

  // Contagens para as abas de filtro
  const counts = useMemo(() => {
    let overdueCount = 0;
    let soonCount = 0;
    let noDueCount = 0;

    for (const c of initialSummary.clients) {
      if (c.isOverdue) {
        overdueCount++;
      } else if (c.mostUrgentDueDate) {
        const days = -(c.daysDiff ?? 0);
        if (days >= 0 && days <= 7) {
          soonCount++;
        }
      } else {
        noDueCount++;
      }
    }

    return {
      all: initialSummary.clients.length,
      overdue: overdueCount,
      soon: soonCount,
      noDue: noDueCount,
    };
  }, [initialSummary.clients]);

  // Filtra e ordena a lista de clientes
  const filteredClients = useMemo(() => {
    return initialSummary.clients
      .filter((c) => {
        // Filtro de texto (nome ou telefone)
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchName = c.clientName.toLowerCase().includes(term);
          const matchPhone = c.clientPhone
            ? c.clientPhone.toLowerCase().includes(term)
            : false;
          if (!matchName && !matchPhone) return false;
        }

        // Filtro por aba
        if (activeTab === 'overdue') {
          return c.isOverdue;
        }
        if (activeTab === 'soon') {
          if (c.isOverdue || !c.mostUrgentDueDate) return false;
          const days = -(c.daysDiff ?? 0);
          return days >= 0 && days <= 7;
        }
        if (activeTab === 'no_due') {
          return !c.mostUrgentDueDate;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'amount_desc') {
          return b.totalDebt - a.totalDebt;
        }
        if (sortOption === 'amount_asc') {
          return a.totalDebt - b.totalDebt;
        }
        if (sortOption === 'name_asc') {
          return a.clientName.localeCompare(b.clientName, 'pt-BR');
        }
        if (sortOption === 'urgency') {
          // Vencidos primeiro (maior atraso), depois que vencem mais cedo, depois sem prazo
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          if (a.isOverdue && b.isOverdue) {
            return (b.daysDiff || 0) - (a.daysDiff || 0);
          }
          if (a.mostUrgentDueDate && !b.mostUrgentDueDate) return -1;
          if (!a.mostUrgentDueDate && b.mostUrgentDueDate) return 1;
          if (a.mostUrgentDueDate && b.mostUrgentDueDate) {
            return (a.daysDiff || 0) - (b.daysDiff || 0);
          }
          return b.totalDebt - a.totalDebt;
        }
        return 0;
      });
  }, [initialSummary.clients, searchTerm, activeTab, sortOption]);

  const handleExport = (format: ExportFormat) => {
    setIsExportMenuOpen(false);
    exportDebtsReport({
      format,
      clients: filteredClients,
      totalPendingDebt: initialSummary.totalPendingDebt,
      totalOverdueDebt: initialSummary.totalOverdueDebt,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Fiados & Contas a Receber
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {initialSummary.totalClientsWithDebt} clientes
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Controle de vendas a prazo, cobranças no WhatsApp e quitações parciais.
          </p>
        </div>

        {/* Menu de Exportação */}
        <div className="relative shrink-0">
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Exportar Relatório</span>
          </button>

          {isExportMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <FileText className="w-4 h-4 text-rose-400" />
                <span>Salvar em PDF</span>
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Planilha Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <FileCode className="w-4 h-4 text-blue-400" />
                <span>Arquivo CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4 Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total a Receber */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total a Receber
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatCurrency(initialSummary.totalPendingDebt)}
            </span>
            <p className="text-xs text-slate-500 mt-1">Saldo devedor total acumulado</p>
          </div>
        </div>

        {/* Total Vencido em Atraso */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Vencido
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-400 tracking-tight">
              {formatCurrency(initialSummary.totalOverdueDebt)}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {counts.overdue} {counts.overdue === 1 ? 'cliente em atraso' : 'clientes em atraso'}
            </p>
          </div>
        </div>

        {/* Clientes com Débito */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Clientes Devedores
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {initialSummary.totalClientsWithDebt}
            </span>
            <p className="text-xs text-slate-500 mt-1">Com pelo menos uma comanda em aberto</p>
          </div>
        </div>

        {/* Maior Pendência Individual */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Maior Pendência
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {initialSummary.maxClientDebt ? (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-purple-400 tracking-tight">
                  {formatCurrency(initialSummary.maxClientDebt.amount)}
                </span>
                <p className="text-xs text-slate-400 truncate mt-1">
                  Cliente: <span className="text-white font-medium">{initialSummary.maxClientDebt.clientName}</span>
                </p>
              </>
            ) : (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-600">
                  R$ 0,00
                </span>
                <p className="text-xs text-slate-500 mt-1">Nenhuma pendência ativa</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome do cliente ou telefone..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="amount_desc">Maior Débito</option>
              <option value="amount_asc">Menor Débito</option>
              <option value="urgency">Mais Urgentes (Vencidos)</option>
              <option value="name_asc">Nome do Cliente (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Pílulas de Filtro de Vencimento */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span>Todos</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'all'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-slate-900 text-slate-400'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'overdue'
                ? 'bg-rose-500 text-white font-semibold'
                : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
            }`}
          >
            <span>Vencidos</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'overdue'
                  ? 'bg-black/20 text-white'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {counts.overdue}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('soon')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'soon'
                ? 'bg-blue-500 text-white font-semibold'
                : 'bg-slate-800 text-blue-400 hover:bg-slate-700'
            }`}
          >
            <span>Vencem em até 7 dias</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'soon'
                  ? 'bg-black/20 text-white'
                  : 'bg-blue-500/10 text-blue-400'
              }`}
            >
              {counts.soon}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('no_due')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'no_due'
                ? 'bg-slate-200 text-slate-950 font-semibold'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span>Sem Prazo</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'no_due'
                  ? 'bg-black/20 text-slate-950'
                  : 'bg-slate-900 text-slate-400'
              }`}
            >
              {counts.noDue}
            </span>
          </button>
        </div>
      </div>

      {/* Listagem de Clientes */}
      <div className="space-y-3">
        {filteredClients.length > 0 ? (
          filteredClients.map((clientDebt) => (
            <DebtClientCard
              key={clientDebt.clientId}
              clientDebt={clientDebt}
              accounts={accounts}
              onRefresh={handleRefresh}
            />
          ))
        ) : (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
            {initialSummary.clients.length === 0 ? (
              <>
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  Tudo em dia por aqui!
                </h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Nenhum cliente possui comandas a prazo pendentes no momento. Todas as contas foram quitadas.
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
                  <Filter className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Nenhum devedor encontrado
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                  Nenhum cliente corresponde aos critérios de pesquisa ou filtros selecionados.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setActiveTab('all');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
                >
                  Limpar filtros
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
