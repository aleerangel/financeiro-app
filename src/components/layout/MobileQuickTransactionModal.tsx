'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Tag,
  Scissors,
  User,
  CreditCard as CardIcon,
  HelpCircle,
} from 'lucide-react';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { Account, CreditCard, Category, PaymentMethod, FinancialScope } from '@/types/database';
import {
  getCachedAccounts,
  getCachedCreditCards,
  getCachedCategories,
  invalidateClientCache,
} from '@/lib/client-cache';
import { createTransaction } from '@/lib/actions/transactions';
import { isBusinessCategory } from '@/lib/business-scope-utils';
import { getTodayYMD } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export function MobileQuickTransactionModal() {
  const { newTransactionModal } = useMobileNavigation();

  if (!newTransactionModal.open) return null;

  return (
    <MobileQuickTransactionModalDialog
      key={`${newTransactionModal.type}-${newTransactionModal.scope}`}
    />
  );
}

function MobileQuickTransactionModalDialog() {
  const { newTransactionModal, setNewTransactionModal, notifyMutation } = useMobileNavigation();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form State inicializado diretamente sem cascading effect
  const [type, setType] = useState<'expense' | 'income'>(newTransactionModal.type);
  const [scope, setScope] = useState<FinancialScope>(newTransactionModal.scope);
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState<number>(1);
  const [date, setDate] = useState(getTodayYMD());
  const [isPaid, setIsPaid] = useState(newTransactionModal.type === 'income' || paymentMethod !== 'credit');
  const [submitting, setSubmitting] = useState(false);

  // Carrega contas, cartões e categorias em cache instantâneo (0ms de latência)
  useEffect(() => {
    let mounted = true;
    Promise.all([getCachedAccounts(), getCachedCreditCards(), getCachedCategories()])
      .then(([accs, cds, cats]) => {
        if (!mounted) return;
        setAccounts(accs);
        setCards(cds);
        setCategories(cats);
        if (accs.length > 0) setAccountId(accs[0].id);
        if (cds.length > 0) setCardId(cds[0].id);
      })
      .catch((err) => {
        console.error('Erro ao carregar dados do formulário:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Categorias filtradas pelo tipo e escopo
  const availableCategories = useMemo(() => {
    return categories.filter((c) => {
      if (c.type !== type) return false;
      const isBiz = isBusinessCategory(c);
      return scope === 'business' ? isBiz : !isBiz;
    });
  }, [categories, type, scope]);

  // Categoria ativa (usando a primeira se a atual for inválida, derivado sem setState)
  const activeCategoryId = useMemo(() => {
    if (availableCategories.some((c) => c.id === categoryId)) {
      return categoryId;
    }
    return availableCategories[0]?.id || '';
  }, [availableCategories, categoryId]);

  const parsedAmount = useMemo(() => {
    const val = parseFloat(amountStr.replace(',', '.'));
    return isNaN(val) || val <= 0 ? 0 : val;
  }, [amountStr]);

  const handleClose = () => {
    setNewTransactionModal({ ...newTransactionModal, open: false });
  };

  const handleSave = async (keepOpen: boolean = false) => {
    const numericAmount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Informe um valor válido maior que zero');
      return;
    }

    if (!description.trim()) {
      toast.error('Informe uma descrição breve');
      return;
    }

    const isCredit = type === 'expense' && paymentMethod === 'credit';
    if (isCredit && !cardId) {
      toast.error('Selecione um cartão de crédito cadastrado');
      return;
    }

    try {
      setSubmitting(true);

      await createTransaction({
        description: description.trim(),
        amount: numericAmount,
        type,
        scope,
        payment_method: paymentMethod,
        transaction_date: date,
        due_date: date,
        category_id: activeCategoryId || null,
        account_id: isCredit ? null : accountId || null,
        credit_card_id: isCredit ? cardId || null : null,
        total_installments: isCredit ? installments : 1,
        is_paid: isCredit ? false : isPaid,
      });

      // Notifica Dashboard e painéis imediatamente (atualização instantânea 0ms)
      notifyMutation({
        type: 'transaction',
        transaction: {
          description: description.trim(),
          amount: numericAmount,
          type,
          scope,
          payment_method: paymentMethod,
          transaction_date: date,
          due_date: date,
          category_id: activeCategoryId || null,
          account_id: isCredit ? null : accountId || null,
          credit_card_id: isCredit ? cardId || null : null,
          total_installments: isCredit ? installments : 1,
          is_paid: isCredit ? false : isPaid,
        },
      });

      invalidateClientCache(['accounts', 'cards']);

      toast.success(
        type === 'income'
          ? 'Receita lançada com sucesso!'
          : isCredit && installments > 1
          ? `Despesa parcelada em ${installments}x lançada com sucesso!`
          : 'Despesa lançada com sucesso!'
      );

      if (keepOpen) {
        setAmountStr('');
        setDescription('');
        setInstallments(1);
      } else {
        handleClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar movimentação';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isExpense = type === 'expense';
  const isCredit = isExpense && paymentMethod === 'credit';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet Container */}
      <div className="relative w-full sm:max-w-md max-h-[92vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 overflow-hidden">
        {/* Barra superior de toque */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1 bg-zinc-700/80 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              {isExpense ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span>Nova Despesa</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span>Nova Receita</span>
                </>
              )}
            </h3>
            <span className="text-[11px] text-zinc-400">
              {scope === 'business' ? 'Barbearia • PJ' : 'Finanças Pessoais'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Seletor Tipo: Despesa vs Receita */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950/60 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setIsPaid(paymentMethod !== 'credit');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                isExpense
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Despesa
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setIsPaid(true);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                !isExpense
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Receita
            </button>
          </div>

          {/* Seletor Escopo: Pessoal vs Barbearia */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Contexto:</span>
            <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setScope('personal');
                  setCategoryId('');
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                  scope === 'personal'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <User className="w-3 h-3" />
                Pessoal
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope('business');
                  setCategoryId('');
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                  scope === 'business'
                    ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Scissors className="w-3 h-3" />
                Barbearia
              </button>
            </div>
          </div>

          {/* Campo de Valor em Destaque */}
          <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 text-center">
            <span className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider block mb-1">
              Valor Total
            </span>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-bold text-zinc-400">R$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                autoFocus
                className="w-48 bg-transparent text-3xl font-extrabold text-zinc-100 text-center focus:outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Campo Descrição */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Descrição
            </label>
            <input
              type="text"
              placeholder={
                isExpense
                  ? scope === 'business'
                    ? 'Ex: Lâminas de barbear, luz'
                    : 'Ex: Almoço, mercado, combustível'
                  : scope === 'business'
                  ? 'Ex: Atendimento avulso, venda de produto'
                  : 'Ex: Salário, pix recebido'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Categoria
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
              <select
                value={activeCategoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 appearance-none"
              >
                {availableCategories.length === 0 ? (
                  <option value="">Nenhuma categoria encontrada</option>
                ) : (
                  availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Forma de Pagamento e Conta / Cartão */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Forma de Pagto
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const newMethod = e.target.value as PaymentMethod;
                  setPaymentMethod(newMethod);
                  if (newMethod === 'credit') {
                    setIsPaid(false);
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
              >
                <option value="pix">Pix</option>
                <option value="cash">Dinheiro</option>
                <option value="debit">Débito</option>
                {isExpense && <option value="credit">Cartão de Crédito</option>}
                <option value="bank_transfer">Transferência</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                {isCredit ? 'Cartão de Crédito' : 'Conta'}
              </label>
              {isCredit ? (
                <select
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  className="w-full bg-zinc-950 border border-purple-500/40 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-400"
                >
                  {cards.length === 0 ? (
                    <option value="">Nenhum cartão cadastrado</option>
                  ) : (
                    cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Vence dia {c.due_day})
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Opção de Compra Parcelada (Exibida SOMENTE quando Cartão de Crédito) */}
          {isCredit && (
            <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-2xl space-y-2 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CardIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>Condição de Pagamento</span>
                </label>
                {installments > 1 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {installments}x de {formatCurrency(parsedAmount > 0 ? parsedAmount / installments : 0)}
                  </span>
                )}
              </div>

              <select
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-zinc-950 border border-purple-500/30 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-400"
              >
                <option value={1}>1x à vista ({formatCurrency(parsedAmount)})</option>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((num) => {
                  const installmentVal = parsedAmount > 0 ? parsedAmount / num : 0;
                  return (
                    <option key={num} value={num}>
                      {num}x de {formatCurrency(installmentVal)} (Total: {formatCurrency(parsedAmount)})
                    </option>
                  );
                })}
              </select>

              {installments > 1 && (
                <div className="flex items-start gap-1.5 text-[11px] text-purple-300/80 pt-0.5">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-400" />
                  <span>
                    O sistema lançará automaticamente as <strong>{installments} parcelas</strong> nas faturas dos meses subsequentes.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Data e Status de Pagamento */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Data
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-2 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            {!isCredit && (
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                  />
                  <span>{isExpense ? 'Já foi pago' : 'Já recebido'}</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave(true)}
            className="flex-1 py-3 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl transition border border-zinc-700/60 disabled:opacity-50 text-center active:scale-95"
          >
            Salvar e Outra
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave(false)}
            className="flex-1 py-3 px-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 text-center active:scale-95"
          >
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
