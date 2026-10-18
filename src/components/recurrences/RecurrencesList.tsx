'use client';

import { useState } from 'react';
import {
  Plus,
  Repeat,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Recurrence, Account, CreditCard, Category } from '@/types/database';
import { toggleRecurrenceActive, deleteRecurrence, syncMonthlyRecurrences } from '@/lib/actions/recurrences';
import { formatCurrency } from '@/lib/utils';
import { RecurrenceModal } from './RecurrenceModal';
import { useDateContext } from '@/context/DateContext';

interface RecurrencesListProps {
  initialRecurrences: Recurrence[];
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
}

export function RecurrencesList({
  initialRecurrences,
  accounts,
  cards,
  categories,
}: RecurrencesListProps) {
  const { month, year, formattedMonth } = useDateContext();
  const [recurrences, setRecurrences] = useState<Recurrence[]>(initialRecurrences);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const totalFixedExpense = recurrences
    .filter((r) => r.active && r.type === 'expense')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalFixedIncome = recurrences
    .filter((r) => r.active && r.type === 'income')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const handleToggle = async (rec: Recurrence) => {
    try {
      setActionLoadingId(rec.id);
      await toggleRecurrenceActive(rec.id, !rec.active);
      setRecurrences((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, active: !r.active } : r))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao alterar status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir esta conta fixa? Os lançamentos já gerados não serão apagados.')) {
      try {
        setActionLoadingId(id);
        await deleteRecurrence(id);
        setRecurrences((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao excluir');
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      await syncMonthlyRecurrences(month, year);
      alert(`Contas fixas sincronizadas com sucesso para ${formattedMonth}!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <span className="text-xs uppercase tracking-wider text-rose-400 font-semibold block mb-1">
            Despesas Fixas Mensais
          </span>
          <h3 className="text-2xl font-bold text-rose-400">
            {formatCurrency(totalFixedExpense)}
          </h3>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold block mb-1">
            Receitas Fixas Mensais
          </span>
          <h3 className="text-2xl font-bold text-emerald-400">
            {formatCurrency(totalFixedIncome)}
          </h3>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
            Total de Recorrências
          </span>
          <h3 className="text-2xl font-bold text-zinc-100">
            {recurrences.filter((r) => r.active).length} ativas
          </h3>
        </div>
      </div>

      {/* Barra de Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl transition w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Sincronizar em {formattedMonth}
        </button>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Nova Conta Fixa
        </button>
      </div>

      {/* Lista de Contas Fixas */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/80 overflow-hidden">
        {recurrences.map((rec) => {
          const isExpense = rec.type === 'expense';

          return (
            <div
              key={rec.id}
              className={`p-4 flex items-center justify-between gap-3 hover:bg-zinc-800/30 transition ${
                !rec.active ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: isExpense
                      ? 'rgba(244, 63, 94, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                    color: isExpense ? '#fb7185' : '#10b981',
                  }}
                >
                  {isExpense ? (
                    <ArrowDownRight className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-zinc-100 truncate">
                      {rec.description}
                    </h4>
                    {!rec.active && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400">
                        Pausada
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Dia {rec.due_day}
                    </span>
                    <span>•</span>
                    <span>{rec.category?.name || 'Geral'}</span>
                    <span>•</span>
                    <span>{rec.credit_card?.name || rec.account?.name || 'Automático'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-sm sm:text-base font-bold ${
                    isExpense ? 'text-zinc-100' : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(Number(rec.amount))}
                </span>

                {/* Botão Pausar / Ativar */}
                <button
                  onClick={() => handleToggle(rec)}
                  disabled={actionLoadingId === rec.id}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    rec.active
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {rec.active ? 'Ativa' : 'Pausada'}
                </button>

                {/* Botão Excluir */}
                <button
                  onClick={() => handleDelete(rec.id)}
                  disabled={actionLoadingId === rec.id}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {recurrences.length === 0 && (
          <div className="py-16 text-center text-zinc-500">
            <Repeat className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
            <p className="text-sm font-medium">Nenhuma conta fixa cadastrada.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Cadastre seu aluguel, salário, contas e assinaturas mensais.
            </p>
          </div>
        )}
      </div>

      <RecurrenceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        accounts={accounts}
        cards={cards}
        categories={categories}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
