'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Trash2,
  X,
  Sparkles,
  Repeat,
  Layers,
  Store,
  CreditCard as CardIcon,
  Info,
} from 'lucide-react';
import { Transaction } from '@/types/database';
import { isBusinessTransaction } from '@/lib/business-scope-utils';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import {
  CreditCardWithUsage,
  getCreditCardTransactions,
  setCreditCardInvoicePaid,
} from '@/lib/actions/credit-cards';
import { toggleTransactionPaid, deleteTransaction } from '@/lib/actions/transactions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getTodayYMD } from '@/lib/date-utils';
import { getCardInvoiceStatus } from '@/lib/credit-card-utils';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useDateContext } from '@/context/DateContext';
import { useRouter } from 'next/navigation';
import { PayInvoiceModal } from './PayInvoiceModal';

interface CreditCardInvoicesPanelProps {
  cards?: CreditCardWithUsage[];
  card?: CreditCardWithUsage;
  activeCardId?: string | 'all';
  onSelectCardId?: (cardId: string | 'all') => void;
  onClose?: () => void;
}

const MONTH_SHORT_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTH_FULL_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function CreditCardInvoicesPanel({
  cards = [],
  card,
  activeCardId: propActiveCardId,
  onSelectCardId,
  onClose,
}: CreditCardInvoicesPanelProps) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { hasBusiness, businessName } = useBusinessProfile();
  const { month: globalMonth, year: globalYear } = useDateContext();

  // Consolidação de lista de cartões disponíveis
  const allCards: CreditCardWithUsage[] = useMemo(() => {
    if (cards.length > 0) return cards;
    if (card) return [card];
    return [];
  }, [cards, card]);

  // Estado interno para controle do cartão ativo se não for controlado via prop
  const [internalActiveCardId, setInternalActiveCardId] = useState<string | 'all'>(() => {
    if (propActiveCardId !== undefined) return propActiveCardId;
    if (card) return card.id;
    return allCards.length > 1 ? 'all' : allCards[0]?.id || 'all';
  });

  const activeCardId = propActiveCardId !== undefined ? propActiveCardId : internalActiveCardId;

  const handleCardChange = (newCardId: string | 'all') => {
    if (onSelectCardId) {
      onSelectCardId(newCardId);
    } else {
      setInternalActiveCardId(newCardId);
    }
  };

  const activeCard = useMemo(() => {
    if (activeCardId === 'all') return null;
    return allCards.find((c) => c.id === activeCardId) || null;
  }, [allCards, activeCardId]);

  const isConsolidated = activeCardId === 'all' || !activeCard;
  const themeColor = activeCard?.color || '#8b5cf6';

  const [selectedMonth, setSelectedMonth] = useState<number>(globalMonth);
  const [selectedYear, setSelectedYear] = useState<number>(globalYear);
  const [prevGlobalKey, setPrevGlobalKey] = useState<string>(`${globalYear}-${globalMonth}`);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadedCardKey, setLoadedCardKey] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [itemLoadingId, setItemLoadingId] = useState<string | null>(null);
  const [payModalOpen, setPayModalOpen] = useState<boolean>(false);

  const loading = loadedCardKey !== activeCardId || fetchLoading;

  const currentGlobalKey = `${globalYear}-${globalMonth}`;
  if (prevGlobalKey !== currentGlobalKey) {
    setPrevGlobalKey(currentGlobalKey);
    setSelectedMonth(globalMonth);
    setSelectedYear(globalYear);
  }

  const refreshCardTransactions = useCallback(async () => {
    try {
      setFetchLoading(true);
      const data = await getCreditCardTransactions(activeCardId === 'all' ? undefined : activeCardId);
      setTransactions(data);
    } catch (err) {
      console.error('Erro ao carregar faturas do cartão:', err);
    } finally {
      setFetchLoading(false);
    }
  }, [activeCardId]);

  useEffect(() => {
    let active = true;
    getCreditCardTransactions(activeCardId === 'all' ? undefined : activeCardId)
      .then((data) => {
        if (active) {
          setTransactions(data);
          setLoadedCardKey(activeCardId);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar faturas:', err);
        if (active) setLoadedCardKey(activeCardId);
      });

    return () => {
      active = false;
    };
  }, [activeCardId]);

  // Agrupa faturas por chave YYYY-MM para exibir as abas de meses com movimentação
  const invoicesByMonthKey = useMemo(() => {
    const map = new Map<
      string,
      {
        year: number;
        month: number;
        total: number;
        paidTotal: number;
        pendingTotal: number;
        items: Transaction[];
      }
    >();

    for (const tx of transactions) {
      if (!tx.due_date) continue;
      const [yStr, mStr] = tx.due_date.split('-');
      const y = Number(yStr);
      const m = Number(mStr) - 1;
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;

      const entry = map.get(key) || {
        year: y,
        month: m,
        total: 0,
        paidTotal: 0,
        pendingTotal: 0,
        items: [],
      };

      const amt = Number(tx.amount) || 0;
      entry.total += amt;
      if (tx.is_paid) {
        entry.paidTotal += amt;
      } else {
        entry.pendingTotal += amt;
      }
      entry.items.push(tx);
      map.set(key, entry);
    }

    // Garante que o mês selecionado apareça na barra de abas mesmo que esteja vazio
    const currentKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    if (!map.has(currentKey)) {
      map.set(currentKey, {
        year: selectedYear,
        month: selectedMonth,
        total: 0,
        paidTotal: 0,
        pendingTotal: 0,
        items: [],
      });
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, ...value }));
  }, [transactions, selectedMonth, selectedYear]);

  const currentInvoiceKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const currentInvoice = useMemo(() => {
    return (
      invoicesByMonthKey.find((inv) => inv.key === currentInvoiceKey) || {
        key: currentInvoiceKey,
        year: selectedYear,
        month: selectedMonth,
        total: 0,
        paidTotal: 0,
        pendingTotal: 0,
        items: [],
      }
    );
  }, [invoicesByMonthKey, currentInvoiceKey, selectedMonth, selectedYear]);

  // Obtém datas e status da fatura
  const invoiceDatesInfo = useMemo(() => {
    if (isConsolidated) {
      return {
        statusLabel: `Visão Consolidada (${allCards.length} cartões)`,
        statusColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        subtitle: 'Vencimentos variados conforme cada cartão cadastrado',
        isConsolidated: true,
      };
    }

    // Cartão individual
    const baseStatus = getCardInvoiceStatus(activeCard!, selectedMonth, selectedYear);
    const todayStr = getTodayYMD();

    let statusLabel = 'Sem lançamentos';
    let statusColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';

    if (currentInvoice.items.length > 0) {
      if (currentInvoice.pendingTotal <= 0) {
        statusLabel = 'Fatura Paga';
        statusColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      } else if (todayStr > baseStatus.dueDateStr) {
        statusLabel = 'Fatura Vencida';
        statusColor = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      } else if (!baseStatus.isOpen) {
        statusLabel = 'Fatura Fechada';
        statusColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      } else {
        statusLabel = 'Fatura Aberta';
        statusColor = 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      }
    }

    return {
      dueDateStr: baseStatus.dueDateStr,
      closingDateStr: baseStatus.closingDateStr,
      statusLabel,
      statusColor,
      daysLeftLabel: baseStatus.daysLeftLabel,
      closingLabel: baseStatus.closingLabel,
      dueLabel: baseStatus.dueLabel,
      subtitle: `Fechamento em ${formatDate(baseStatus.closingDateStr)} • Vencimento em ${formatDate(baseStatus.dueDateStr)}`,
      isConsolidated: false,
    };
  }, [isConsolidated, allCards.length, activeCard, selectedMonth, selectedYear, currentInvoice]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handlePayEntireInvoice = async (markAsPaid: boolean) => {
    if (!activeCard) return;
    try {
      setActionLoading(true);
      await setCreditCardInvoicePaid(activeCard.id, selectedMonth, selectedYear, markAsPaid);
      toast.success(markAsPaid ? 'Fatura marcada como paga com sucesso!' : 'Fatura reaberta!');
      await refreshCardTransactions();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar fatura.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleItemPaid = async (tx: Transaction) => {
    try {
      setItemLoadingId(tx.id);
      await toggleTransactionPaid(tx.id, !tx.is_paid);
      toast.success(!tx.is_paid ? 'Lançamento marcado como pago!' : 'Lançamento desmarcado!');
      await refreshCardTransactions();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar lançamento.');
    } finally {
      setItemLoadingId(null);
    }
  };

  const handleDeleteItem = async (tx: Transaction) => {
    let deleteEntireGroup = false;

    if (tx.installment_group_id && tx.total_installments && tx.total_installments > 1) {
      const choice = await confirm({
        title: 'Excluir Compra Parcelada',
        description: `Esta compra é parcelada em ${tx.total_installments}x. Deseja excluir todas as parcelas ou somente a parcela desta fatura?`,
        confirmLabel: 'Excluir Todas',
        cancelLabel: 'Excluir Só Esta',
        variant: 'danger',
      });
      deleteEntireGroup = choice;
    } else {
      const ok = await confirm({
        title: 'Excluir Lançamento da Fatura',
        description: `Deseja excluir "${tx.description}" desta fatura?`,
        confirmLabel: 'Excluir',
        variant: 'danger',
      });
      if (!ok) return;
    }

    try {
      setItemLoadingId(tx.id);
      await deleteTransaction(tx.id, deleteEntireGroup);
      toast.success('Lançamento excluído com sucesso!');
      await refreshCardTransactions();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir compra.');
    } finally {
      setItemLoadingId(null);
    }
  };

  return (
    <div className="bg-[#0D121F] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Abas Rápidas de Seleção de Cartão (Se houver mais de 1 cartão cadastrado) */}
      {allCards.length > 1 && (
        <div className="px-5 pt-3.5 pb-2 border-b border-[#1E293B] bg-[#080B11]/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => handleCardChange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeCardId === 'all'
                ? 'bg-[#FACC15] text-[#080B11] shadow-sm'
                : 'bg-[#0D121F] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E293B]'
            }`}
          >
            <CardIcon className="w-3.5 h-3.5" />
            <span>Todos os Cartões</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/15 font-mono">
              {allCards.length}
            </span>
          </button>

          {allCards.map((c) => {
            const isCardActive = activeCardId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCardChange(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isCardActive
                    ? 'text-white shadow-md'
                    : 'bg-[#0D121F] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E293B]'
                }`}
                style={
                  isCardActive
                    ? { backgroundColor: c.color || '#6366f1' }
                    : undefined
                }
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: c.color || '#6366f1' }}
                />
                <span className="truncate max-w-[130px]">{c.name}</span>
                {c.current_invoice > 0 && (
                  <span className="text-[10px] opacity-80 tabular-nums">
                    ({formatCurrency(c.current_invoice)})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Cabeçalho do Painel de Faturas */}
      <div
        className="p-5 sm:p-6 border-b border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          backgroundImage: `linear-gradient(135deg, ${themeColor}22 0%, transparent 65%)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
            style={{ backgroundColor: themeColor }}
          >
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-[#F8FAFC]">
                {isConsolidated ? 'Faturas Consolidadas • Todos os Cartões' : `Faturas • ${activeCard?.name}`}
              </h3>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${invoiceDatesInfo.statusColor}`}
              >
                {invoiceDatesInfo.statusLabel}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {invoiceDatesInfo.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Seletor de Mês da Fatura */}
          <div className="flex items-center gap-1 bg-[#080B11] border border-[#1E293B] rounded-xl px-2 py-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-[#151D30] rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] transition cursor-pointer"
              title="Fatura anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm font-semibold text-[#F8FAFC] px-2 min-w-[125px] text-center">
              {MONTH_FULL_NAMES[selectedMonth]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-[#151D30] rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] transition cursor-pointer"
              title="Próxima fatura"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#080B11] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151D30] transition cursor-pointer"
              title="Fechar aba de faturas"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navegação por Abas de Faturas Históricas */}
      {invoicesByMonthKey.length > 1 && (
        <div className="px-5 pt-3 pb-0 border-b border-[#1E293B] bg-[#080B11]/50 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2">
            {invoicesByMonthKey.map((inv) => {
              const isSelected = inv.key === currentInvoiceKey;
              return (
                <button
                  key={inv.key}
                  onClick={() => {
                    setSelectedMonth(inv.month);
                    setSelectedYear(inv.year);
                  }}
                  className={`px-3 py-2 border-b-2 text-xs font-medium transition flex items-center gap-2 shrink-0 cursor-pointer ${
                    isSelected
                      ? 'border-[#FACC15] text-[#FACC15] font-bold'
                      : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#64748B]'
                  }`}
                >
                  <span>
                    {MONTH_SHORT_NAMES[inv.month]}/{String(inv.year).slice(-2)}
                  </span>
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      isSelected ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'
                    }`}
                  >
                    {formatCurrency(inv.total)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumo Financeiro da Fatura do Mês + Botão de Pagamento Total */}
      <div className="p-5 bg-[#080B11]/40 border-b border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 flex-1">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#94A3B8] font-semibold block">
              Total da Fatura
            </span>
            <span className="text-base sm:text-xl font-bold text-[#F8FAFC] mt-0.5 block tabular-nums">
              {formatCurrency(currentInvoice.total)}
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold block">
              Em Aberto
            </span>
            <span className="text-base sm:text-xl font-bold text-amber-300 mt-0.5 block tabular-nums">
              {formatCurrency(currentInvoice.pendingTotal)}
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold block">
              Já Pago
            </span>
            <span className="text-base sm:text-xl font-bold text-emerald-400 mt-0.5 block tabular-nums">
              {formatCurrency(currentInvoice.paidTotal)}
            </span>
          </div>

          {hasBusiness && (
            <div>
              <span className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold flex items-center gap-1">
                <Store className="w-3 h-3" />
                Gasto {businessName}
              </span>
              <span className="text-base sm:text-xl font-bold text-amber-300 mt-0.5 block tabular-nums">
                {formatCurrency(
                  currentInvoice.items
                    .filter((i) => isBusinessTransaction(i))
                    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
                )}
              </span>
            </div>
          )}
        </div>

        {/* Ação de Pagamento */}
        {currentInvoice.items.length > 0 && (
          <div className="flex items-center gap-2">
            {isConsolidated ? (
              <div className="text-xs text-[#94A3B8] bg-[#080B11] border border-[#1E293B] px-3 py-2 rounded-xl flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Selecione um cartão na barra acima para pagar sua fatura.</span>
              </div>
            ) : currentInvoice.pendingTotal > 0 ? (
              <button
                onClick={() => setPayModalOpen(true)}
                disabled={actionLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FACC15] hover:bg-[#FDE047] disabled:opacity-50 text-[#080B11] font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-[#FACC15]/10 active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                {actionLoading
                  ? 'Processando...'
                  : `Pagar Fatura (${formatCurrency(currentInvoice.pendingTotal)})`}
              </button>
            ) : (
              <button
                onClick={() => handlePayEntireInvoice(false)}
                disabled={actionLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#151D30] hover:bg-[#1E293B] disabled:opacity-50 text-[#F8FAFC] font-medium text-xs rounded-xl transition border border-[#1E293B] cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                {actionLoading ? 'Processando...' : 'Reabrir Fatura'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lista de Lançamentos da Fatura */}
      <div className="divide-y divide-[#1E293B]">
        {loading ? (
          <div className="p-10 text-center text-[#94A3B8] text-sm">
            Carregando lançamentos da fatura...
          </div>
        ) : currentInvoice.items.length === 0 ? (
          <div className="p-10 text-center text-[#94A3B8]">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
            <p className="text-sm font-medium text-[#F8FAFC]">
              Nenhuma compra nesta fatura de {MONTH_FULL_NAMES[selectedMonth]} de {selectedYear}.
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Use as abas acima ou as setas para navegar entre outras faturas.
            </p>
          </div>
        ) : (
          currentInvoice.items.map((tx) => {
            const isInstallment = (tx.total_installments || 1) > 1;
            const isRecurring = Boolean(tx.recurrence_id);

            return (
              <div
                key={tx.id}
                className={`p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-[#151D30]/40 transition ${
                  tx.is_paid ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleToggleItemPaid(tx)}
                    disabled={itemLoadingId === tx.id}
                    title={tx.is_paid ? 'Marcar como pendente' : 'Marcar item como pago'}
                    className={`mt-0.5 sm:mt-0 w-8 h-8 rounded-xl flex items-center justify-center border transition shrink-0 cursor-pointer ${
                      tx.is_paid
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-[#080B11] border-[#1E293B] text-[#64748B] hover:text-[#F8FAFC] hover:border-[#64748B]'
                    }`}
                  >
                    {tx.is_paid ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[#F8FAFC] truncate">
                        {tx.description}
                      </span>

                      {/* Tag do Cartão (Destaque em Visão Consolidada ou Multi-Cartão) */}
                      {(isConsolidated || allCards.length > 1) && tx.credit_card && (
                        <button
                          type="button"
                          onClick={() => tx.credit_card && handleCardChange(tx.credit_card.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border transition hover:opacity-80 cursor-pointer"
                          style={{
                            backgroundColor: `${tx.credit_card.color || '#6366f1'}20`,
                            borderColor: `${tx.credit_card.color || '#6366f1'}40`,
                            color: tx.credit_card.color || '#a78bfa',
                          }}
                          title={`Filtrar apenas ${tx.credit_card.name}`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: tx.credit_card.color || '#6366f1' }}
                          />
                          <span>{tx.credit_card.name}</span>
                        </button>
                      )}

                      {isBusinessTransaction(tx) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate max-w-[120px]">
                          <Store className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{hasBusiness ? businessName : 'Negócio'}</span>
                        </span>
                      )}

                      {isInstallment && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                          <Layers className="w-2.5 h-2.5" />
                          Parcela {tx.current_installment}/{tx.total_installments}
                        </span>
                      )}

                      {isRecurring && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/20">
                          <Repeat className="w-2.5 h-2.5" />
                          Fixa
                        </span>
                      )}

                      {tx.category && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#151D30] border border-[#1E293B] text-[#94A3B8]">
                          {tx.category.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#94A3B8] mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#64748B]" />
                        Compra: {formatDate(tx.transaction_date)}
                      </span>
                      <span>•</span>
                      <span>Vencimento da fatura: {formatDate(tx.due_date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span
                      className={`text-sm sm:text-base font-bold block tabular-nums ${
                        tx.is_paid ? 'text-[#64748B] line-through' : 'text-[#F8FAFC]'
                      }`}
                    >
                      {formatCurrency(tx.amount)}
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      {tx.is_paid ? 'Pago' : 'Pendente'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(tx)}
                    disabled={itemLoadingId === tx.id}
                    title="Excluir lançamento"
                    className="p-1.5 text-[#64748B] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Pagamento de Fatura (Apenas para cartão individual ativo) */}
      {activeCard && !isConsolidated && (
        <PayInvoiceModal
          isOpen={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          card={activeCard}
          month={selectedMonth}
          year={selectedYear}
          monthName={MONTH_FULL_NAMES[selectedMonth]}
          totalAmount={currentInvoice.total}
          paidAmount={currentInvoice.paidTotal}
          pendingAmount={currentInvoice.pendingTotal}
          isInvoiceOpen={invoiceDatesInfo.statusLabel === 'Fatura Aberta'}
          dueDateStr={invoiceDatesInfo.dueDateStr || ''}
          closingDateStr={invoiceDatesInfo.closingDateStr || ''}
          pendingTransactions={currentInvoice.items.filter((i) => !i.is_paid)}
          onSuccess={async () => {
            await refreshCardTransactions();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
