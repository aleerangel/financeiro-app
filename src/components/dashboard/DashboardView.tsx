'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Eye,
  EyeOff,
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
import { getZonedParts, isPastMonth } from '@/lib/date-utils';
import { MonthlyWrappedBanner } from '@/components/wrapped/MonthlyWrappedBanner';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMobileNavigation, OptimisticMutation } from '@/context/MobileNavigationContext';
import { seedClientCache, getCachedSimpleClients, getCachedProducts } from '@/lib/client-cache';
import { MobileHeader } from './mobile/MobileHeader';
import { BusinessDashboardMobile } from './mobile/BusinessDashboardMobile';
import { GeneralDashboardMobile } from './mobile/GeneralDashboardMobile';
import { LegacyWelcomeBanner } from './LegacyWelcomeBanner';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { SegmentIcon } from '@/components/ui/SegmentIcon';
import { UnifiedDailyPendingHub } from './UnifiedDailyPendingHub';
import { QuickActionDropdown } from '@/components/layout/QuickActionDropdown';
import { NotificationBell } from '@/components/notifications/NotificationBell';

// Abas secundárias do mobile carregadas sob demanda (evita sobrecarga de JS inicial)
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

const MonthlyWrappedModal = dynamic(
  () =>
    import('@/components/wrapped/MonthlyWrappedModal').then(
      (m) => m.MonthlyWrappedModal
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
  userEmail?: string;
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

function getUserGreeting(email?: string): { greeting: string; userName: string } {
  const currentHour = new Date().getHours();
  let greeting = 'Olá';
  if (currentHour >= 5 && currentHour < 12) {
    greeting = 'Bom dia';
  } else if (currentHour >= 12 && currentHour < 18) {
    greeting = 'Boa tarde';
  } else {
    greeting = 'Boa noite';
  }

  let userName = 'Usuário';
  if (email) {
    const prefix = email.split('@')[0];
    const cleaned = prefix.split(/[._-]/)[0];
    userName = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return { greeting, userName };
}

export function DashboardView({
  userEmail,
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
  const { month, year, formattedMonth, prevMonth, nextMonth } = useDateContext();
  const [wrappedOpen, setWrappedOpen] = useState(false);
  const { isMobile } = { isMobile: useIsMobile(768, initialIsMobile) };
  const { activeTab, contextMode, showValues, setShowValues } = useMobileNavigation();
  const router = useRouter();

  useEffect(() => {
    if (activeTab === 'statement') {
      router.replace('/transacoes');
    }
  }, [activeTab, router]);
  const { profile, businessName, hasBusiness } = useBusinessProfile();

  const [viewMode, setViewMode] = useState<'business' | 'general'>(hasBusiness ? 'business' : 'general');

  // Deriva o modo efetivo: se o usuário não tem negócio ativo, é sempre 'general' (pessoal)
  const effectiveViewMode: 'business' | 'general' = hasBusiness ? viewMode : 'general';
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
        getUpcomingAndOverdueBills(0),
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

  // Escuta mutações imediatas disparadas pelos modais móveis ou pelo botão central (+)
  useEffect(() => {
    const handleMutationEvent = (event: Event) => {
      const customEvt = event as CustomEvent<OptimisticMutation>;
      const mutation = customEvt.detail;
      if (!mutation) return;

      // 1. Invalida cache do mês para que refetches e trocas de mês busquem os dados reais
      cacheRef.current.delete(monthKey);

      // 2. Atualização Otimista Instantânea (0ms) de Nova Transação
      if (mutation.type === 'transaction' && mutation.transaction) {
        const tx = mutation.transaction;

        // Cria transação otimista para inserção na lista
        const optimisticTx: Transaction = {
          id: `temp-${Date.now()}`,
          user_id: '',
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          scope: tx.scope,
          payment_method: tx.payment_method,
          transaction_date: tx.transaction_date,
          due_date: tx.due_date,
          category_id: tx.category_id || null,
          category: categories.find((c) => c.id === tx.category_id),
          account_id: tx.account_id || null,
          account: accounts.find((a) => a.id === tx.account_id),
          credit_card_id: tx.credit_card_id || null,
          credit_card: initialCards.find((c) => c.id === tx.credit_card_id),
          installment_group_id: null,
          recurrence_id: null,
          current_installment: 1,
          total_installments: tx.total_installments || 1,
          is_paid: tx.is_paid,
          paid_at: tx.is_paid ? new Date().toISOString() : null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setTransactions((prev) => [optimisticTx, ...prev]);

        // Se movimentou conta e foi pago, atualiza saldo imediatamente
        if (tx.account_id && tx.is_paid) {
          setAccounts((prev) =>
            prev.map((acc) => {
              if (acc.id !== tx.account_id) return acc;
              const delta = tx.type === 'income' ? tx.amount : -tx.amount;
              return {
                ...acc,
                current_balance: Number(acc.current_balance || 0) + delta,
              };
            })
          );
        }

        // Se for despesa ou receita da barbearia (business), atualiza o resumo da barbearia imediatamente
        if (tx.scope === 'business') {
          setBusinessData((prev) => {
            const isExpense = tx.type === 'expense';
            const isIncome = tx.type === 'income';
            const prevSum = prev.monthSummary;

            if (isIncome) {
              return {
                ...prev,
                monthSummary: {
                  ...prevSum,
                  revenue: prevSum.revenue + tx.amount,
                  netProfit: prevSum.netProfit + tx.amount,
                  projectedProfit: prevSum.projectedProfit + tx.amount,
                },
              };
            } else if (isExpense) {
              return {
                ...prev,
                monthSummary: {
                  ...prevSum,
                  totalExpenses: prevSum.totalExpenses + tx.amount,
                  paidExpenses: tx.is_paid
                    ? prevSum.paidExpenses + tx.amount
                    : prevSum.paidExpenses,
                  pendingExpenses: !tx.is_paid
                    ? prevSum.pendingExpenses + tx.amount
                    : prevSum.pendingExpenses,
                  netProfit: tx.is_paid
                    ? prevSum.netProfit - tx.amount
                    : prevSum.netProfit,
                  projectedProfit: prevSum.projectedProfit - tx.amount,
                },
              };
            }
            return prev;
          });
        }
      }

      // 3. Atualização Otimista Instantânea (0ms) de Novo Atendimento / Venda Barbearia
      if (mutation.type === 'sale' && mutation.sale) {
        const sale = mutation.sale;

        setBusinessData((prev) => {
          const prevSum = prev.monthSummary;
          const newRevenue = prevSum.revenue + sale.totalAmount;
          const newSalesCount = prevSum.salesCount + 1;
          return {
            ...prev,
            monthSummary: {
              ...prevSum,
              revenue: newRevenue,
              netProfit: prevSum.netProfit + sale.totalAmount,
              projectedProfit: prevSum.projectedProfit + sale.totalAmount,
              salesCount: newSalesCount,
              averageTicket: newRevenue / Math.max(1, newSalesCount),
            },
          };
        });

        if (sale.accountId && !sale.isCredit) {
          setAccounts((prev) =>
            prev.map((acc) => {
              if (acc.id !== sale.accountId) return acc;
              return {
                ...acc,
                current_balance: Number(acc.current_balance || 0) + sale.totalAmount,
              };
            })
          );
        }
      }

      // 4. Dispara sincronização em segundo plano (background) para consolidar
      refreshData();
    };

    window.addEventListener('financeiro:mutation', handleMutationEvent);
    return () => {
      window.removeEventListener('financeiro:mutation', handleMutationEvent);
    };
  }, [monthKey, categories, accounts, initialCards, refreshData]);

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
      getUpcomingAndOverdueBills(0),
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
    if (effectiveViewMode === 'business') {
      const bizTxs = transactions.filter((t) => isBusinessTransaction(t));
      exportTransactionsReport({
        format,
        periodLabel: `${formattedMonth} • ${businessName}`,
        transactions: bizTxs,
        filterLabel: `Movimentações de ${businessName}`,
        businessName,
        cnpj: profile.cnpj,
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
        businessName: profile.has_business ? businessName : undefined,
        cnpj: profile.has_business ? profile.cnpj : undefined,
      });
    }
  };

  // Experiência Mobile Totalmente Desacoplada e Orientada a Abas
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Cabeçalho Fixo Touch: Barbearia vs Pessoal, Mês/Ano e Olho de Privacidade */}
        <MobileHeader />

        {/* Banner de Boas-Vindas para usuários legados no mobile */}
        {activeTab === 'home' && <LegacyWelcomeBanner />}

        {/* Hub Unificado de Confirmações & Pendências do Dia (Topo Absoluto Mobile) */}
        {activeTab === 'home' && (
          <UnifiedDailyPendingHub
            pendingReceipts={pendingReceipts}
            upcomingBills={upcomingBills}
            cards={initialCards}
            onReceiptConfirmed={(id) => {
              setPendingReceipts((prev) => prev.filter((r) => r.id !== id));
              refreshData();
            }}
            onBillPaid={(id) => {
              setUpcomingBills((prev) => prev.filter((b) => b.id !== id));
              refreshData();
            }}
            scopeFilter={hasBusiness && contextMode === 'business' ? 'business' : 'all'}
          />
        )}

        {/* Conteúdo da Aba Selecionada */}
        {activeTab === 'home' && (
          (hasBusiness && contextMode === 'business') ? (
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
          <div className="py-16 text-center text-zinc-500 text-xs animate-pulse">
            Carregando extrato...
          </div>
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

        {/* Modal de Retrospectiva Mensal Estilo Spotify Wrapped */}
        <MonthlyWrappedModal
          isOpen={wrappedOpen}
          onClose={() => setWrappedOpen(false)}
          month={month}
          year={year}
        />
      </div>
    );
  }

  // Desktop View
  const { greeting, userName } = getUserGreeting(userEmail);

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas para usuários legados no desktop */}
      <LegacyWelcomeBanner />

      {/* 1. Cabeçalho do Dashboard: ocupando toda a largura da área principal com proporção da referência visual */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-2 border-b border-[#1E293B]">
        {/* Lado Esquerdo: Saudação com destaque visual ~34px e subtítulo ~16px */}
        <div>
          <h1 className="text-[28px] sm:text-[32px] lg:text-[34px] font-bold text-[#F8FAFC] tracking-tight leading-tight flex items-baseline gap-2 flex-wrap">
            <span>{greeting},</span>
            <span className="text-[#FACC15]">{userName}</span>
          </h1>
          <p className="text-[15px] lg:text-[16px] text-[#94A3B8] mt-1 font-normal">
            {effectiveViewMode === 'business'
              ? `Acompanhe as métricas e o desempenho de ${businessName}`
              : 'Aqui está o resumo financeiro consolidado do seu patrimônio'}
          </p>
        </div>

        {/* Lado Direito: Seletor de período, Notificações, Privacidade, Modo e Botão de Ação Principal */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap xl:justify-end">
          {/* Navegação de Mês/Ano Desktop */}
          <div className="flex items-center bg-[#0D121F] border border-[#1E293B] px-2 py-1 rounded-xl shadow-sm h-[46px]">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#151D30] transition cursor-pointer"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-[#F8FAFC] px-2 select-none min-w-[120px] text-center">
              {formattedMonth}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#151D30] transition cursor-pointer"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botão de Retrospectiva do Mês se for mês passado */}
          {isPastMonth(month, year) && (
            <button
              type="button"
              onClick={() => setWrappedOpen(true)}
              className="flex items-center gap-1.5 h-[46px] px-3.5 rounded-xl text-xs font-semibold bg-[#151D30] hover:bg-[#1E293B] text-[#FACC15] border border-[#FACC15]/30 shadow-sm active:scale-[0.98] transition cursor-pointer"
              title={`Ver Retrospectiva de ${formattedMonth}`}
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#FACC15]" />
              <span>Retrospectiva</span>
            </button>
          )}

          {/* Alternador Principal: Negócio vs Geral (Apenas se hasBusiness for true) */}
          {hasBusiness && (
            <div className="flex items-center bg-[#0D121F] border border-[#1E293B] p-1 rounded-xl shadow-sm h-[46px]">
              <button
                type="button"
                onClick={() => setViewMode('business')}
                className={`flex items-center gap-1.5 px-3 h-full rounded-lg text-xs font-semibold transition cursor-pointer ${
                  effectiveViewMode === 'business'
                    ? 'bg-[#FACC15] text-[#080B11] shadow-sm font-bold'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <SegmentIcon segment={profile.segment} className="w-3.5 h-3.5" />
                <span>{businessName}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('general')}
                className={`flex items-center gap-1.5 px-3 h-full rounded-lg text-xs font-semibold transition cursor-pointer ${
                  effectiveViewMode === 'general'
                    ? 'bg-[#151D30] text-[#F8FAFC] border border-[#1E293B] font-bold'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Visão Geral</span>
              </button>
            </div>
          )}

          {/* Botão de Privacidade / Ocultar Valores */}
          <button
            type="button"
            onClick={() => setShowValues(!showValues)}
            className="h-[46px] w-[46px] flex items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC] bg-[#0D121F] border border-[#1E293B] hover:bg-[#151D30] rounded-xl transition cursor-pointer shadow-sm"
            title={showValues ? 'Ocultar valores sensíveis' : 'Mostrar valores sensíveis'}
            aria-label={showValues ? 'Ocultar valores' : 'Mostrar valores'}
          >
            {showValues ? (
              <Eye className="w-4 h-4 text-[#94A3B8]" />
            ) : (
              <EyeOff className="w-4 h-4 text-[#FACC15]" />
            )}
          </button>

          {/* Notificações */}
          <div className="h-[46px] flex items-center justify-center bg-[#0D121F] border border-[#1E293B] rounded-xl px-1 shadow-sm">
            <NotificationBell userEmail={userEmail} />
          </div>

          {/* Exportação */}
          <ExportDropdown onExport={handleExport} />

          {/* Botão Principal de Ação em Destaque (~46px, ~18px px, rounded-xl) */}
          <QuickActionDropdown
            size="lg"
            defaultScope={effectiveViewMode === 'business' ? 'business' : 'personal'}
          />
        </div>
      </div>

      {/* 2. Conteúdo do Dashboard com espaçamento de ~38px após o cabeçalho */}
      <div className="mt-[38px] space-y-6">
        {/* Banner de Retrospectiva para Meses Anteriores */}
        {isPastMonth(month, year) && (
          <MonthlyWrappedBanner
            month={month}
            year={year}
            onOpenWrapped={() => setWrappedOpen(true)}
          />
        )}

        {/* Hub Unificado de Confirmações & Pendências do Dia (Topo Absoluto Desktop) */}
        <UnifiedDailyPendingHub
          pendingReceipts={pendingReceipts}
          upcomingBills={upcomingBills}
          cards={initialCards}
          onReceiptConfirmed={(id) => {
            setPendingReceipts((prev) => prev.filter((r) => r.id !== id));
            refreshData();
          }}
          onBillPaid={(id) => {
            setUpcomingBills((prev) => prev.filter((b) => b.id !== id));
            refreshData();
          }}
          scopeFilter={effectiveViewMode === 'business' ? 'business' : 'all'}
        />

        {/* Renderização Condicional baseada no modo escolhido */}
        {effectiveViewMode === 'business' ? (
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
      </div>

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

      {/* Modal de Retrospectiva Mensal Estilo Spotify Wrapped */}
      <MonthlyWrappedModal
        isOpen={wrappedOpen}
        onClose={() => setWrappedOpen(false)}
        month={month}
        year={year}
      />
    </div>
  );
}
