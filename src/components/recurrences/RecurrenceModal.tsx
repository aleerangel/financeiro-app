'use client';

import { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Account, CreditCard, Category, TransactionType } from '@/types/database';
import { createRecurrence } from '@/lib/actions/recurrences';

interface RecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
  onSuccess?: () => void;
}

export function RecurrenceModal({
  isOpen,
  onClose,
  accounts,
  cards,
  categories,
  onSuccess,
}: RecurrenceModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState(5);
  const [categoryId, setCategoryId] = useState('');
  const [payMethodType, setPayMethodType] = useState<'account' | 'card'>('account');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [cardId, setCardId] = useState(cards[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => {
    if (type === 'income') return c.type === 'income' || c.type === 'both';
    return c.type === 'expense' || c.type === 'both';
  });

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

      await createRecurrence({
        description,
        amount: parsedAmount,
        type,
        due_day: dueDay,
        category_id: categoryId || null,
        account_id: payMethodType === 'account' ? accountId || null : null,
        credit_card_id: payMethodType === 'card' ? cardId || null : null,
      });

      setDescription('');
      setAmount('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar recorrência.');
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

        <h2 className="text-lg font-bold text-zinc-100 mb-1">Nova Conta Fixa / Recorrência</h2>
        <p className="text-xs text-zinc-400 mb-5">
          Cadastre despesas ou receitas automáticas que se repetem todo mês.
        </p>

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
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Aluguel, Salário, Netflix, Internet"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Dia do Mês</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">Selecione...</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
              {loading ? 'Salvando...' : 'Salvar Recorrência'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
