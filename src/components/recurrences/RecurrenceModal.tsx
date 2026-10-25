'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { X, ArrowDownRight, ArrowUpRight, User, Store } from 'lucide-react';
import { Account, CreditCard, Category, TransactionType, Recurrence, FinancialScope } from '@/types/database';
import { createRecurrence, updateRecurrence } from '@/lib/actions/recurrences';
import { isBusinessCategory, isBusinessRecurrence } from '@/lib/business-scope-utils';
import { useBusinessProfile } from '@/context/BusinessProfileContext';

interface RecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurrence?: Recurrence | null;
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
  onSuccess?: () => void;
}

export function RecurrenceModal({
  isOpen,
  onClose,
  recurrence,
  accounts,
  cards,
  categories,
  onSuccess,
}: RecurrenceModalProps) {
  if (!isOpen) return null;

  return (
    <RecurrenceModalDialog
      key={recurrence ? recurrence.id : 'new'}
      isOpen={isOpen}
      onClose={onClose}
      recurrence={recurrence}
      accounts={accounts}
      cards={cards}
      categories={categories}
      onSuccess={onSuccess}
    />
  );
}

function RecurrenceModalDialog({
  onClose,
  recurrence,
  accounts,
  cards,
  categories,
  onSuccess,
}: RecurrenceModalProps) {
  const isEditing = !!recurrence;
  const { hasBusiness, businessName } = useBusinessProfile();

  const [scope, setScope] = useState<FinancialScope>(
    hasBusiness && recurrence && isBusinessRecurrence(recurrence) ? 'business' : 'personal'
  );
  const [type, setType] = useState<TransactionType>(recurrence?.type || 'expense');
  const [description, setDescription] = useState(recurrence?.description || '');
  const [amount, setAmount] = useState(recurrence?.amount ? String(recurrence.amount) : '');
  const [dueDay, setDueDay] = useState(recurrence?.due_day || 5);
  const [categoryId, setCategoryId] = useState(recurrence?.category_id || '');
  const [payMethodType, setPayMethodType] = useState<'account' | 'card'>(
    recurrence?.credit_card_id ? 'card' : 'account'
  );
  const [accountId, setAccountId] = useState(
    recurrence?.account_id || accounts[0]?.id || ''
  );
  const [cardId, setCardId] = useState(
    recurrence?.credit_card_id || cards[0]?.id || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const list = categories.filter((c) => {
      if (type === 'income') return c.type === 'income' || c.type === 'both';
      return c.type === 'expense' || c.type === 'both';
    });
    const seen = new Set<string>();
    return list.filter((c) => {
      const key = `${c.name.trim().toLowerCase()}_${c.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [categories, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;
    if (!description.trim()) {
      setError('Informe o nome da despesa/receita fixa.');
      return;
    }
    if (parsedAmount <= 0) {
      setError('Informe um valor válido.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isEditing && recurrence) {
        await updateRecurrence(recurrence.id, {
          description: description.trim(),
          amount: parsedAmount,
          type,
          due_day: dueDay,
          category_id: categoryId || null,
          account_id: payMethodType === 'account' ? accountId || null : null,
          credit_card_id: payMethodType === 'card' ? cardId || null : null,
          scope,
        });
      } else {
        await createRecurrence({
          description: description.trim(),
          amount: parsedAmount,
          type,
          due_day: dueDay,
          category_id: categoryId || null,
          account_id: payMethodType === 'account' ? accountId || null : null,
          credit_card_id: payMethodType === 'card' ? cardId || null : null,
          scope,
        });
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar recorrência.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-zinc-100 mb-1">
          {isEditing ? 'Editar Conta Fixa' : 'Nova Conta Fixa / Recorrência'}
        </h2>
        <p className="text-xs text-zinc-400 mb-5">
          {isEditing
            ? 'Altere os dados da recorrência. Os lançamentos pendentes deste mês serão atualizados automaticamente.'
            : 'Cadastre despesas ou receitas automáticas que se repetem todo mês.'}
        </p>

        {/* Escopo: Pessoal vs Negócio (Apenas se hasBusiness for true) */}
        {hasBusiness && (
          <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 mb-3">
            <button
              type="button"
              onClick={() => setScope('personal')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
                scope === 'personal'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Pessoal
            </button>

            <button
              type="button"
              onClick={() => setScope('business')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition truncate ${
                scope === 'business'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Store className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{businessName}</span>
            </button>
          </div>
        )}

        {/* Tipo: Despesa Fixa ou Receita Fixa */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 mb-4">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
              type === 'expense'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Despesa Fixa
          </button>

          <button
            type="button"
            onClick={() => {
              setType('income');
              setPayMethodType('account');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
              type === 'income'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Receita Fixa
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nome / Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Aluguel, Internet, Salário, Netflix"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Valor (R$)</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Dia do Vencimento
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>
          </div>

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
              onChange={(e) => {
                const nextId = e.target.value;
                setCategoryId(nextId);
                const chosen = categories.find((c) => c.id === nextId);
                if (chosen && isBusinessCategory(chosen)) {
                  setScope('business');
                }
              }}
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

          {type === 'expense' && cards.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-300">Forma de Débito</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayMethodType('account')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition ${
                    payMethodType === 'account'
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                      : 'text-zinc-500 bg-zinc-950 border border-zinc-800'
                  }`}
                >
                  Conta Corrente
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethodType('card')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition ${
                    payMethodType === 'card'
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                      : 'text-zinc-500 bg-zinc-950 border border-zinc-800'
                  }`}
                >
                  Cartão de Crédito
                </button>
              </div>

              {payMethodType === 'account' ? (
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-purple-500 transition"
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

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
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-sm rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Conta Fixa' : 'Salvar Recorrência'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
