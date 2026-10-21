'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Plus,
  Scissors,
  Layers,
} from 'lucide-react';
import { AccountWithBalance, getAccounts } from '@/lib/actions/accounts';
import { CreditCardWithUsage } from '@/lib/actions/credit-cards';
import { Category, Transaction, FinancialScope } from '@/types/database';
import { useDateContext } from '@/context/DateContext';
import { getTransactions, getUpcomingAndOverdueBills, getPendingIncomeReceipts } from '@/lib/actions/transactions';
import {
  BusinessDashboardData,
  GeneralDashboardData,
  getBusinessDashboardData,
  getGeneralDashboardData,
} from '@/lib/actions/dashboard';
import { ExportDropdown } from '@/components/ui/ExportDropdown';
import { exportTransactionsReport, ExportFormat } from '@/lib/export-utils';
import { isBusinessTransaction } from '@/lib/business-scope-utils';
import { calculatePendingProjectedYield } from '@/lib/account-yield-utils';
import { getZonedParts } from '@/lib/date-utils';
import { BusinessDashboardView } from './BusinessDashboardView';
import { GeneralDashboardView } from './GeneralDashboardView';

const TransactionModal = dynamic(
  () =>
    import('@/components/transactions/TransactionModal').then(
      (m) => m.TransactionModal
    ),
  { ssr: false }
);

const EditAccountBalanceModal = dynamic(
  () =>
    import('@/components/accounts/EditAccountBalanceModal').then(
      (m) => m.EditAccountBalanceModal
    ),
  { ssr: false }
);

interface DashboardViewProps {
  initialAccounts: AccountWithBalance[];
  initialCards: CreditCardWithUsage[];
  categories: Category[];
  initialBusinessData: BusinessDashboardData;
  initialGeneralData: GeneralDashboardData;
  initialUpcomingBills?: Transaction[];
  initialPendingReceipts?: Transaction[];
}

export function DashboardView({
  initialAccounts,
  initialCards,
  categories,
  initialBusinessData,
  initialGeneralData,
  initialUpcomingBills = [],
  initialPendingReceipts = [],
}: DashboardViewProps) {
  const { month, year, formattedMonth } = useDateContext();

  const [viewMode, setViewMode] = useState<'business' | 'general'>('business');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>(initialAccounts);
  const [businessData, setBusinessData] = useState<BusinessDashboardData>(initialBusinessData);
  const [generalData, setGeneralData] = useState<GeneralDashboardData>(initialGeneralData);
  const [upcomingBills, setUpcomingBills] = useState<Transaction[]>(initialUpcomingBills);
  const [pendingReceipts, setPendingReceipts] = useState<Transaction[]>(initialPendingReceipts);
  const monthKey = `${year}-${month}`;
  // Mês cujos dados já foram carregados; enquanto diferir do selecionado, está carregando
  const [loadedKey, setLoadedKey] = useState(monthKey);
  const [refreshing, setRefreshing] = useState(false);
  const loading = refreshing || loadedKey !== monthKey;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultScope, setModalDefaultScope] = useState<FinancialScope>('personal');
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [accountToAdjustBalance, setAccountToAdjustBalance] = useState<AccountWithBalance | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [txs, bData, gData, accs, bills, receipts] = await Promise.all([
        getTransactions(month, year),
        getBusinessDashboardData(year, month),
        getGeneralDashboardData(year, month),
        getAccounts(),
        getUpcomingAndOverdueBills(3),
        getPendingIncomeReceipts(),
      ]);
      setTransactions(txs);
      setBusinessData(bData);
      setGeneralData(gData);
      setAccounts(accs);
      setUpcomingBills(bills);
      setPendingReceipts(receipts);
    } catch (err) {
      console.error('Erro ao atualizar dados do dashboard:', err);
    } finally {
      setRefreshing(false);
    }
  }, [month, year]);

  useEffect(() => {
    let active = true;

    Promise.all([
      getTransactions(month, year),
      getBusinessDashboardData(year, month),
      getGeneralDashboardData(year, month),
      getAccounts(),
      getUpcomingAndOverdueBills(3),
      getPendingIncomeReceipts(),
    ])
      .then(([txs, bData, gData, accs, bills, receipts]) => {
        if (active) {
          setTransactions(txs);
          setBusinessData(bData);
          setGeneralData(gData);
          setAccounts(accs);
          setUpcomingBills(bills);
          setPendingReceipts(receipts);
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar dados do dashboard:', err);
      })
      .finally(() => {
        if (active) {
          setLoadedKey(monthKey);
        }
      });

    return () => {
      active = false;
    };
  }, [month, year, monthKey]);

  const handleExport = (format: ExportFormat) => {
    if (viewMode === 'business') {
      const bizTxs = transactions.filter((t) => isBusinessTransaction(t));
      exportTransactionsReport({
        format,
        periodLabel: `${formattedMonth} • Barbearia`,
        transactions: bizTxs,
        filterLabel: 'Movimentações da Barbearia',
      });
    } else {
      const { month: curM, year: curY } = getZonedParts();
      const pendingYield = calculatePendingProjectedYield(accounts, month, year, curM, curY);
      exportTransactionsReport({
        format,
        periodLabel: formattedMonth,
        transactions,
        filterLabel: 'Visão Geral Consolidada',
        projectedYield: pendingYield,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Topo: Título, Alternador (Negócio / Geral) e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {viewMode === 'business' ? 'Dashboard Barbearia' : 'Visão Geral Consolidada'}
            </h1>
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                viewMode === 'business'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}
            >
              {viewMode === 'business' ? 'Negócio' : 'Geral'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {viewMode === 'business'
              ? `Vendas, atendimentos e receitas dos serviços em ${year}`
              : `Entradas, saídas e balanço financeiro completo em ${formattedMonth}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Alternador de Modo: Negócio vs Geral */}
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-inner">
            <button
              onClick={() => setViewMode('business')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'business'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Negócio</span>
            </button>
            <button
              onClick={() => setViewMode('general')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'general'
                  ? 'bg-blue-500 text-zinc-950 shadow-md shadow-blue-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Geral</span>
            </button>
          </div>

          {/* Botão de Exportação */}
          <ExportDropdown
            onExport={handleExport}
            buttonLabel="Exportar"
            title={
              viewMode === 'business'
                ? 'Exportar Fechamento Barbearia'
                : 'Exportar Extrato Consolidado'
            }
          />

          {/* Botões de Ação Rápida */}
          {viewMode === 'business' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setModalDefaultScope('business');
                  setModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs sm:text-sm rounded-xl transition"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Gasto Barbearia
              </button>
              <Link
                href="/vendas"
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/10"
              >
                <Scissors className="w-4 h-4 stroke-[2.5]" />
                Novo Atendimento
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/vendas"
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs sm:text-sm rounded-xl transition border border-zinc-700/60"
              >
                <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                Atendimento
              </Link>
              <button
                onClick={() => {
                  setModalDefaultScope('personal');
                  setModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/10"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Nova Transação
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Renderização Condicional baseada no modo escolhido */}
      {viewMode === 'business' ? (
        <BusinessDashboardView
          data={businessData}
          accounts={accounts}
          formattedMonth={formattedMonth}
          loading={loading}
          onEditBalance={(acc) => {
            setAccountToAdjustBalance(acc);
            setBalanceModalOpen(true);
          }}
          onAddBusinessExpense={() => {
            setModalDefaultScope('business');
            setModalOpen(true);
          }}
        />
      ) : (
        <GeneralDashboardView
          generalData={generalData}
          yearlyStats={generalData.yearlyStats}
          upcomingBills={upcomingBills}
          onBillPaid={(id) => {
            setUpcomingBills((prev) => prev.filter((b) => b.id !== id));
            refreshData();
          }}
          pendingReceipts={pendingReceipts}
          onReceiptConfirmed={(id) => {
            setPendingReceipts((prev) => prev.filter((r) => r.id !== id));
            refreshData();
          }}
          transactions={transactions}
          accounts={accounts}
          cards={initialCards}
          formattedMonth={formattedMonth}
          loading={loading}
          onEditBalance={(acc) => {
            setAccountToAdjustBalance(acc);
            setBalanceModalOpen(true);
          }}
        />
      )}

      {/* Modal de Nova Transação Financeira */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        accounts={accounts}
        cards={initialCards}
        categories={categories}
        defaultScope={modalDefaultScope}
        onSuccess={refreshData}
      />

      {/* Modal de Ajuste Rápido de Saldo da Conta */}
      <EditAccountBalanceModal
        isOpen={balanceModalOpen}
        onClose={() => {
          setBalanceModalOpen(false);
          setAccountToAdjustBalance(null);
        }}
        account={accountToAdjustBalance}
        onSuccess={refreshData}
      />
    </div>
  );
}
