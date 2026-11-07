'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Plus,
  Repeat,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Trash2,
  RefreshCw,
  Pencil,
} from 'lucide-react';
import { Recurrence, Account, CreditCard, Category } from '@/types/database';
import { toggleRecurrenceActive, deleteRecurrence, syncMonthlyRecurrences } from '@/lib/actions/recurrences';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useDateContext } from '@/context/DateContext';
import { isBusinessRecurrence } from '@/lib/business-scope-utils';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { SegmentIcon } from '@/components/ui/SegmentIcon';

const RecurrenceModal = dynamic(
  () => import('./RecurrenceModal').then((m) => m.RecurrenceModal),
  { ssr: false }
);

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
  const { profile, businessName } = useBusinessProfile();
  const { confirm } = useConfirm();
  const { month, year, formattedMonth } = useDateContext();
  const [recurrences, setRecurrences] = useState<Recurrence[]>(initialRecurrences);
  const [modalOpen, setModalOpen] = useState(false);
  const [recurrenceToEdit, setRecurrenceToEdit] = useState<Recurrence | null>(null);
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
      toast.success(
        !rec.active
          ? `Conta fixa "${rec.description}" ativada!`
          : `Conta fixa "${rec.description}" pausada!`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, description: string) => {
    const ok = await confirm({
      title: 'Excluir Conta Fixa',
      description: `Deseja excluir a conta fixa "${description}"? Os lançamentos já gerados nos meses anteriores não serão apagados.`,
      confirmLabel: 'Excluir Conta Fixa',
      variant: 'danger',
    });

    if (ok) {
      try {
        setActionLoadingId(id);
        await deleteRecurrence(id);
        setRecurrences((prev) => prev.filter((r) => r.id !== id));
        toast.success(`Conta fixa "${description}" excluída com sucesso!`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      await syncMonthlyRecurrences(month, year);
      toast.success(`Contas fixas sincronizadas com sucesso para ${formattedMonth}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl">
          <span className="text-xs uppercase tracking-wider text-rose-400 font-semibold block mb-1">
            Despesas Fixas Mensais
          </span>
          <h3 className="text-2xl font-bold text-rose-400 tabular-nums">
            {formatCurrency(totalFixedExpense)}
          </h3>
        </div>

        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl">
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold block mb-1">
            Receitas Fixas Mensais
          </span>
          <h3 className="text-2xl font-bold text-emerald-400 tabular-nums">
            {formatCurrency(totalFixedIncome)}
          </h3>
        </div>

        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl">
          <span className="text-xs uppercase tracking-wider text-[#94A3B8] font-semibold block mb-1">
            Total de Recorrências
          </span>
          <h3 className="text-2xl font-bold text-[#F8FAFC]">
            {recurrences.filter((r) => r.active).length} ativas
          </h3>
        </div>
      </div>

      {/* Barra de Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-[#080B11] border border-[#1E293B] hover:bg-[#151D30] text-[#94A3B8] hover:text-[#F8FAFC] rounded-xl transition w-fit cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Sincronizar em {formattedMonth}
        </button>

        <button
          onClick={() => {
            setRecurrenceToEdit(null);
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#FACC15] hover:bg-[#FDE047] text-[#080B11] font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-[#FACC15]/10 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Nova Conta Fixa
        </button>
      </div>

      {/* Lista de Contas Fixas */}
      <div className="bg-[#0D121F] border border-[#1E293B] rounded-2xl divide-y divide-[#1E293B] overflow-hidden">
        {recurrences.map((rec) => {
          const isExpense = rec.type === 'expense';

          return (
            <div
              key={rec.id}
              className={`p-4 flex items-center justify-between gap-3 hover:bg-[#151D30]/40 transition ${
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-[#F8FAFC] truncate">
                      {rec.description}
                    </h4>
                    {isBusinessRecurrence(rec) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <SegmentIcon segment={profile.segment} className="w-2.5 h-2.5" />
                        {businessName || 'Negócio'}
                      </span>
                    )}
                    {!rec.active && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#080B11] border border-[#1E293B] text-[#94A3B8]">
                        Pausada
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#94A3B8] mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#64748B]" />
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
                  className={`text-sm sm:text-base font-bold tabular-nums ${
                    isExpense ? 'text-[#F8FAFC]' : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(Number(rec.amount))}
                </span>

                {/* Botão Pausar / Ativar */}
                <button
                  onClick={() => handleToggle(rec)}
                  disabled={actionLoadingId === rec.id}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    rec.active
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-[#080B11] text-[#94A3B8] hover:bg-[#151D30] hover:text-[#F8FAFC] border border-[#1E293B]'
                  }`}
                >
                  {rec.active ? 'Ativa' : 'Pausada'}
                </button>

                {/* Botão Editar */}
                <button
                  onClick={() => {
                    setRecurrenceToEdit(rec);
                    setModalOpen(true);
                  }}
                  disabled={actionLoadingId === rec.id}
                  className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151D30] rounded-lg transition cursor-pointer"
                  title="Editar conta fixa"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                {/* Botão Excluir */}
                <button
                  onClick={() => handleDelete(rec.id, rec.description)}
                  disabled={actionLoadingId === rec.id}
                  className="p-1.5 text-[#64748B] hover:text-rose-400 hover:bg-[#151D30] rounded-lg transition cursor-pointer"
                  title="Excluir conta fixa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {recurrences.length === 0 && (
          <div className="py-16 text-center text-[#94A3B8]">
            <Repeat className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#64748B]" />
            <p className="text-sm font-medium text-[#F8FAFC]">Nenhuma conta fixa cadastrada.</p>
            <p className="text-xs text-[#64748B] mt-1">
              Cadastre seu aluguel, salário, contas e assinaturas mensais.
            </p>
          </div>
        )}
      </div>

      <RecurrenceModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setRecurrenceToEdit(null);
        }}
        recurrence={recurrenceToEdit}
        accounts={accounts}
        cards={cards}
        categories={categories}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}

