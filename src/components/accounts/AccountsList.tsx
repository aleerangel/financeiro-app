'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wallet, Landmark, PiggyBank, TrendingUp, MoreVertical, Pencil, Trash2, Sparkles } from 'lucide-react';
import { AccountWithBalance, deleteAccount } from '@/lib/actions/accounts';
import { formatCurrency } from '@/lib/utils';
import { AccountModal } from './AccountModal';
import { EditAccountBalanceModal } from './EditAccountBalanceModal';

interface AccountsListProps {
  initialAccounts: AccountWithBalance[];
}

export function AccountsList({ initialAccounts }: AccountsListProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [balanceModalMode, setBalanceModalMode] = useState<'yield' | 'adjust'>('yield');
  const [accountToEdit, setAccountToEdit] = useState<AccountWithBalance | null>(null);
  const [accountToAdjustBalance, setAccountToAdjustBalance] = useState<AccountWithBalance | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalBalance = initialAccounts.reduce((acc, curr) => acc + curr.current_balance, 0);
  const totalYieldMonth = initialAccounts.reduce((acc, curr) => acc + (curr.total_yield_current_month || 0), 0);
  const totalYieldAllTime = initialAccounts.reduce((acc, curr) => acc + (curr.total_yield_all_time || 0), 0);
  const totalEstimatedMonthlyYield = initialAccounts.reduce((acc, curr) => acc + (curr.estimated_monthly_yield || 0), 0);
  const totalEstimatedYearlyYield = initialAccounts.reduce((acc, curr) => acc + (curr.estimated_yearly_yield || 0), 0);

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

  const handleOpenBalanceModal = (acc: AccountWithBalance, mode: 'yield' | 'adjust') => {
    setAccountToAdjustBalance(acc);
    setBalanceModalMode(mode);
    setBalanceModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta? As transações vinculadas perderão a referência da conta.')) {
      try {
        setDeletingId(id);
        await deleteAccount(id);
        router.refresh();
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
      {/* Resumo Consolidado e Rendimentos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col justify-between gap-4 p-5 bg-zinc-900 border border-zinc-800/80 rounded-2xl">
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

        <div className="flex flex-col justify-between gap-3 p-5 bg-zinc-900 border border-emerald-500/20 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
              Juros / Rendimentos Ganhos
            </span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-400">
              +{formatCurrency(totalYieldMonth)}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Rendido neste mês • Histórico total:{' '}
              <span className="text-zinc-200 font-semibold">+{formatCurrency(totalYieldAllTime)}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 p-5 bg-zinc-900 border border-zinc-800/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Projeção Estimada (CDI / Juros)
            </span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-blue-400">
              +{formatCurrency(totalEstimatedMonthlyYield)}
              <span className="text-xs font-normal text-zinc-400 ml-1">/mês</span>
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Em 12 meses mantendo o saldo:{' '}
              <span className="text-emerald-400 font-semibold">+{formatCurrency(totalEstimatedYearlyYield)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialAccounts.map((account) => {
          const Icon = getAccountIcon(account.type);
          const hasYieldConfig = Boolean(
            account.yield_type && account.yield_type !== 'none' && (account.yield_rate ?? 0) > 0
          );
          const hasRecordedYield = account.total_yield_all_time > 0 || account.total_yield_current_month > 0;

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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-zinc-100 text-base">{account.name}</h3>
                      {hasYieldConfig && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                          {account.yield_label}
                        </span>
                      )}
                    </div>
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
                    <div className="absolute right-0 top-8 z-20 w-44 bg-zinc-950 border border-zinc-800 rounded-xl py-1 shadow-xl text-xs">
                      <button
                        onClick={() => handleOpenBalanceModal(account, 'yield')}
                        className="w-full px-3 py-2 text-left text-emerald-400 hover:bg-zinc-900 flex items-center gap-2 font-medium"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Lançar Rendimento
                      </button>
                      <button
                        onClick={() => handleOpenBalanceModal(account, 'adjust')}
                        className="w-full px-3 py-2 text-left text-zinc-300 hover:bg-zinc-900 flex items-center gap-2"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        Ajustar Saldo Base
                      </button>
                      <button
                        onClick={() => handleEdit(account)}
                        className="w-full px-3 py-2 text-left text-zinc-300 hover:bg-zinc-900 flex items-center gap-2"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar Conta / CDI
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

              {/* Bloco de Rendimentos & Projeção da Conta */}
              {(hasYieldConfig || hasRecordedYield) && (
                <div className="p-3 bg-zinc-950/60 border border-zinc-800/70 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Rendido no mês:</span>
                    <span className="font-semibold text-emerald-400">
                      +{formatCurrency(account.total_yield_current_month)}
                    </span>
                  </div>
                  {account.total_yield_all_time > 0 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">Acumulado histórico:</span>
                      <span className="font-medium text-zinc-300">
                        +{formatCurrency(account.total_yield_all_time)}
                      </span>
                    </div>
                  )}
                  {hasYieldConfig && account.current_balance > 0 && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/60">
                      <span className="text-zinc-500">Projeção +30 dias:</span>
                      <span className="font-medium text-blue-400">
                        +{formatCurrency(account.estimated_monthly_yield)}/mês
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-zinc-800/80 pt-3 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] text-zinc-400 block">Saldo Atual</span>
                  <button
                    type="button"
                    onClick={() => handleOpenBalanceModal(account, 'adjust')}
                    className="group/btn flex items-center gap-1.5 hover:text-emerald-400 transition"
                    title="Clique para atualizar ou ajustar o saldo"
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

                <button
                  type="button"
                  onClick={() => handleOpenBalanceModal(account, 'yield')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-xl text-xs font-semibold transition"
                  title="Registrar juros / rendimento desta conta"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  + Rendimento
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
        onClose={() => {
          setModalOpen(false);
          router.refresh();
        }}
        accountToEdit={accountToEdit}
      />

      <EditAccountBalanceModal
        isOpen={balanceModalOpen}
        onClose={() => {
          setBalanceModalOpen(false);
          setAccountToAdjustBalance(null);
        }}
        account={accountToAdjustBalance}
        defaultMode={balanceModalMode}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}

