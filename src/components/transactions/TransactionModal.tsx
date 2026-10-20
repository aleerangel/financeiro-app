'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { X, ArrowDownRight, ArrowUpRight, CreditCard as CardIcon, Scissors, User } from 'lucide-react';
import { Account, CreditCard, Category, Transaction, TransactionType, PaymentMethod, FinancialScope } from '@/types/database';
import { createTransaction, updateTransaction } from '@/lib/actions/transactions';
import { formatCurrency } from '@/lib/utils';
import {
  isBusinessCategory,
  isBusinessTransaction,
  stripScopeTagFromNotes,
} from '@/lib/business-scope-utils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
  defaultScope?: FinancialScope;
  onSuccess?: () => void;
}

type TabType = 'expense' | 'income' | 'credit';

export function TransactionModal(props: TransactionModalProps) {
  if (!props.isOpen) return null;

  return (
    <TransactionModalDialog
      key={props.transaction ? props.transaction.id : `new-${props.defaultScope || 'personal'}`}
      {...props}
    />
  );
}

function TransactionModalDialog({
  onClose,
  transaction,
  accounts,
  cards,
  categories,
  defaultScope = 'personal',
  onSuccess,
}: TransactionModalProps) {
  const isEditing = !!transaction;

  const initialScope: FinancialScope = transaction
    ? isBusinessTransaction(transaction)
      ? 'business'
      : 'personal'
    : defaultScope;

  const initialTab: TabType = transaction
    ? transaction.type === 'income'
      ? 'income'
      : transaction.payment_method === 'credit'
      ? 'credit'
      : 'expense'
    : 'expense';

  const defaultBizCategory = categories.find(
    (c) => c.type === 'expense' && isBusinessCategory(c)
  );

  const [scope, setScope] = useState<FinancialScope>(initialScope);
  const [tab, setTab] = useState<TabType>(initialTab);
  const [description, setDescription] = useState(transaction?.description || '');
  const [amount, setAmount] = useState(transaction?.amount ? String(transaction.amount) : '');
  const [date, setDate] = useState(
    transaction?.due_date || transaction?.transaction_date || new Date().toISOString().split('T')[0]
  );
  const [categoryId, setCategoryId] = useState<string>(
    transaction?.category_id ||
      (initialScope === 'business' && defaultBizCategory ? defaultBizCategory.id : '')
  );
  const [accountId, setAccountId] = useState<string>(
    transaction?.account_id || accounts[0]?.id || ''
  );
  const [cardId, setCardId] = useState<string>(
    transaction?.credit_card_id || cards[0]?.id || ''
  );
  const [installments, setInstallments] = useState(transaction?.total_installments || 1);
  const [isPaid, setIsPaid] = useState(transaction ? transaction.is_paid : true);
  const [notes, setNotes] = useState(stripScopeTagFromNotes(transaction?.notes));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScopeChange = (nextScope: FinancialScope) => {
    setScope(nextScope);
    if (nextScope === 'business' && tab !== 'income' && defaultBizCategory) {
      const currentCat = categories.find((c) => c.id === categoryId);
      if (!currentCat || !isBusinessCategory(currentCat)) {
        setCategoryId(defaultBizCategory.id);
      }
    }
  };

  const handleCategoryChange = (nextCatId: string) => {
    setCategoryId(nextCatId);
    const chosen = categories.find((c) => c.id === nextCatId);
    if (chosen && isBusinessCategory(chosen)) {
      setScope('business');
    }
  };

  const filteredCategories = useMemo(() => {
    const list = categories.filter((c) => {
      if (tab === 'income') return c.type === 'income' || c.type === 'both';
      return c.type === 'expense' || c.type === 'both';
    });
    const seen = new Set<string>();
    return list.filter((c) => {
      const key = `${c.name.trim().toLowerCase()}_${c.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [categories, tab]);

  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Informe a descrição do lançamento.');
      return;
    }
    if (parsedAmount <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let txType: TransactionType = 'expense';
      let paymentMethod: PaymentMethod = 'pix';

      if (tab === 'income') {
        txType = 'income';
        paymentMethod = 'transfer';
      } else if (tab === 'credit') {
        txType = 'expense';
        paymentMethod = 'credit';
      } else {
        txType = 'expense';
        paymentMethod = 'debit';
      }

      if (isEditing && transaction) {
        await updateTransaction(transaction.id, {
          description: description.trim(),
          amount: parsedAmount,
          type: txType,
          payment_method: paymentMethod,
          transaction_date: date,
          due_date: date,
          category_id: categoryId || null,
          account_id: tab !== 'credit' ? accountId || null : null,
          credit_card_id: tab === 'credit' ? cardId || null : null,
          is_paid: tab === 'credit' ? false : isPaid,
          notes: notes.trim() || null,
          scope,
        });
      } else {
        await createTransaction({
          description: description.trim(),
          amount: parsedAmount,
          type: txType,
          payment_method: paymentMethod,
          transaction_date: date,
          due_date: date,
          category_id: categoryId || null,
          account_id: tab !== 'credit' ? accountId || null : null,
          credit_card_id: tab === 'credit' ? cardId || null : null,
          total_installments: tab === 'credit' ? installments : 1,
          is_paid: tab === 'credit' ? false : isPaid,
          notes: notes.trim() || null,
          scope,
        });
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar transação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-zinc-100 mb-3">
          {isEditing ? 'Editar Transação' : 'Nova Transação'}
        </h2>

        {/* Seletor de Escopo: Pessoal vs Barbearia (Negócio) */}
        <div className="mb-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Destino do Lançamento
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
            <button
              type="button"
              onClick={() => handleScopeChange('personal')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
                scope === 'personal'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Pessoal
            </button>

            <button
              type="button"
              onClick={() => handleScopeChange('business')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
                scope === 'business'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Barbearia (Negócio)
            </button>
          </div>
        </div>

        {/* Abas de Tipo */}
        <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 mb-5">
          <button
            type="button"
            onClick={() => setTab('expense')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              tab === 'expense'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Despesa
          </button>

          <button
            type="button"
            onClick={() => setTab('credit')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              tab === 'credit'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CardIcon className="w-3.5 h-3.5" />
            Cartão
          </button>

          <button
            type="button"
            onClick={() => setTab('income')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              tab === 'income'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Receita
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo de Valor em Destaque */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Valor (R$)</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className={`w-full text-2xl sm:text-3xl font-extrabold px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 focus:outline-none transition ${
                tab === 'income'
                  ? 'text-emerald-400 focus:border-emerald-500'
                  : tab === 'credit'
                  ? 'text-purple-300 focus:border-purple-500'
                  : 'text-rose-400 focus:border-rose-500'
              }`}
              required
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Supermercado, Almoço, Salário"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Data da Compra */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>

            {/* Categoria */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-zinc-300">Categoria</label>
                <Link
                  href="/categorias"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Gerenciar
                </Link>
              </div>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="">Selecione...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {isBusinessCategory(c) ? `✂️ ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seletor de Conta ou Cartão de Crédito */}
          {tab === 'credit' ? (
            <div className="space-y-3 p-4 bg-purple-950/20 border border-purple-900/40 rounded-2xl">
              <div>
                <label className="block text-xs font-medium text-purple-200 mb-1.5">
                  Cartão de Crédito
                </label>
                <select
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-purple-500 transition"
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Vence dia {c.due_day})
                    </option>
                  ))}
                </select>
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-xs font-medium text-purple-200 mb-1.5">
                    Número de Parcelas
                  </label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-purple-500 transition"
                  >
                    <option value={1}>1x à vista ({formatCurrency(parsedAmount)})</option>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((num) => (
                      <option key={num} value={num}>
                        {num}x de {formatCurrency(parsedAmount > 0 ? parsedAmount / num : 0)}
                      </option>
                    ))}
                  </select>
                  {installments > 1 && (
                    <p className="text-[11px] text-purple-300/80 mt-1.5">
                      💡 O sistema gerará automaticamente as {installments} parcelas nos meses subsequentes.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Conta</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Status</label>
                <select
                  value={isPaid ? 'true' : 'false'}
                  onChange={(e) => setIsPaid(e.target.value === 'true')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="true">{tab === 'income' ? 'Recebido' : 'Pago'}</option>
                  <option value="false">{tab === 'income' ? 'A Receber' : 'Pendente'}</option>
                </select>
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Observações (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comentários adicionais..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 font-semibold text-sm rounded-xl transition disabled:opacity-50 text-zinc-950 ${
                tab === 'income'
                  ? 'bg-emerald-400 hover:bg-emerald-500'
                  : tab === 'credit'
                  ? 'bg-purple-400 hover:bg-purple-500'
                  : 'bg-rose-400 hover:bg-rose-500'
              }`}
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Transação' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
