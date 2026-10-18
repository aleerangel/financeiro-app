'use client';

import { useState } from 'react';
import { Plus, Wallet, Landmark, PiggyBank, TrendingUp, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { AccountWithBalance, deleteAccount } from '@/lib/actions/accounts';
import { formatCurrency } from '@/lib/utils';
import { AccountModal } from './AccountModal';
import { EditAccountBalanceModal } from './EditAccountBalanceModal';

interface AccountsListProps {
  initialAccounts: AccountWithBalance[];
}

export function AccountsList({ initialAccounts }: AccountsListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<AccountWithBalance | null>(null);
  const [accountToAdjustBalance, setAccountToAdjustBalance] = useState<AccountWithBalance | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalBalance = initialAccounts.reduce((acc, curr) => acc + curr.current_balance, 0);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'wallet':
        return Wallet;
      case 'savings':
        return PiggyBank;
      case 'investment':
        return TrendingUp;
      default:
        return Landmark;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'wallet':
        return 'Carteira / Dinheiro';
      case 'savings':
        return 'Poupança';
      case 'investment':
        return 'Investimento';
      default:
        return 'Conta Corrente';
    }
  };

  const handleEdit = (acc: AccountWithBalance) => {
    setAccountToEdit(acc);
    setModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta? As transações vinculadas perderão a referência da conta.')) {
      try {
        setDeletingId(id);
        await deleteAccount(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao excluir conta');
      } finally {
        setDeletingId(null);
        setActiveMenuId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo Consolidado e Botão de Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-zinc-900 border border-zinc-800/80 rounded-2xl">
        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
            Saldo Total em Contas
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 mt-1">
            {formatCurrency(totalBalance)}
          </h2>
        </div>

        <button
          onClick={() => {
            setAccountToEdit(null);
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Nova Conta
        </button>
      </div>

      {/* Grid de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialAccounts.map((account) => {
          const Icon = getAccountIcon(account.type);

          return (
            <div
              key={account.id}
              className="relative p-5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition flex flex-col justify-between space-y-4 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-100 shadow-md"
                    style={{ backgroundColor: account.color || '#3b82f6' }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-100 text-base">{account.name}</h3>
                    <p className="text-xs text-zinc-400">{getAccountTypeLabel(account.type)}</p>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === account.id ? null : account.id)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {activeMenuId === account.id && (
                    <div className="absolute right-0 top-8 z-20 w-36 bg-zinc-950 border border-zinc-800 rounded-xl py-1 shadow-xl text-xs">
                      <button
                        onClick={() => {
                          setAccountToAdjustBalance(account);
                          setBalanceModalOpen(true);
                          setActiveMenuId(null);
                        }}
                        className="w-full px-3 py-2 text-left text-emerald-400 hover:bg-zinc-900 flex items-center gap-2 font-medium"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        Ajustar Saldo
                      </button>
                      <button
                        onClick={() => handleEdit(account)}
                        className="w-full px-3 py-2 text-left text-zinc-300 hover:bg-zinc-900 flex items-center gap-2"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar Conta
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        disabled={deletingId === account.id}
                        className="w-full px-3 py-2 text-left text-red-400 hover:bg-zinc-900 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingId === account.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-800/80 pt-3 flex items-baseline justify-between">
                <span className="text-xs text-zinc-400">Saldo Atual</span>
                <button
                  type="button"
                  onClick={() => {
                    setAccountToAdjustBalance(account);
                    setBalanceModalOpen(true);
                  }}
                  className="group/btn flex items-center gap-1.5 hover:text-emerald-400 transition"
                  title="Clique para ajustar o saldo"
                >
                  <span
                    className={`text-lg font-bold ${
                      account.current_balance >= 0 ? 'text-zinc-100 group-hover/btn:text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatCurrency(account.current_balance)}
                  </span>
                  <Pencil className="w-3.5 h-3.5 text-zinc-500 group-hover/btn:text-emerald-400 opacity-60 group-hover/btn:opacity-100 transition" />
                </button>
              </div>
            </div>
          );
        })}

        {initialAccounts.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl">
            <Landmark className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Nenhuma conta encontrada.</p>
            <p className="text-xs text-zinc-600 mt-1">Clique em &quot;Nova Conta&quot; para cadastrar sua primeira carteira ou banco.</p>
          </div>
        )}
      </div>

      <AccountModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        accountToEdit={accountToEdit}
      />

      <EditAccountBalanceModal
        isOpen={balanceModalOpen}
        onClose={() => {
          setBalanceModalOpen(false);
          setAccountToAdjustBalance(null);
        }}
        account={accountToAdjustBalance}
      />
    </div>
  );
}
