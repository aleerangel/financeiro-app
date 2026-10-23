'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { seedClientCache, getCachedSimpleClients, getCachedProducts } from '@/lib/client-cache';
import { MobileHeader } from './mobile/MobileHeader';
import { BusinessDashboardMobile } from './mobile/BusinessDashboardMobile';
import { GeneralDashboardMobile } from './mobile/GeneralDashboardMobile';

// Abas secundárias do mobile carregadas sob demanda (evita sobrecarga de JS inicial)
const MobileStatementView = dynamic(
  () => import('./mobile/MobileStatementView').then((m) => m.MobileStatementView),
  {
    ssr: false,
    loading: () => (
      <div className="py-16 text-center text-zinc-500 text-xs animate-pulse">Carregando extrato...</div>
    ),
  }
);

const MobileSummaryView = dynamic(
  () => import('./mobile/MobileSummaryView').then((m) => m.MobileSummaryView),
  {
    ssr: false,
    loading: () => (
      <div className="py-16 text-center text-zinc-500 text-xs animate-pulse">Carregando resumo e gráficos...</div>
    ),
  }
);

const MobileMoreView = dynamic(
  () => import('./mobile/MobileMoreView').then((m) => m.MobileMoreView),
  {
    ssr: false,
    loading: () => (
      <div className="py-16 text-center text-zinc-500 text-xs animate-pulse">Carregando opções...</div>
    ),
  }
);

// Telas exclusivas do Desktop carregadas dinamicamente apenas em computadores
const BusinessDashboardView = dynamic(
  () => import('./BusinessDashboardView').then((m) => m.BusinessDashboardView),
  { ssr: false }
);

const GeneralDashboardView = dynamic(
  () => import('./GeneralDashboardView').then((m) => m.GeneralDashboardView),
  { ssr: false }
);

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

interface DashboardMonthCache {
  transactions: Transaction[];
  businessData: BusinessDashboardData;
  generalData: GeneralDashboardData;
  accounts: AccountWithBalance[];
  upcomingBills: Transaction[];
  pendingReceipts: Transaction[];
  timestamp: number;
}

interface DashboardViewProps {
  initialAccounts: AccountWithBalance[];
  initialCards: CreditCardWithUsage[];
  categories: Category[];
  initialBusinessData: BusinessDashboardData;
  initialGeneralData: GeneralDashboardData;
  initialUpcomingBills?: Transaction[];
  initialPendingReceipts?: Transaction[];
  initialTransactions?: Transaction[];
  initialIsMobile?: boolean;
}

export function DashboardView({
  initialAccounts,
  initialCards,
  categories,
  initialBusinessData,
  initialGeneralData,
  initialUpcomingBills = [],
  initialPendingReceipts = [],
  initialTransactions = [],
  initialIsMobile = false,
}: DashboardViewProps) {
  const { month, year, formattedMonth } = useDateContext();
  const isMobile = useIsMobile(768, initialIsMobile);
  const { activeTab, contextMode } = useMobileNavigation();

  const [viewMode, setViewMode] = useState<'business' | 'general'>('business');
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>(initialAccounts);
  const [businessData, setBusinessData] = useState<BusinessDashboardData>(initialBusinessData);
  const [generalData, setGeneralData] = useState<GeneralDashboardData>(initialGeneralData);
  const [upcomingBills, setUpcomingBills] = useState<Transaction[]>(initialUpcomingBills);
  const [pendingReceipts, setPendingReceipts] = useState<Transaction[]>(initialPendingReceipts);
  const monthKey = `${year}-${month}`;

  // Cache em memória por mês: evita 100% dos refetches duplicados ao alternar períodos
  const cacheRef = useRef<Map<string, DashboardMonthCache>>(new Map());
  const initialLoadedKeyRef = useRef(monthKey);

  // Mês cujos dados já foram carregados; enquanto diferir do selecionado, está carregando
  const [loadedKey, setLoadedKey] = useState(monthKey);
  const [refreshing, setRefreshing] = useState(false);
  const loading = refreshing || loadedKey !== monthKey;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultScope, setModalDefaultScope] = useState<FinancialScope>('personal');
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [accountToAdjustBalance, setAccountToAdjustBalance] = useState<AccountWithBalance | null>(null);

  // Inicializa o cache com os dados do mês inicial trazidos pelo servidor
  useEffect(() => {
    cacheRef.current.set(monthKey, {
      transactions: initialTransactions,
      businessData: initialBusinessData,
      generalData: initialGeneralData,
      accounts: initialAccounts,
      upcomingBills: initialUpcomingBills,
      pendingReceipts: initialPendingReceipts,
      timestamp: Date.now(),
    });
    seedClientCache({ accounts: initialAccounts, cards: initialCards, categories });
    // Pré-carrega clientes e produtos em segundo plano para abertura instantânea (0ms) do Novo Atendimento
    setTimeout(() => {
      getCachedSimpleClients().catch(() => {});
      getCachedProducts().catch(() => {});
    }, 120);
    // Executa apenas uma vez na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      const entry: DashboardMonthCache = {
        transactions: txs,
        businessData: bData,
        generalData: gData,
        accounts: accs,
        upcomingBills: bills,
        pendingReceipts: receipts,
        timestamp: Date.now(),
      };
      cacheRef.current.set(monthKey, entry);
      seedClientCache({ accounts: accs });

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
  }, [month, year, monthKey]);

  useEffect(() => {
    // 1. Otimização: Se for o mês inicial já carregado pelo SSR, não refaz queries
    if (monthKey === initialLoadedKeyRef.current && initialTransactions.length > 0) {
      setLoadedKey(monthKey);
      return;
    }

    // 2. Otimização: Se o mês já existe em cache, restaura instantaneamente (0ms)
    const cached = cacheRef.current.get(monthKey);
    if (cached) {
      setTransactions(cached.transactions);
      setBusinessData(cached.businessData);
      setGeneralData(cached.generalData);
      setAccounts(cached.accounts);
      setUpcomingBills(cached.upcomingBills);
      setPendingReceipts(cached.pendingReceipts);
      setLoadedKey(monthKey);

      // Se foi consultado há menos de 2 minutos, não precisa de revalidação imediata
      if (Date.now() - cached.timestamp < 120 * 1000) {
        return;
      }
    }

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
        if (!active) return;
        const entry: DashboardMonthCache = {
          transactions: txs,
          businessData: bData,
          generalData: gData,
          accounts: accs,
          upcomingBills: bills,
          pendingReceipts: receipts,
          timestamp: Date.now(),
        };
        cacheRef.current.set(monthKey, entry);

        setTransactions(txs);
        setBusinessData(bData);
        setGeneralData(gData);
        setAccounts(accs);
        setUpcomingBills(bills);
        setPendingReceipts(receipts);
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
  }, [month, year, monthKey, initialTransactions.length]);

  // Pré-busca em background do mês anterior quando a CPU estiver ociosa
  useEffect(() => {
    const prevM = month === 0 ? 11 : month - 1;
    const prevY = month === 0 ? year - 1 : year;
    const prevKey = `${prevY}-${prevM}`;

    if (cacheRef.current.has(prevKey)) return;

    const timer = setTimeout(() => {
      Promise.all([
        getTransactions(prevM, prevY),
        getBusinessDashboardData(prevY, prevM),
        getGeneralDashboardData(prevY, prevM),
      ])
        .then(([txs, bData, gData]) => {
          if (!cacheRef.current.has(prevKey)) {
            cacheRef.current.set(prevKey, {
              transactions: txs,
              businessData: bData,
              generalData: gData,
              accounts,
              upcomingBills: [],
              pendingReceipts: [],
              timestamp: Date.now(),
            });
          }
        })
        .catch(() => {});
    }, 1200);

    return () => clearTimeout(timer);
  }, [month, year, accounts]);

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

  // Experiência Mobile Totalmente Desacoplada e Orientada a Abas
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Cabeçalho Fixo Touch: Barbearia vs Pessoal, Mês/Ano e Olho de Privacidade */}
        <MobileHeader />

        {/* Conteúdo da Aba Selecionada */}
        {activeTab === 'home' && (
          contextMode === 'business' ? (
            <BusinessDashboardMobile
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
            <GeneralDashboardMobile
              transactions={transactions}
              accounts={accounts}
              cards={initialCards}
              formattedMonth={formattedMonth}
              loading={loading}
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
              onEditBalance={(acc) => {
                setAccountToAdjustBalance(acc);
                setBalanceModalOpen(true);
              }}
            />
          )
        )}

        {activeTab === 'statement' && (
          <MobileStatementView
            transactions={transactions}
            accounts={accounts}
            cards={initialCards}
            categories={categories}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'summary' && (
          <MobileSummaryView
            businessData={businessData}
            generalData={generalData}
            yearlyStats={generalData.yearlyStats}
            formattedMonth={formattedMonth}
            month={month}
            year={year}
            transactions={transactions}
            accounts={accounts}
          />
        )}

        {activeTab === 'more' && (
          <MobileMoreView
            accounts={accounts}
            cards={initialCards}
            clientsReturnCount={businessData.inactiveClientsAlerts?.length || 0}
          />
        )}

        {/* Modal de Nova Despesa Rápida Mobile */}
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
          defaultMode="adjust"
          onSuccess={refreshData}
        />
      </div>
    );
  }

  // Desktop View
  return (
    <div className="space-y-6">
      {/* Header com Toggle Barbearia vs Geral */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            Dashboard Financeiro
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {viewMode === 'business'
              ? 'Métricas de atendimento, estoque e desempenho da barbearia'
              : 'Visão consolidada de todas as contas, cartões e patrimônio'}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Alternador Principal: Barbearia vs Geral */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl shadow-sm">
            <button
              onClick={() => setViewMode('business')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'business'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Barbearia
            </button>
            <button
              onClick={() => setViewMode('general')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'general'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Visão Geral
            </button>
          </div>

          {/* Exportação */}
          <ExportDropdown onExport={handleExport} />

          {/* Botões de Ação Rápida */}
          {viewMode === 'business' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setModalDefaultScope('business');
                  setModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                Despesa Barbearia
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
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm"
              >
                <Scissors className="w-4 h-4 text-emerald-400" />
                Balcão Barbearia
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
        defaultMode="adjust"
        onSuccess={refreshData}
      />
    </div>
  );
}
