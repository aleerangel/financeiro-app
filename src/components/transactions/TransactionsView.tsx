'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard as CardIcon,
  CheckCircle2,
  Clock,
  Trash2,
  Filter,
  Pencil,
} from 'lucide-react';
import { Transaction, Account, CreditCard, Category } from '@/types/database';
import { useDateContext } from '@/context/DateContext';
import { getTransactions, toggleTransactionPaid, deleteTransaction } from '@/lib/actions/transactions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TransactionModal } from './TransactionModal';

interface TransactionsViewProps {
  initialAccounts: Account[];
  initialCards: CreditCard[];
  initialCategories: Category[];
}

type FilterType = 'all' | 'expense' | 'income' | 'credit' | 'pending';

export function TransactionsView({
  initialAccounts,
  initialCards,
  initialCategories,
}: TransactionsViewProps) {
  const { month, year, formattedMonth } = useDateContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTransactions(month, year);
      setTransactions(data);
    } catch (err) {
      console.error('Erro ao carregar transações:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    let active = true;
    getTransactions(month, year)
      .then((data) => {
        if (active) {
          setTransactions(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar transações:', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [month, year]);

  const handleTogglePaid = async (t: Transaction) => {
    try {
      setActionLoadingId(t.id);
      await toggleTransactionPaid(t.id, !t.is_paid);
      setTransactions((prev) =>
        prev.map((item) =>
          item.id === t.id ? { ...item, is_paid: !t.is_paid } : item
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (t: Transaction) => {
    let deleteEntireGroup = false;

    if (t.installment_group_id && t.total_installments && t.total_installments > 1) {
      const choice = confirm(
        `Esta despesa faz parte de uma compra parcelada em ${t.total_installments}x.\n\n` +
        `Clique em OK para excluir TODAS as parcelas desta compra.\n` +
        `Clique em CANCELAR para excluir SOMENTE esta parcela.`
      );
      deleteEntireGroup = choice;
    } else {
      if (!confirm('Deseja realmente excluir este lançamento?')) {
        return;
      }
    }

    try {
      setActionLoadingId(t.id);
      await deleteTransaction(t.id, deleteEntireGroup);
      await refreshData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cálculos consolidados do mês (Realizado vs Previsto)
  const receivedIncome = transactions
    .filter((t) => t.type === 'income' && t.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const pendingIncome = transactions
    .filter((t) => t.type === 'income' && !t.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const paidExpense = transactions
    .filter((t) => t.type === 'expense' && t.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const pendingExpense = transactions
    .filter((t) => t.type === 'expense' && !t.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const realizedBalance = receivedIncome - paidExpense;
  const projectedBalance = (receivedIncome + pendingIncome) - (paidExpense + pendingExpense);

  // Filtros
  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'expense') return t.type === 'expense' && t.payment_method !== 'credit';
    if (filter === 'income') return t.type === 'income';
    if (filter === 'credit') return t.payment_method === 'credit';
    if (filter === 'pending') return !t.is_paid;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Cards de Resumo do Mês */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
            Receitas Recebidas
          </span>
          <span className="text-lg sm:text-xl font-bold text-emerald-400 block">
            {formatCurrency(receivedIncome)}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            {pendingIncome > 0 ? `+ ${formatCurrency(pendingIncome)} a receber` : 'Tudo recebido'}
          </span>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
            Despesas Pagas
          </span>
          <span className="text-lg sm:text-xl font-bold text-rose-400 block">
            {formatCurrency(paidExpense)}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            {pendingExpense > 0 ? `+ ${formatCurrency(pendingExpense)} a pagar` : 'Tudo pago'}
          </span>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
            Balanço Realizado
          </span>
          <span
            className={`text-lg sm:text-xl font-bold block ${
              realizedBalance >= 0 ? 'text-zinc-100' : 'text-rose-400'
            }`}
          >
            {formatCurrency(realizedBalance)}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            Previsão: {formatCurrency(projectedBalance)}
          </span>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-400 block mb-1">
            A Pagar / Pendente
          </span>
          <span className="text-lg sm:text-xl font-bold text-amber-300 block">
            {formatCurrency(pendingExpense)}
          </span>
          <span className="text-[10px] text-emerald-400/80 mt-1 block">
            A receber: {formatCurrency(pendingIncome)}
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Botão Novo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1 hidden sm:inline" />
          {[
            { id: 'all', label: 'Todos' },
            { id: 'expense', label: 'Despesas' },
            { id: 'credit', label: 'Cartão' },
            { id: 'income', label: 'Receitas' },
            { id: 'pending', label: 'Pendentes' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as FilterType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                filter === f.id
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setTransactionToEdit(null);
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Nova Transação
        </button>
      </div>

      {/* Lista de Transações */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/80 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            Carregando transações de {formattedMonth}...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
            <p className="text-sm font-medium">Nenhum lançamento encontrado em {formattedMonth}.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Use o botão &quot;Nova Transação&quot; para registrar receitas ou despesas.
            </p>
          </div>
        ) : (
          filteredTransactions.map((t) => {
            const isCredit = t.payment_method === 'credit';
            const isIncome = t.type === 'income';

            return (
              <div
                key={t.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-800/40 transition group"
              >
                {/* Lado Esquerdo: Ícone + Descrição + Detalhes */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{
                      backgroundColor: isIncome
                        ? 'rgba(16, 185, 129, 0.15)'
                        : isCredit
                        ? 'rgba(168, 85, 247, 0.15)'
                        : 'rgba(244, 63, 94, 0.15)',
                      color: isIncome ? '#10b981' : isCredit ? '#c084fc' : '#fb7185',
                    }}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : isCredit ? (
                      <CardIcon className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-zinc-100 truncate">
                        {t.description}
                      </h4>
                      {t.total_installments && t.total_installments > 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-medium shrink-0">
                          {t.current_installment}/{t.total_installments}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                      <span>{t.category?.name || 'Sem Categoria'}</span>
                      <span>•</span>
                      <span>{isCredit ? t.credit_card?.name : t.account?.name || 'Carteira'}</span>
                      <span>•</span>
                      <span>Vencimento: {formatDate(t.due_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Valor + Ações de Status e Deletar */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-sm sm:text-base font-bold block ${
                        isIncome ? 'text-emerald-400' : 'text-zinc-100'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatCurrency(Number(t.amount))}
                    </span>
                    <span
                      className={`text-[10px] font-medium block ${
                        t.is_paid ? 'text-emerald-500' : 'text-amber-400'
                      }`}
                    >
                      {t.is_paid ? 'Pago' : 'Pendente'}
                    </span>
                  </div>

                  {/* Botão de Toggle Pago / Pendente */}
                  <button
                    onClick={() => handleTogglePaid(t)}
                    disabled={actionLoadingId === t.id}
                    className={`p-2 rounded-xl transition ${
                      t.is_paid
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                    }`}
                    title={t.is_paid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                  >
                    {t.is_paid ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </button>

                  {/* Botão de Editar */}
                  <button
                    onClick={() => {
                      setTransactionToEdit(t);
                      setModalOpen(true);
                    }}
                    className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition"
                    title="Editar lançamento"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Botão de Excluir */}
                  <button
                    onClick={() => handleDelete(t)}
                    disabled={actionLoadingId === t.id}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-xl transition opacity-70 group-hover:opacity-100"
                    title="Excluir lançamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <TransactionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setTransactionToEdit(null);
        }}
        transaction={transactionToEdit}
        accounts={initialAccounts}
        cards={initialCards}
        categories={initialCategories}
        onSuccess={refreshData}
      />
    </div>
  );
}
