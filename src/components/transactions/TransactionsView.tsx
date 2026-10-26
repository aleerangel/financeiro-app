'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard as CardIcon,
  CheckCircle2,
  Clock,
  Trash2,
  Pencil,
  Store,
  Search,
  CalendarDays,
  List,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Transaction,
  Account,
  CreditCard,
  Category,
  FinancialScope,
} from '@/types/database';
import { useDateContext } from '@/context/DateContext';
import {
  getTransactions,
  toggleTransactionPaid,
  deleteTransaction,
} from '@/lib/actions/transactions';
import { getYearlyCategoryEvolution } from '@/lib/actions/dashboard';
import { CategoryMonthlyEvolutionItem } from '@/lib/category-evolution-utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ExportDropdown } from '@/components/ui/ExportDropdown';
import { exportTransactionsReport, ExportFormat } from '@/lib/export-utils';
import { isBusinessTransaction } from '@/lib/business-scope-utils';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { calculatePendingProjectedYield } from '@/lib/account-yield-utils';
import { getZonedParts } from '@/lib/date-utils';
import {
  TransactionFilterType,
  formatDayGroupLabel,
  filterTransactionsList,
  groupTransactionsByDay,
} from '@/lib/transaction-filter-utils';

import { CategorySelectDropdown } from './CategorySelectDropdown';

const TransactionModal = dynamic(
  () => import('./TransactionModal').then((m) => m.TransactionModal),
  { ssr: false }
);

const CategoryEvolutionModal = dynamic(
  () =>
    import('@/components/dashboard/CategoryEvolutionModal').then(
      (m) => m.CategoryEvolutionModal
    ),
  { ssr: false }
);

interface TransactionsViewProps {
  initialAccounts: (Account | AccountWithBalance)[];
  initialCards: CreditCard[];
  initialCategories: Category[];
  initialTransactions?: Transaction[];
  initialMonth?: number;
  initialYear?: number;
}

type FilterType = TransactionFilterType;

export function TransactionsView({
  initialAccounts,
  initialCards,
  initialCategories,
  initialTransactions,
  initialMonth,
  initialYear,
}: TransactionsViewProps) {
  const { confirm } = useConfirm();
  const { month, year, formattedMonth, prevMonth, nextMonth } = useDateContext();
  const { hasBusiness, businessName } = useBusinessProfile();
  const isInitialMount = useRef(true);
  const [transactions, setTransactions] = useState<Transaction[]>(
    initialTransactions || []
  );
  const [incomeEvolution, setIncomeEvolution] = useState<
    CategoryMonthlyEvolutionItem[]
  >([]);
  const [expenseEvolution, setExpenseEvolution] = useState<
    CategoryMonthlyEvolutionItem[]
  >([]);
  const [loading, setLoading] = useState(
    initialTransactions && initialMonth === month && initialYear === year ? false : true
  );

  // Filtros e visualização
  const filter: FilterType = 'all';
  const selectedSourceId = 'all';
  const modalDefaultScope: FinancialScope = 'personal';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [groupByDay, setGroupByDay] = useState<boolean>(true);
  const [evolutionModalOpen, setEvolutionModalOpen] = useState<boolean>(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] =
    useState<Transaction | null>(null);
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
    // Se for o mount inicial e já tivermos os dados do mês/ano vindos do SSR, não re-busca
    if (
      isInitialMount.current &&
      initialTransactions &&
      initialMonth === month &&
      initialYear === year
    ) {
      isInitialMount.current = false;
      return;
    }
    isInitialMount.current = false;

    let active = true;
    setLoading(true);
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
  }, [month, year, initialTransactions, initialMonth, initialYear]);

  // Carrega a evolução anual de categorias sob demanda SOMENTE quando o usuário abre o modal
  useEffect(() => {
    if (!evolutionModalOpen) return;
    let active = true;
    getYearlyCategoryEvolution(year)
      .then((evo) => {
        if (active) {
          setIncomeEvolution(evo.incomeCategories);
          setExpenseEvolution(evo.expenseCategories);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar evolução por categoria:', err);
      });

    return () => {
      active = false;
    };
  }, [evolutionModalOpen, year]);

  const handleTogglePaid = async (t: Transaction) => {
    try {
      setActionLoadingId(t.id);
      await toggleTransactionPaid(t.id, !t.is_paid);
      setTransactions((prev) =>
        prev.map((item) =>
          item.id === t.id ? { ...item, is_paid: !t.is_paid } : item
        )
      );
      toast.success(
        !t.is_paid
          ? t.type === 'income'
            ? 'Receita marcada como recebida!'
            : 'Despesa marcada como paga!'
          : 'Lançamento desmarcado (pendente)!'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (t: Transaction) => {
    let deleteEntireGroup = false;

    if (
      t.installment_group_id &&
      t.total_installments &&
      t.total_installments > 1
    ) {
      const choice = await confirm({
        title: 'Excluir Compra Parcelada',
        description: `Esta despesa faz parte de uma compra parcelada em ${t.total_installments}x. Deseja excluir todas as parcelas ou somente esta?`,
        confirmLabel: 'Excluir Todas',
        cancelLabel: 'Excluir Só Esta',
        variant: 'danger',
      });
      deleteEntireGroup = choice;
    } else {
      const ok = await confirm({
        title: 'Excluir Lançamento',
        description: `Deseja realmente excluir "${t.description}"?`,
        confirmLabel: 'Excluir',
        variant: 'danger',
      });
      if (!ok) return;
    }

    try {
      setActionLoadingId(t.id);
      await deleteTransaction(t.id, deleteEntireGroup);
      toast.success('Lançamento excluído com sucesso!');
      await refreshData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
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

  // Rendimentos estimados pendentes das contas para o mês selecionado
  const { month: currentMonth, year: currentYear } = useMemo(() => getZonedParts(), []);
  const projectedYieldPending = useMemo(
    () =>
      calculatePendingProjectedYield(
        initialAccounts as AccountWithBalance[],
        month,
        year,
        currentMonth,
        currentYear
      ),
    [initialAccounts, month, year, currentMonth, currentYear]
  );

  // Aplicação combinada dos filtros
  const filteredTransactions = useMemo(
    () =>
      filterTransactionsList(transactions, {
        filter,
        searchTerm,
        selectedCategoryId,
        selectedSourceId,
      }),
    [transactions, filter, selectedCategoryId, selectedSourceId, searchTerm]
  );

  // Categorias ativas com movimentações no mês selecionado e suas respectivas contagens
  const activeCategoriesWithCount = useMemo(() => {
    const countMap = new Map<string, number>();
    let uncategorizedCount = 0;

    for (const t of transactions) {
      if (!t.category_id) {
        uncategorizedCount++;
      } else {
        countMap.set(t.category_id, (countMap.get(t.category_id) || 0) + 1);
      }
    }

    const incomeCategories = initialCategories
      .filter((c) => c.type === 'income' && (countMap.get(c.id) || 0) > 0)
      .map((c) => ({ ...c, count: countMap.get(c.id)! }));

    const expenseCategories = initialCategories
      .filter((c) => c.type === 'expense' && (countMap.get(c.id) || 0) > 0)
      .map((c) => ({ ...c, count: countMap.get(c.id)! }));

    return {
      incomeCategories,
      expenseCategories,
      uncategorizedCount,
      totalCount: transactions.length,
    };
  }, [transactions, initialCategories]);

  // Agrupamento por Dia (ordenado da data mais recente para a mais antiga)
  const dayGroups = useMemo(
    () => groupTransactionsByDay(filteredTransactions),
    [filteredTransactions]
  );

  const hasActiveFilter = selectedCategoryId !== 'all' || searchTerm.trim().length > 0;

  const handleExport = (format: ExportFormat) => {
    let filterLabel = 'Todas as movimentações';
    if (selectedCategoryId !== 'all') {
      const cat = initialCategories.find((c) => c.id === selectedCategoryId);
      if (cat) filterLabel = `Categoria: ${cat.name}`;
      else if (selectedCategoryId === 'none') filterLabel = 'Sem Categoria';
    }

    if (searchTerm.trim()) {
      filterLabel += ` • Busca: "${searchTerm.trim()}"`;
    }

    exportTransactionsReport({
      format,
      periodLabel: formattedMonth,
      transactions: filteredTransactions,
      filterLabel: hasActiveFilter ? filterLabel : undefined,
      projectedYield: projectedYieldPending,
    });
  };

  const renderDesktopRow = (t: Transaction) => {
    const isCredit = t.payment_method === 'credit';
    const isIncome = t.type === 'income';

    return (
      <div
        className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-800/40 transition group"
      >
        {/* Lado Esquerdo: Ícone + Descrição + Detalhes */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
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

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-zinc-100 truncate">
                {t.description}
              </h4>
              {isBusinessTransaction(t) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 truncate max-w-[140px]">
                  <Store className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{hasBusiness ? businessName : 'Negócio'}</span>
                </span>
              )}
              {t.total_installments && t.total_installments > 1 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-medium shrink-0">
                  {t.current_installment}/{t.total_installments}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                {t.category?.color && (
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: t.category.color }}
                  />
                )}
                {t.category?.name || 'Sem Categoria'}
              </span>
              <span>•</span>
              <span>
                {isCredit ? t.credit_card?.name : t.account?.name || 'Carteira'}
              </span>
              {!groupByDay && (
                <>
                  <span>•</span>
                  <span>Vencimento: {formatDate(t.due_date)}</span>
                </>
              )}
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
  };

  const renderMobileRow = (t: Transaction) => {
    const isCredit = t.payment_method === 'credit';
    const isIncome = t.type === 'income';

    return (
      <div
        onClick={() => {
          setTransactionToEdit(t);
          setModalOpen(true);
        }}
        className="p-3.5 hover:bg-zinc-800/40 active:bg-zinc-800/60 transition cursor-pointer"
      >
        {/* Linha 1: Ícone + Título Fluido + Valor Alinhado à Direita */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
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
                <ArrowUpRight className="w-4 h-4" />
              ) : isCredit ? (
                <CardIcon className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-zinc-100 truncate">
                {t.description}
              </h4>
              {t.total_installments && t.total_installments > 1 && (
                <span className="text-[10px] text-purple-400 font-medium block">
                  Parcela {t.current_installment}/{t.total_installments}
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span
              className={`text-sm font-bold block ${
                isIncome ? 'text-emerald-400' : 'text-zinc-100'
              }`}
            >
              {isIncome ? '+' : '-'} {formatCurrency(Number(t.amount))}
            </span>
          </div>
        </div>

        {/* Linha 2: Tags de Negócio, Categoria, Conta e Botão de Status */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-zinc-800/50 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 text-zinc-400 text-[11px]">
            {isBusinessTransaction(t) && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                <Store className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate max-w-[90px]">{hasBusiness ? businessName : 'Negócio'}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 truncate max-w-[120px]">
              {t.category?.color && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: t.category.color }}
                />
              )}
              <span className="truncate">{t.category?.name || 'Sem Categoria'}</span>
            </span>

            <span>•</span>

            <span className="truncate max-w-[100px]">
              {isCredit ? t.credit_card?.name : t.account?.name || 'Carteira'}
            </span>

            {!groupByDay && (
              <>
                <span>•</span>
                <span className="text-[10px]">{formatDate(t.due_date)}</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePaid(t);
            }}
            disabled={actionLoadingId === t.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition shrink-0 active:scale-95 ${
              t.is_paid
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
            }`}
            title={t.is_paid ? 'Marcar como Pendente' : 'Marcar como Pago'}
          >
            {t.is_paid ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Pago</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Pendente</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderTransactionRow = (t: Transaction) => (
    <div key={t.id}>
      <div className="hidden md:block">{renderDesktopRow(t)}</div>
      <div className="md:hidden">{renderMobileRow(t)}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 1. LINHA 1: Busca por Texto */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar descrição ou nota..."
          className="w-full pl-10 pr-9 py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition shadow-sm"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 absolute right-3 top-1/2 -translate-y-1/2 transition"
            title="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. LINHA 2: Seletor de Mês em Linha Inteira com Botão de Exportar à Direita */}
      <div className="flex items-center justify-between gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-zinc-100 px-2 capitalize text-xs sm:text-sm">
            {formattedMonth}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Botão de Exportar */}
        <div className="shrink-0">
          <ExportDropdown
            onExport={handleExport}
            buttonLabel="Exportar"
            title="Exportar Extrato"
            disabled={filteredTransactions.length === 0}
          />
        </div>
      </div>

      {/* 3. LINHA 3: Resumo de Receitas e Despesas com Botão Único de Evolução */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Fluxo do Mês
          </span>
          <button
            type="button"
            onClick={() => setEvolutionModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition shadow-sm active:scale-95 group"
            title="Ver evolução de entradas e saídas"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Ver Evolução</span>
            <span className="text-[11px] text-zinc-500 font-normal">›</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Card Receitas */}
          <div className="p-3.5 sm:p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400">
                  Receitas
                </span>
              </div>
              <span className="text-base sm:text-2xl font-bold text-emerald-400 block tracking-tight">
                +{formatCurrency(receivedIncome)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400">
              {pendingIncome > 0
                ? `+ ${formatCurrency(pendingIncome)} a receber`
                : 'Tudo recebido'}
            </div>
          </div>

          {/* Card Despesas */}
          <div className="p-3.5 sm:p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-rose-400">
                  Despesas
                </span>
              </div>
              <span className="text-base sm:text-2xl font-bold text-rose-400 block tracking-tight">
                -{formatCurrency(paidExpense)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400">
              {pendingExpense > 0
                ? `+ ${formatCurrency(pendingExpense)} a pagar`
                : 'Tudo pago'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. LINHA 4: Categorias Ativas do Mês & Alternador de Modo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Dropdown Inteligente de Categorias */}
          <CategorySelectDropdown
            categories={initialCategories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            activeCategories={activeCategoriesWithCount}
          />
        </div>

        {/* Alternador de Visualização: Por Dia vs Lista Corrida */}
        <div className="flex items-center self-end sm:self-center bg-zinc-950 border border-zinc-800 p-1 rounded-xl text-xs shrink-0">
          <button
            type="button"
            onClick={() => setGroupByDay(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
              groupByDay
                ? 'bg-emerald-500 text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Por Dia</span>
          </button>
          <button
            type="button"
            onClick={() => setGroupByDay(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
              !groupByDay
                ? 'bg-emerald-500 text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Lista Corrida</span>
          </button>
        </div>
      </div>

      {/* Lista de Transações (Agrupada por Dia ou Lista Corrida) */}
      {loading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-16 text-center text-zinc-500 text-xs">
          Carregando transações de {formattedMonth}...
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-16 text-center text-zinc-500">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
          <p className="text-sm font-medium">
            Nenhum lançamento encontrado em {formattedMonth}.
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Ajuste os filtros ou use o botão &quot;Nova Transação&quot; para
            registrar entradas e saídas.
          </p>
        </div>
      ) : groupByDay ? (
        <div className="space-y-4">
          {dayGroups.map((group) => {
            const dayNet = group.incomeTotal - group.expenseTotal;

            return (
              <div
                key={group.date}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
              >
                {/* Cabeçalho do Dia com Subtotal Diário */}
                <div className="px-4 py-2.5 bg-zinc-950/70 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-zinc-200 flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                    {formatDayGroupLabel(group.date)}
                  </span>

                  <div className="flex items-center gap-3 text-[11px]">
                    {group.incomeTotal > 0 && (
                      <span className="text-emerald-400 font-semibold">
                        +{formatCurrency(group.incomeTotal)}
                      </span>
                    )}
                    {group.expenseTotal > 0 && (
                      <span className="text-rose-400 font-semibold">
                        -{formatCurrency(group.expenseTotal)}
                      </span>
                    )}
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md border ${
                        dayNet >= 0
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      }`}
                    >
                      Dia: {dayNet >= 0 ? '+' : '-'}
                      {formatCurrency(Math.abs(dayNet))}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-zinc-800/80">
                  {group.items.map((t) => renderTransactionRow(t))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/80 overflow-hidden">
          {filteredTransactions.map((t) => renderTransactionRow(t))}
        </div>
      )}

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
        defaultScope={modalDefaultScope}
        onSuccess={refreshData}
      />

      {/* Modal de Evolução Anual por Categoria (Receitas ou Despesas) */}
      <CategoryEvolutionModal
        isOpen={evolutionModalOpen}
        onClose={() => setEvolutionModalOpen(false)}
        type="income"
        incomeCategories={incomeEvolution}
        expenseCategories={expenseEvolution}
        categories={incomeEvolution}
        transactions={transactions}
        currentMonth={month}
        year={year}
        formattedMonth={formattedMonth}
      />
    </div>
  );
}
