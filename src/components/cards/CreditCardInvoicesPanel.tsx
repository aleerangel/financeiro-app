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
  AlertTriangle,
  Sparkles,
  Repeat,
  Layers,
  Scissors,
} from 'lucide-react';
import { Transaction } from '@/types/database';
import { isBusinessTransaction } from '@/lib/business-scope-utils';
import {
  CreditCardWithUsage,
  getCreditCardTransactions,
  setCreditCardInvoicePaid,
} from '@/lib/actions/credit-cards';
import { toggleTransactionPaid, deleteTransaction } from '@/lib/actions/transactions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDateContext } from '@/context/DateContext';
import { useRouter } from 'next/navigation';

interface CreditCardInvoicesPanelProps {
  card: CreditCardWithUsage;
  onClose: () => void;
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
  card,
  onClose,
}: CreditCardInvoicesPanelProps) {
  const router = useRouter();
  const { month: globalMonth, year: globalYear } = useDateContext();

  const [selectedMonth, setSelectedMonth] = useState<number>(globalMonth);
  const [selectedYear, setSelectedYear] = useState<number>(globalYear);
  const [prevGlobalKey, setPrevGlobalKey] = useState<string>(`${globalYear}-${globalMonth}`);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [itemLoadingId, setItemLoadingId] = useState<string | null>(null);

  const currentGlobalKey = `${globalYear}-${globalMonth}`;
  if (prevGlobalKey !== currentGlobalKey) {
    setPrevGlobalKey(currentGlobalKey);
    setSelectedMonth(globalMonth);
    setSelectedYear(globalYear);
  }

  const refreshCardTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCreditCardTransactions(card.id);
      setTransactions(data);
    } catch (err) {
      console.error('Erro ao carregar faturas do cartão:', err);
    } finally {
      setLoading(false);
    }
  }, [card.id]);

  useEffect(() => {
    let active = true;
    getCreditCardTransactions(card.id)
      .then((data) => {
        if (active) {
          setTransactions(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar faturas do cartão:', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [card.id]);

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

  // Calcula datas exatas de fechamento e vencimento da fatura selecionada
  const invoiceDatesInfo = useMemo(() => {
    const daysInDueMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const finalDueDay = Math.min(card.due_day, daysInDueMonth);
    const dueDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(finalDueDay).padStart(2, '0')}`;

    let closingMonth = selectedMonth;
    let closingYear = selectedYear;
    if (card.due_day < card.closing_day) {
      closingMonth -= 1;
      if (closingMonth < 0) {
        closingMonth = 11;
        closingYear -= 1;
      }
    }
    const daysInClosingMonth = new Date(closingYear, closingMonth + 1, 0).getDate();
    const finalClosingDay = Math.min(card.closing_day, daysInClosingMonth);
    const closingDateStr = `${closingYear}-${String(closingMonth + 1).padStart(2, '0')}-${String(finalClosingDay).padStart(2, '0')}`;

    const todayStr = new Date().toISOString().split('T')[0];

    let statusLabel = 'Sem lançamentos';
    let statusColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';

    if (currentInvoice.items.length > 0) {
      if (currentInvoice.pendingTotal <= 0) {
        statusLabel = 'Fatura Paga';
        statusColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      } else if (todayStr > dueDateStr) {
        statusLabel = 'Fatura Vencida';
        statusColor = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      } else if (todayStr >= closingDateStr) {
        statusLabel = 'Fatura Fechada';
        statusColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      } else {
        statusLabel = 'Fatura Aberta';
        statusColor = 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      }
    }

    return {
      dueDateStr,
      closingDateStr,
      statusLabel,
      statusColor,
    };
  }, [card.closing_day, card.due_day, selectedMonth, selectedYear, currentInvoice]);

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
    try {
      setActionLoading(true);
      await setCreditCardInvoicePaid(card.id, selectedMonth, selectedYear, markAsPaid);
      await refreshCardTransactions();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar fatura.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleItemPaid = async (tx: Transaction) => {
    try {
      setItemLoadingId(tx.id);
      await toggleTransactionPaid(tx.id, !tx.is_paid);
      await refreshCardTransactions();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar lançamento.');
    } finally {
      setItemLoadingId(null);
    }
  };

  const handleDeleteItem = async (tx: Transaction) => {
    let deleteEntireGroup = false;

    if (tx.installment_group_id && tx.total_installments && tx.total_installments > 1) {
      deleteEntireGroup = confirm(
        `Esta compra é parcelada em ${tx.total_installments}x.\n\n` +
          `Clique em OK para excluir TODAS as parcelas desta compra.\n` +
          `Clique em CANCELAR para excluir SOMENTE a parcela desta fatura.`
      );
    } else {
      if (!confirm(`Deseja excluir "${tx.description}" desta fatura?`)) {
        return;
      }
    }

    try {
      setItemLoadingId(tx.id);
      await deleteTransaction(tx.id, deleteEntireGroup);
      await refreshCardTransactions();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir compra.');
    } finally {
      setItemLoadingId(null);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Cabeçalho do Painel de Faturas */}
      <div
        className="p-5 sm:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          backgroundImage: `linear-gradient(135deg, ${card.color || '#8b5cf6'}22 0%, transparent 65%)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
            style={{ backgroundColor: card.color || '#8b5cf6' }}
          >
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-zinc-100">
                Faturas • {card.name}
              </h3>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${invoiceDatesInfo.statusColor}`}
              >
                {invoiceDatesInfo.statusLabel}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Fechamento em {formatDate(invoiceDatesInfo.closingDateStr)} • Vencimento em{' '}
              <strong className="text-zinc-200">{formatDate(invoiceDatesInfo.dueDateStr)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Seletor de Mês da Fatura */}
          <div className="flex items-center gap-1 bg-zinc-950/90 border border-zinc-800 rounded-xl px-2 py-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition"
              title="Fatura anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm font-semibold text-zinc-100 px-2 min-w-[125px] text-center">
              {MONTH_FULL_NAMES[selectedMonth]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition"
              title="Próxima fatura"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            title="Fechar aba de faturas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Abas Rápidas de Meses com Faturas */}
      {invoicesByMonthKey.length > 0 && (
        <div className="px-5 pt-4 pb-2 border-b border-zinc-800/70 bg-zinc-950/40 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max pb-1">
            {invoicesByMonthKey.map((inv) => {
              const isSelected =
                inv.month === selectedMonth && inv.year === selectedYear;
              const isAllPaid = inv.items.length > 0 && inv.pendingTotal <= 0;

              return (
                <button
                  key={inv.key}
                  onClick={() => {
                    setSelectedMonth(inv.month);
                    setSelectedYear(inv.year);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-left border transition flex flex-col gap-0.5 min-w-[105px] ${
                    isSelected
                      ? 'bg-zinc-800 border-emerald-500/50 text-zinc-100 shadow-sm'
                      : 'bg-zinc-900/70 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {MONTH_SHORT_NAMES[inv.month]}/{String(inv.year).slice(-2)}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        inv.items.length === 0
                          ? 'bg-zinc-600'
                          : isAllPaid
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-zinc-100' : 'text-zinc-300'
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
      <div className="p-5 bg-zinc-950/30 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 flex-1">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block">
              Total da Fatura
            </span>
            <span className="text-base sm:text-xl font-bold text-zinc-100 mt-0.5 block">
              {formatCurrency(currentInvoice.total)}
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold block">
              Em Aberto
            </span>
            <span className="text-base sm:text-xl font-bold text-amber-300 mt-0.5 block">
              {formatCurrency(currentInvoice.pendingTotal)}
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold block">
              Já Pago
            </span>
            <span className="text-base sm:text-xl font-bold text-emerald-400 mt-0.5 block">
              {formatCurrency(currentInvoice.paidTotal)}
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold flex items-center gap-1">
              <Scissors className="w-3 h-3" />
              Gasto Barbearia
            </span>
            <span className="text-base sm:text-xl font-bold text-amber-300 mt-0.5 block">
              {formatCurrency(
                currentInvoice.items
                  .filter((i) => isBusinessTransaction(i))
                  .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
              )}
            </span>
          </div>
        </div>

        {currentInvoice.items.length > 0 && (
          <div className="flex items-center gap-2">
            {currentInvoice.pendingTotal > 0 ? (
              <button
                onClick={() => handlePayEntireInvoice(true)}
                disabled={actionLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-zinc-950 font-semibold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/10"
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
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-medium text-xs rounded-xl transition border border-zinc-700"
              >
                <Clock className="w-3.5 h-3.5" />
                {actionLoading ? 'Processando...' : 'Reabrir Fatura'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lista de Lançamentos da Fatura */}
      <div className="divide-y divide-zinc-800/60">
        {loading ? (
          <div className="p-10 text-center text-zinc-500 text-sm">
            Carregando lançamentos da fatura...
          </div>
        ) : currentInvoice.items.length === 0 ? (
          <div className="p-10 text-center text-zinc-500">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
            <p className="text-sm font-medium text-zinc-300">
              Nenhuma compra nesta fatura de {MONTH_FULL_NAMES[selectedMonth]} de {selectedYear}.
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Use as abas acima ou as setas para navegar entre outras faturas deste cartão.
            </p>
          </div>
        ) : (
          currentInvoice.items.map((tx) => {
            const isInstallment = (tx.total_installments || 1) > 1;
            const isRecurring = Boolean(tx.recurrence_id);

            return (
              <div
                key={tx.id}
                className={`p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-zinc-800/30 transition ${
                  tx.is_paid ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleToggleItemPaid(tx)}
                    disabled={itemLoadingId === tx.id}
                    title={tx.is_paid ? 'Marcar como pendente' : 'Marcar item como pago'}
                    className={`mt-0.5 sm:mt-0 w-8 h-8 rounded-xl flex items-center justify-center border transition shrink-0 ${
                      tx.is_paid
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
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
                      <span className="font-semibold text-sm text-zinc-100 truncate">
                        {tx.description}
                      </span>

                      {isBusinessTransaction(tx) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Scissors className="w-2.5 h-2.5" />
                          Barbearia
                        </span>
                      )}

                      {isInstallment && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/20">
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
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
                          style={{
                            backgroundColor: `${tx.category.color}15`,
                            borderColor: `${tx.category.color}35`,
                            color: tx.category.color,
                          }}
                        >
                          {tx.category.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        Compra: {formatDate(tx.transaction_date)}
                      </span>
                      <span>•</span>
                      <span>Vence: {formatDate(tx.due_date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-sm sm:text-base font-bold block ${
                        tx.is_paid ? 'text-emerald-400 line-through' : 'text-zinc-100'
                      }`}
                    >
                      {formatCurrency(Number(tx.amount))}
                    </span>
                    <span
                      className={`text-[10px] font-medium ${
                        tx.is_paid ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {tx.is_paid ? 'Pago' : 'Na fatura'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(tx)}
                    disabled={itemLoadingId === tx.id}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition"
                    title="Excluir lançamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rodapé informativo */}
      { invoiceDatesInfo.statusLabel === 'Fatura Vencida' && (
        <div className="px-5 py-3 bg-rose-950/30 border-t border-rose-900/40 flex items-center gap-2 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            Esta fatura venceu em {formatDate(invoiceDatesInfo.dueDateStr)} e ainda possui{' '}
            <strong>{formatCurrency(currentInvoice.pendingTotal)}</strong> em aberto.
          </span>
        </div>
      )}
    </div>
  );
}
