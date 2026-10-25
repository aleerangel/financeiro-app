'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
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
  Store,
  Search,
  CalendarDays,
  List,
  TrendingDown,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
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

const MobileTransactionFiltersDrawer = dynamic(
  () =>
    import('./MobileTransactionFiltersDrawer').then(
      (m) => m.MobileTransactionFiltersDrawer
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
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');
  const [groupByDay, setGroupByDay] = useState<boolean>(true);
  const [evolutionModalType, setEvolutionModalType] = useState<
    'income' | 'expense' | null
  >(null);
  const [mobileFilterDrawerOpen, setMobileFilterDrawerOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultScope, setModalDefaultScope] =
    useState<FinancialScope>('personal');
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
    if (!evolutionModalType) return;
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
  }, [evolutionModalType, year]);

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

  const realizedBalance = receivedIncome - paidExpense;

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

  const projectedBalance =
    receivedIncome +
    pendingIncome -
    (paidExpense + pendingExpense) +
    projectedYieldPending;

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

  const hasActiveFilter =
    filter !== 'all' ||
    selectedCategoryId !== 'all' ||
    selectedSourceId !== 'all' ||
    searchTerm.trim().length > 0;

  const activeAdvancedFiltersCount =
    (selectedCategoryId !== 'all' ? 1 : 0) +
    (selectedSourceId !== 'all' ? 1 : 0) +
    (!groupByDay ? 1 : 0);

  const filteredSummary = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of filteredTransactions) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') inc += amt;
      else exp += amt;
    }
    return {
      income: inc,
      expense: exp,
      net: inc - exp,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Agrupamento por Dia (ordenado da data mais recente para a mais antiga)
  const dayGroups = useMemo(
    () => groupTransactionsByDay(filteredTransactions),
    [filteredTransactions]
  );

  const handleExport = (format: ExportFormat) => {
    let filterLabel = 'Todas as movimentações';
    if (filter === 'income') filterLabel = 'Apenas Receitas';
    else if (filter === 'expense') filterLabel = 'Apenas Despesas';
    else if (filter === 'business') filterLabel = `Apenas ${hasBusiness ? businessName : 'Negócio'}`;
    else if (filter === 'personal') filterLabel = 'Apenas Pessoal';
    else if (filter === 'credit') filterLabel = 'Cartão de Crédito';
    else if (filter === 'pending') filterLabel = 'Apenas Pendentes';

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
    <div className="space-y-6">
      {/* 1. TOPO DA PÁGINA: Mês, Categorias e Ações */}
      {/* Mobile Topo */}
      <div className="md:hidden p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        {/* Linha 1: Mês + Categoria + Filtros + Novo */}
        <div className="flex items-center justify-between gap-2">
          {/* Seletor de Mês Compacto */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-2 py-1.5 rounded-xl text-xs shrink-0">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
              title="Mês anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-zinc-200 px-1 capitalize text-xs">
              {formattedMonth}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
              title="Próximo mês"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dropdown de Categorias Simplificado (Mobile) */}
          <div className="flex-1 min-w-0">
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-200 focus:outline-none focus:border-emerald-500 transition truncate cursor-pointer"
            >
              <option value="all">🏷️ Categorias: Todas</option>
              <optgroup label="Receitas">
                {initialCategories
                  .filter((c) => c.type === 'income')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      🟢 {c.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Despesas">
                {initialCategories
                  .filter((c) => c.type === 'expense')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      🔴 {c.name}
                    </option>
                  ))}
              </optgroup>
              <option value="none">⚪ Sem Categoria</option>
            </select>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setMobileFilterDrawerOpen(true)}
              className={`p-2 rounded-xl text-xs font-semibold border transition relative ${
                activeAdvancedFiltersCount > 0
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-zinc-100'
              }`}
              title="Mais Filtros & Exportar"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {activeAdvancedFiltersCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setTransactionToEdit(null);
                setModalDefaultScope('personal');
                setModalOpen(true);
              }}
              className="p-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl shadow-md shadow-emerald-500/10 transition"
              title="Novo Lançamento"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Linha 2: Busca por Texto */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar lançamentos..."
            className="w-full pl-8 pr-8 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Topo */}
      <div className="hidden md:flex items-center justify-between gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Seletor de Mês */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 rounded-xl text-xs shrink-0">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-zinc-100 px-2 capitalize text-sm">
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

          {/* Dropdown de Categorias Simplificado (Desktop) */}
          <div className="w-56 shrink-0">
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="all">🏷️ Todas as Categorias</option>
              <optgroup label="Receitas">
                {initialCategories
                  .filter((c) => c.type === 'income')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      🟢 {c.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Despesas">
                {initialCategories
                  .filter((c) => c.type === 'expense')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      🔴 {c.name}
                    </option>
                  ))}
              </optgroup>
              <option value="none">⚪ Sem Categoria</option>
            </select>
          </div>

          {/* Filtro por Conta / Cartão */}
          <div className="w-52 shrink-0">
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="all">🏦 Todas as Contas / Meios</option>
              {initialAccounts.length > 0 && (
                <optgroup label="Contas Bancárias / Carteira">
                  {initialAccounts.map((acc) => (
                    <option key={acc.id} value={`acc:${acc.id}`}>
                      🏦 {acc.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {initialCards.length > 0 && (
                <optgroup label="Cartões de Crédito">
                  {initialCards.map((card) => (
                    <option key={card.id} value={`card:${card.id}`}>
                      💳 {card.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Busca por texto */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar descrição ou nota..."
              className="w-full pl-9 pr-8 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Ações Desktop: Exportar + Modo Agrupado + Nova Transação */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-zinc-950 border border-zinc-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setGroupByDay(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
                groupByDay
                  ? 'bg-emerald-500 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Agrupar por Dia"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Por Dia</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupByDay(false)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
                !groupByDay
                  ? 'bg-emerald-500 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Lista Corrida"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Corrida</span>
            </button>
          </div>

          <ExportDropdown
            onExport={handleExport}
            buttonLabel="Exportar"
            title="Exportar Extrato"
            disabled={filteredTransactions.length === 0}
          />

          {hasBusiness && (
            <button
              onClick={() => {
                setTransactionToEdit(null);
                setModalDefaultScope('business');
                setModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs rounded-xl transition truncate"
            >
              <Store className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">+ Gasto {businessName}</span>
            </button>
          )}

          <button
            onClick={() => {
              setTransactionToEdit(null);
              setModalDefaultScope('personal');
              setModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs rounded-xl transition shadow-lg shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* 2. BARRA DE TOTAIS COMPACTA EM 1 LINHA (Mobile & Desktop) */}
      <div className="p-3 sm:px-4 sm:py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
          {/* Entradas */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-zinc-400 text-[11px] font-medium">Entradas:</span>
            <span className="font-bold text-emerald-400 text-xs sm:text-sm">
              +{formatCurrency(receivedIncome)}
            </span>
            {pendingIncome > 0 && (
              <span className="text-[10px] text-zinc-500 hidden sm:inline">
                (+{formatCurrency(pendingIncome)} a receber)
              </span>
            )}
          </div>

          {/* Saídas */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <span className="text-zinc-400 text-[11px] font-medium">Saídas:</span>
            <span className="font-bold text-rose-400 text-xs sm:text-sm">
              -{formatCurrency(paidExpense)}
            </span>
            {pendingExpense > 0 && (
              <span className="text-[10px] text-zinc-500 hidden sm:inline">
                (+{formatCurrency(pendingExpense)} a pagar)
              </span>
            )}
          </div>

          {/* Saldo Realizado */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-[11px] font-medium">Saldo:</span>
            <span
              className={`font-bold text-xs sm:text-sm ${
                realizedBalance >= 0 ? 'text-zinc-100' : 'text-rose-400'
              }`}
            >
              {realizedBalance >= 0 ? '+' : '-'} {formatCurrency(Math.abs(realizedBalance))}
            </span>
          </div>

          {/* Previsão Final no Desktop */}
          <div className="hidden lg:flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <span>Previsão:</span>
            <span className="font-semibold text-zinc-200">
              {formatCurrency(projectedBalance)}
            </span>
          </div>

          {/* Pendências rápidas */}
          {(pendingExpense > 0 || pendingIncome > 0) && (
            <div className="flex items-center gap-1 text-[10px] text-amber-400/90 font-medium">
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                {pendingExpense > 0
                  ? `Pendente: ${formatCurrency(pendingExpense)}`
                  : `A receber: ${formatCurrency(pendingIncome)}`}
              </span>
            </div>
          )}
        </div>

        {/* Evolução por Categoria */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setEvolutionModalType('expense')}
            className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-800 transition"
            title="Ver evolução anual"
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Evolução Anual</span>
          </button>
        </div>
      </div>

      {/* 3. PÍLULAS DE ESCOPO / STATUS */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
        <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1 hidden sm:inline shrink-0" />
        {[
          { id: 'all' as FilterType, label: 'Todos' },
          ...(hasBusiness
            ? [{ id: 'business' as FilterType, label: `💼 ${businessName}` }]
            : []),
          { id: 'personal' as FilterType, label: '👤 Pessoal' },
          { id: 'income' as FilterType, label: 'Receitas' },
          { id: 'expense' as FilterType, label: 'Despesas' },
          { id: 'credit' as FilterType, label: 'Cartão' },
          { id: 'pending' as FilterType, label: 'Pendentes' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap shrink-0 ${
              filter === f.id
                ? 'bg-zinc-100 text-zinc-900 font-semibold'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            {f.label}
          </button>
        ))}

        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              setSelectedCategoryId('all');
              setSelectedSourceId('all');
              setSearchTerm('');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition shrink-0 whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}
      </div>

      {/* Resumo de filtro ativo se houver */}
      {hasActiveFilter && (
        <div className="p-2.5 bg-zinc-950/90 border border-zinc-800 rounded-xl flex items-center justify-between gap-2 text-[11px]">
          <span className="text-zinc-400">
            Exibindo <strong className="text-zinc-100">{filteredSummary.count}</strong> {filteredSummary.count === 1 ? 'lançamento' : 'lançamentos'}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`font-bold ${
                filteredSummary.net >= 0 ? 'text-zinc-100' : 'text-rose-400'
              }`}
            >
              Saldo: {formatCurrency(filteredSummary.net)}
            </span>
          </div>
        </div>
      )}

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

      <MobileTransactionFiltersDrawer
        isOpen={mobileFilterDrawerOpen}
        onClose={() => setMobileFilterDrawerOpen(false)}
        categories={initialCategories}
        accounts={initialAccounts}
        cards={initialCards}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        selectedSourceId={selectedSourceId}
        onSelectSource={setSelectedSourceId}
        groupByDay={groupByDay}
        onToggleGroupByDay={setGroupByDay}
        onExport={handleExport}
        hasActiveFilters={activeAdvancedFiltersCount > 0}
        onClearFilters={() => {
          setSelectedCategoryId('all');
          setSelectedSourceId('all');
          setGroupByDay(true);
        }}
      />

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
        isOpen={evolutionModalType !== null}
        onClose={() => setEvolutionModalType(null)}
        type={evolutionModalType || 'expense'}
        categories={
          evolutionModalType === 'income' ? incomeEvolution : expenseEvolution
        }
        transactions={transactions}
        currentMonth={month}
        year={year}
        formattedMonth={formattedMonth}
      />
    </div>
  );
}
