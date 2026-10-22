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
  Scissors,
  Search,
  CalendarDays,
  List,
  TrendingUp,
  TrendingDown,
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
import { AccountWithBalance } from '@/lib/actions/accounts';
import { calculatePendingProjectedYield } from '@/lib/account-yield-utils';
import { getZonedParts } from '@/lib/date-utils';
import {
  TransactionFilterType,
  formatDayGroupLabel,
  filterTransactionsList,
  groupTransactionsByDay,
} from '@/lib/transaction-filter-utils';
import { MobileKpiCarousel } from '@/components/dashboard/MobileKpiCarousel';

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
    else if (filter === 'business') filterLabel = 'Apenas Barbearia';
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

  const renderTransactionRow = (t: Transaction) => {
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
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-zinc-100 truncate">
                {t.description}
              </h4>
              {isBusinessTransaction(t) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                  <Scissors className="w-2.5 h-2.5" />
                  Barbearia
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

  return (
    <div className="space-y-6">
      {/* Cards de Resumo do Mês (Desktop Grid / Mobile Carousel) */}
      <MobileKpiCarousel desktopGridClassName="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" accentColor="emerald">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
              Receitas Recebidas
            </span>
            <span className="text-lg sm:text-xl font-bold text-emerald-400 block">
              {formatCurrency(receivedIncome)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-400">
              {pendingIncome > 0
                ? `+ ${formatCurrency(pendingIncome)} a receber`
                : 'Tudo recebido'}
            </span>
            <button
              type="button"
              onClick={() => setEvolutionModalType('income')}
              className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
            >
              <TrendingUp className="w-3 h-3" />
              Evolução
            </button>
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
              Despesas Pagas
            </span>
            <span className="text-lg sm:text-xl font-bold text-rose-400 block">
              {formatCurrency(paidExpense)}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-400">
              {pendingExpense > 0
                ? `+ ${formatCurrency(pendingExpense)} a pagar`
                : 'Tudo pago'}
            </span>
            <button
              type="button"
              onClick={() => setEvolutionModalType('expense')}
              className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-0.5"
            >
              <TrendingDown className="w-3 h-3" />
              Evolução
            </button>
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div>
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
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 space-y-0.5">
            <span className="text-[10px] text-zinc-400 block">
              Previsão final: <strong className="font-semibold text-zinc-200">{formatCurrency(projectedBalance)}</strong>
            </span>
            {projectedYieldPending > 0 && (
              <span className="text-[9.5px] text-emerald-400 font-medium block">
                + {formatCurrency(projectedYieldPending)} de rendimentos estimados
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-400 block mb-1">
              A Pagar / Pendente
            </span>
            <span className="text-lg sm:text-xl font-bold text-amber-300 block">
              {formatCurrency(pendingExpense)}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400/80 mt-2 pt-2 border-t border-zinc-800/80 block">
            A receber: {formatCurrency(pendingIncome)}
          </span>
        </div>
      </MobileKpiCarousel>

      {/* Barra de Busca, Filtros Avançados e Ações */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Busca + Dropdowns de Categoria e Conta/Cartão */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
            {/* Busca por texto */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar descrição ou nota..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Filtro por Categoria */}
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">Todas as Categorias</option>
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
              <option value="none">Sem Categoria</option>
            </select>

            {/* Filtro por Conta ou Cartão */}
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">Todas as Contas &amp; Cartões</option>
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

          {/* Botões de Nova Transação e Exportação */}
          <div className="flex items-center gap-2 shrink-0">
            <ExportDropdown
              onExport={handleExport}
              buttonLabel="Exportar"
              title="Exportar Extrato"
              disabled={filteredTransactions.length === 0}
            />

            <button
              onClick={() => {
                setTransactionToEdit(null);
                setModalDefaultScope('business');
                setModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs rounded-xl transition"
            >
              <Scissors className="w-3.5 h-3.5" />
              + Gasto Barbearia
            </button>

            <button
              onClick={() => {
                setTransactionToEdit(null);
                setModalDefaultScope('personal');
                setModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs rounded-xl transition shadow-lg shadow-emerald-500/10"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Nova Transação
            </button>
          </div>
        </div>

        {/* Linha 2: Pílulas de Tipo/Escopo + Alternador Agrupado por Dia vs Lista Corrida */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1 hidden sm:inline shrink-0" />
            {[
              { id: 'all', label: 'Todos' },
              { id: 'business', label: '✂️ Barbearia' },
              { id: 'personal', label: '👤 Pessoal' },
              { id: 'income', label: 'Receitas' },
              { id: 'expense', label: 'Despesas' },
              { id: 'credit', label: 'Cartão' },
              { id: 'pending', label: 'Pendentes' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as FilterType)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
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
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                Limpar filtros
              </button>
            )}
          </div>

          {/* Seletor de Mês + Alternador Agrupar por Dia vs Lista Simples */}
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
            <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                title="Mês anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-zinc-200 px-1.5 capitalize">
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

            <div className="flex items-center bg-zinc-950 border border-zinc-800 p-1 rounded-xl text-xs">
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
        </div>

        {/* Resumo do Filtro Ativo */}
        {hasActiveFilter && (
          <div className="p-3 bg-zinc-950/90 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-zinc-400">
              Exibindo{' '}
              <strong className="text-zinc-100">{filteredSummary.count}</strong>{' '}
              {filteredSummary.count === 1 ? 'lançamento' : 'lançamentos'} no
              filtro atual:
            </span>
            <div className="flex items-center gap-4">
              {filteredSummary.income > 0 && (
                <span className="text-emerald-400 font-semibold">
                  Entradas: +{formatCurrency(filteredSummary.income)}
                </span>
              )}
              {filteredSummary.expense > 0 && (
                <span className="text-rose-400 font-semibold">
                  Saídas: -{formatCurrency(filteredSummary.expense)}
                </span>
              )}
              <span
                className={`font-bold ${
                  filteredSummary.net >= 0
                    ? 'text-zinc-100'
                    : 'text-rose-400'
                }`}
              >
                Saldo: {formatCurrency(filteredSummary.net)}
              </span>
            </div>
          </div>
        )}
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
