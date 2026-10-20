'use client';

import {
  Receipt,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard as CardIcon,
  Scissors,
} from 'lucide-react';
import { Transaction } from '@/types/database';
import { resolveTransactionCategoryInfo } from '@/lib/category-evolution-utils';
import { isBusinessTransaction } from '@/lib/business-scope-utils';
import { formatCurrency, formatDate } from '@/lib/utils';

interface CategoryTransactionsTableProps {
  type: 'income' | 'expense';
  formattedMonth: string;
  activeCategoryName?: string;
  loading: boolean;
  transactions: Transaction[];
  totalSum: number;
  searchQuery: string;
  onSearchChange: (val: string) => void;
}

export function CategoryTransactionsTable({
  type,
  formattedMonth,
  activeCategoryName,
  loading,
  transactions,
  totalSum,
  searchQuery,
  onSearchChange,
}: CategoryTransactionsTableProps) {
  const isIncome = type === 'income';

  return (
    <div className="space-y-3 pt-2 border-t border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>
              {isIncome
                ? `Todas as Receitas de ${formattedMonth}`
                : `Todas as Despesas de ${formattedMonth}`}
              {activeCategoryName ? ` • ${activeCategoryName}` : ''}
            </span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {loading ? (
              'Carregando lançamentos do mês selecionado...'
            ) : (
              <>
                {transactions.length}{' '}
                {transactions.length === 1
                  ? 'lançamento listado'
                  : 'lançamentos listados'}{' '}
                • Total:{' '}
                <strong
                  className={isIncome ? 'text-emerald-400' : 'text-rose-400'}
                >
                  {formatCurrency(totalSum)}
                </strong>
              </>
            )}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Buscar ${isIncome ? 'receita' : 'despesa'}...`}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs">
          Carregando transações de {formattedMonth}...
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs">
          Nenhuma transação encontrada para os filtros selecionados em{' '}
          {formattedMonth}.
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/80 overflow-hidden max-h-96 overflow-y-auto scrollbar-thin">
          {transactions.map((t) => {
            const isCredit = t.payment_method === 'credit';
            const catInfo = resolveTransactionCategoryInfo({
              amount: Number(t.amount),
              type,
              is_paid: t.is_paid,
              due_date: t.due_date,
              description: t.description,
              notes: t.notes,
              category: t.category,
            });

            return (
              <div
                key={t.id}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-800/40 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: isIncome
                        ? 'rgba(16, 185, 129, 0.15)'
                        : isCredit
                        ? 'rgba(168, 85, 247, 0.15)'
                        : 'rgba(244, 63, 94, 0.15)',
                      color: isIncome
                        ? '#10b981'
                        : isCredit
                        ? '#c084fc'
                        : '#fb7185',
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

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
                        {t.description}
                      </span>
                      {isBusinessTransaction(t) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
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

                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-zinc-300">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: catInfo.color }}
                        />
                        {catInfo.name}
                      </span>
                      <span>•</span>
                      <span>
                        {isCredit
                          ? t.credit_card?.name || 'Cartão'
                          : t.account?.name || 'Conta / Carteira'}
                      </span>
                      <span>•</span>
                      <span>{formatDate(t.due_date)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-xs sm:text-sm font-bold block ${
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
                    {t.is_paid
                      ? isIncome
                        ? 'Recebido'
                        : 'Pago'
                      : 'Pendente'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
