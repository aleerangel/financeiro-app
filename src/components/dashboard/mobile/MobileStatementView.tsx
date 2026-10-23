'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowDownRight,
  ArrowUpRight,
  Search,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { Account, CreditCard, Category, Transaction } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { isBusinessTransaction } from '@/lib/business-scope-utils';
import { deleteTransaction, toggleTransactionPaid } from '@/lib/actions/transactions';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

const TransactionModal = dynamic(
  () => import('@/components/transactions/TransactionModal').then((m) => m.TransactionModal),
  { ssr: false }
);

interface MobileStatementViewProps {
  transactions: Transaction[];
  accounts?: Account[];
  cards?: CreditCard[];
  categories?: Category[];
  onRefresh?: () => void;
}

export function MobileStatementView({
  transactions,
  accounts = [],
  cards = [],
  categories = [],
  onRefresh,
}: MobileStatementViewProps) {
  const { showValues } = useMobileNavigation();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'pending'>('all');
  const [filterScope, setFilterScope] = useState<'all' | 'business' | 'personal'>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filtros
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Filtro de Escopo
      if (filterScope === 'business' && !isBusinessTransaction(tx)) return false;
      if (filterScope === 'personal' && isBusinessTransaction(tx)) return false;

      // Filtro de Tipo
      if (filterType === 'income' && tx.type !== 'income') return false;
      if (filterType === 'expense' && tx.type !== 'expense') return false;
      if (filterType === 'pending' && tx.is_paid) return false;

      // Busca por descrição ou categoria
      if (search.trim()) {
        const query = search.toLowerCase();
        const descMatch = tx.description.toLowerCase().includes(query);
        const catMatch = tx.category?.name?.toLowerCase().includes(query);
        if (!descMatch && !catMatch) return false;
      }

      return true;
    });
  }, [transactions, filterScope, filterType, search]);

  // Agrupamento por dia
  const groupedByDay = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    for (const tx of filteredTransactions) {
      const dateKey = tx.due_date || tx.transaction_date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    }
    // Ordena dias decrescente
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((dateKey) => ({
        dateKey,
        items: groups[dateKey],
      }));
  }, [filteredTransactions]);

  // Totais do extrato filtrado
  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income' && t.is_paid)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense' && t.is_paid)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const formatHidden = (val: string) => (showValues ? val : '••••••');

  // Alternar status de pagamento
  const handleTogglePaidStatus = async (tx: Transaction) => {
    try {
      setUpdatingId(tx.id);
      await toggleTransactionPaid(tx.id, !tx.is_paid);
      toast.success(
        !tx.is_paid
          ? tx.type === 'income'
            ? 'Receita confirmada como recebida!'
            : 'Despesa marcada como paga!'
          : 'Lançamento desmarcado (pendente)!'
      );
      if (selectedTx && selectedTx.id === tx.id) {
        setSelectedTx({ ...selectedTx, is_paid: !selectedTx.is_paid });
      }
      if (onRefresh) onRefresh();
    } catch {
      toast.error('Erro ao atualizar status do lançamento');
    } finally {
      setUpdatingId(null);
    }
  };

  // Excluir lançamento (com suporte a compras parceladas)
  const handleDeleteTransaction = async (tx: Transaction) => {
    let deleteEntireGroup = false;

    if (
      tx.installment_group_id &&
      tx.total_installments &&
      tx.total_installments > 1
    ) {
      const choice = await confirm({
        title: 'Excluir Compra Parcelada',
        description: `Esta despesa faz parte de uma compra parcelada em ${tx.total_installments}x. Deseja excluir todas as parcelas ou somente esta?`,
        confirmLabel: 'Excluir Todas',
        cancelLabel: 'Excluir Só Esta',
        variant: 'danger',
      });
      deleteEntireGroup = choice;
    } else {
      const ok = await confirm({
        title: 'Excluir Lançamento',
        description: `Deseja realmente excluir "${tx.description}"?`,
        confirmLabel: 'Excluir',
        variant: 'danger',
      });
      if (!ok) return;
    }

    try {
      setUpdatingId(tx.id);
      await deleteTransaction(tx.id, deleteEntireGroup);
      toast.success('Lançamento excluído com sucesso!');
      if (selectedTx?.id === tx.id) {
        setSelectedTx(null);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir lançamento');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Resumo Rápido do Mês */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-bold uppercase">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
            <span>Entradas</span>
          </div>
          <span className="text-base font-extrabold text-emerald-400 block mt-1 tracking-tight">
            {formatHidden(formatCurrency(totalIncome))}
          </span>
        </div>

        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-bold uppercase">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 stroke-[2.5]" />
            <span>Saídas</span>
          </div>
          <span className="text-base font-extrabold text-rose-400 block mt-1 tracking-tight">
            {formatHidden(formatCurrency(totalExpense))}
          </span>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, loja ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
        </div>

        {/* Filtros em Chips Deslizáveis */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition ${
              filterType === 'all'
                ? 'bg-zinc-100 text-zinc-900'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilterType('income')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition ${
              filterType === 'income'
                ? 'bg-emerald-500 text-zinc-950'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            Entradas
          </button>
          <button
            type="button"
            onClick={() => setFilterType('expense')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition ${
              filterType === 'expense'
                ? 'bg-rose-500 text-white'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            Saídas
          </button>
          <button
            type="button"
            onClick={() => setFilterType('pending')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition ${
              filterType === 'pending'
                ? 'bg-amber-500 text-zinc-950'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            Pendentes
          </button>

          <span className="text-zinc-700 mx-1">|</span>

          {/* Filtro Escopo */}
          <button
            type="button"
            onClick={() =>
              setFilterScope((prev) =>
                prev === 'all' ? 'business' : prev === 'business' ? 'personal' : 'all'
              )
            }
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 border transition ${
              filterScope === 'business'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : filterScope === 'personal'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            {filterScope === 'business'
              ? '✂️ Só Barbearia'
              : filterScope === 'personal'
              ? '👤 Só Pessoal'
              : 'Escopo: Todos'}
          </button>
        </div>
      </div>

      {/* Lista de Transações Agrupadas por Dia */}
      {groupedByDay.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 text-xs">
          Nenhuma movimentação encontrada com os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map(({ dateKey, items }) => (
            <div key={dateKey} className="space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block px-1">
                {formatDate(dateKey)}
              </span>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/80 overflow-hidden">
                {items.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isBiz = isBusinessTransaction(tx);
                  const isPending = !tx.is_paid;

                  return (
                    <div
                      key={tx.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTx(tx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedTx(tx);
                        }
                      }}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-zinc-800/40 active:bg-zinc-800 transition cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isIncome
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-zinc-100 block truncate">
                            {tx.description}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-zinc-400 truncate">
                              {tx.category?.name || 'Geral'}
                            </span>
                            {isBiz && (
                              <span className="text-[9px] px-1 py-0.2 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-bold shrink-0">
                                PJ
                              </span>
                            )}
                            {isPending && (
                              <span className="text-[9px] px-1 py-0.2 bg-amber-500/15 text-amber-400 rounded font-bold shrink-0">
                                Pendente
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span
                            className={`text-xs font-extrabold block ${
                              isIncome ? 'text-emerald-400' : 'text-zinc-200'
                            }`}
                          >
                            {isIncome ? '+' : '-'} {formatHidden(formatCurrency(tx.amount))}
                          </span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5 max-w-[100px] truncate">
                            {tx.credit_card?.name || tx.account?.name || 'Sem conta'}
                          </span>
                        </div>

                        {/* Botão de Edição Rápida */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTx(tx);
                          }}
                          className="p-2 text-zinc-400 hover:text-zinc-100 active:text-zinc-100 hover:bg-zinc-800 active:scale-95 rounded-xl border border-transparent hover:border-zinc-700/60 transition"
                          title="Editar Lançamento"
                          aria-label={`Editar ${tx.description}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gaveta de Detalhe da Transação ao Clicar */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setSelectedTx(null)}
          />
          <div className="relative w-full sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-sm font-bold text-zinc-100">
                Detalhes do Lançamento
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-center">
              <span className="text-[11px] text-zinc-400 block uppercase font-bold">
                {selectedTx.type === 'income' ? 'Valor Recebido' : 'Valor Pago'}
              </span>
              <span
                className={`text-2xl font-extrabold block mt-1 ${
                  selectedTx.type === 'income' ? 'text-emerald-400' : 'text-zinc-100'
                }`}
              >
                {formatCurrency(selectedTx.amount)}
              </span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-zinc-800/80">
              <div className="pt-2 flex justify-between">
                <span className="text-zinc-400">Descrição:</span>
                <span className="font-semibold text-zinc-200">{selectedTx.description}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-zinc-400">Categoria:</span>
                <span className="font-semibold text-zinc-200">{selectedTx.category?.name || 'Sem categoria'}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-zinc-400">Conta / Cartão:</span>
                <span className="font-semibold text-zinc-200">
                  {selectedTx.credit_card?.name || selectedTx.account?.name || 'Nenhum'}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-zinc-400">Data:</span>
                <span className="font-semibold text-zinc-200">{formatDate(selectedTx.due_date || selectedTx.transaction_date)}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-zinc-400">Status:</span>
                <span
                  className={`font-bold ${
                    selectedTx.is_paid ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {selectedTx.is_paid ? 'Efetivado / Pago' : 'Pendente de Pagamento'}
                </span>
              </div>
            </div>

            {/* Ações da Gaveta: Editar, Excluir e Alternar Status */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = selectedTx;
                    setSelectedTx(null);
                    setEditingTx(toEdit);
                  }}
                  className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-100 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 border border-zinc-700 active:scale-95"
                >
                  <Pencil className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  disabled={updatingId === selectedTx.id}
                  onClick={() => handleDeleteTransaction(selectedTx)}
                  className="py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {updatingId === selectedTx.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>Excluir</span>
                </button>
              </div>

              {/* Botão de Alternar Status de Pagamento */}
              <button
                type="button"
                disabled={updatingId === selectedTx.id}
                onClick={() => handleTogglePaidStatus(selectedTx)}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${
                  !selectedTx.is_paid
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                }`}
              >
                {updatingId === selectedTx.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : !selectedTx.is_paid ? (
                  <CheckCircle2 className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span>
                  {updatingId === selectedTx.id
                    ? 'Atualizando...'
                    : !selectedTx.is_paid
                    ? selectedTx.type === 'income'
                      ? 'Confirmar Recebimento Agora'
                      : 'Marcar como Pago Agora'
                    : 'Desmarcar (Voltar para Pendente)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Transação */}
      {editingTx && (
        <TransactionModal
          isOpen={Boolean(editingTx)}
          onClose={() => setEditingTx(null)}
          transaction={editingTx}
          accounts={accounts}
          cards={cards}
          categories={categories}
          onSuccess={() => {
            setEditingTx(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
