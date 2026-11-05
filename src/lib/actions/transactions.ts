'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Transaction, TransactionType, PaymentMethod, FinancialScope } from '@/types/database';
import { calculateInstallmentDueDates, parseAdvancePaymentMetadata } from '@/lib/credit-card-utils';
import { getZonedParts, getTodayYMD, getZonedRangeBoundsIso, getZonedYMD, isCurrentMonth } from '@/lib/date-utils';
import { applyScopeToNotes } from '@/lib/business-scope-utils';
import { fetchAllPages } from '@/lib/supabase/pagination';

export interface CreateTransactionInput {
  description: string;
  amount: number;
  type: TransactionType;
  payment_method: PaymentMethod;
  transaction_date: string;
  due_date?: string;
  category_id?: string | null;
  account_id?: string | null;
  credit_card_id?: string | null;
  total_installments?: number;
  is_paid?: boolean;
  notes?: string | null;
  scope?: FinancialScope;
}

export interface UpdateTransactionInput {
  description?: string;
  amount?: number;
  type?: TransactionType;
  payment_method?: PaymentMethod;
  transaction_date?: string;
  due_date?: string;
  category_id?: string | null;
  account_id?: string | null;
  credit_card_id?: string | null;
  is_paid?: boolean;
  notes?: string | null;
  scope?: FinancialScope;
}

export async function getTransactions(month: number, year: number): Promise<Transaction[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error('Não autenticado');
  }

  // Primeiro e último dia do mês selecionado
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const { startIso, endIso } = getZonedRangeBoundsIso(startDate, endDate);

  // Busca em Regime de Caixa:
  // - Se paga: data efetiva do pagamento (paid_at) no mês selecionado (ou fallback due_date se paid_at for null)
  // - Se pendente no mês atual: inclui também pendências de meses anteriores ainda não quitadas
  // - Se pendente em mês passado: restringe às pendências que venceram naquele mês
  const isCurrent = isCurrentMonth(month, year);
  const pendingClause = isCurrent
    ? `and(is_paid.eq.false,due_date.gte.${year - 1}-01-01,due_date.lte.${endDate})`
    : `and(is_paid.eq.false,due_date.gte.${startDate},due_date.lte.${endDate})`;

  const { data, error } = await fetchAllPages<Transaction>((from, to) =>
    supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*),
        account:accounts(*),
        credit_card:credit_cards(*)
      `)
      .eq('user_id', user.id)
      .or(
        `and(is_paid.eq.true,paid_at.gte.${startIso},paid_at.lte.${endIso}),and(is_paid.eq.true,paid_at.is.null,due_date.gte.${startDate},due_date.lte.${endDate}),${pendingClause}`
      )
      .order('due_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to) as unknown as PromiseLike<{ data: Transaction[] | null; error: { message: string } | null }>
  );

  if (error) {
    console.error('Erro ao buscar transações:', error);
    return [];
  }

  const txList = (data || []).sort((a, b) => {
    const dateA = a.is_paid && a.paid_at ? getZonedYMD(a.paid_at) : (a.due_date || a.transaction_date || '');
    const dateB = b.is_paid && b.paid_at ? getZonedYMD(b.paid_at) : (b.due_date || b.transaction_date || '');
    return dateB.localeCompare(dateA);
  });

  return txList;
}

export async function createTransaction(input: CreateTransactionInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const totalInstallments = input.total_installments && input.total_installments > 1
    ? input.total_installments
    : 1;

  // Caso seja Cartão de Crédito e tenha parcelas
  if (input.payment_method === 'credit' && input.credit_card_id) {
    // Busca os dados do cartão para pegar os dias de fechamento e vencimento
    const { data: card, error: cardError } = await supabase
      .from('credit_cards')
      .select('closing_day, due_day')
      .eq('id', input.credit_card_id)
      .eq('user_id', user.id)
      .single();

    if (cardError || !card) {
      throw new Error('Cartão de crédito selecionado não encontrado.');
    }

    const dueDates = calculateInstallmentDueDates(
      input.transaction_date,
      card.closing_day,
      card.due_day,
      totalInstallments
    );

    const installmentGroupId = totalInstallments > 1 ? crypto.randomUUID() : null;
    const baseInstallmentAmount = Math.round((input.amount / totalInstallments) * 100) / 100;
    const firstInstallmentAmount =
      totalInstallments > 1
        ? Math.round((input.amount - baseInstallmentAmount * (totalInstallments - 1)) * 100) / 100
        : Math.round(input.amount * 100) / 100;
    const scope: FinancialScope = input.scope || 'personal';
    const taggedNotes = applyScopeToNotes(input.notes, scope);

    const transactionsToInsert = dueDates.map((dueDate, index) => {
      const currentNumber = index + 1;
      const desc = totalInstallments > 1
        ? `${input.description.trim()} (${currentNumber}/${totalInstallments})`
        : input.description.trim();

      return {
        user_id: user.id,
        description: desc,
        amount: index === 0 ? firstInstallmentAmount : baseInstallmentAmount,
        type: 'expense',
        payment_method: 'credit',
        transaction_date: input.transaction_date,
        due_date: dueDate,
        category_id: input.category_id || null,
        account_id: null,
        credit_card_id: input.credit_card_id,
        installment_group_id: installmentGroupId,
        current_installment: currentNumber,
        total_installments: totalInstallments,
        is_paid: false,
        paid_at: null,
        notes: taggedNotes,
        scope,
      };
    });

    let { error: insertError } = await supabase
      .from('transactions')
      .insert(transactionsToInsert);

    if (insertError && insertError.message?.includes('scope')) {
      const fallbackRows = transactionsToInsert.map(({ scope: _s, ...rest }) => {
        void _s;
        return rest;
      });
      const retry = await supabase.from('transactions').insert(fallbackRows);
      insertError = retry.error;
    }

    if (insertError) throw new Error(insertError.message);
  } else {
    // Transação comum (Receita, Pix, Débito, Dinheiro)
    const dueDate = input.due_date || input.transaction_date;
    const todayStr = getTodayYMD();
    // Lançamentos com data futura nascem como Pendente (is_paid = false) por padrão (RN-06 / INC-06)
    const isPaid = input.is_paid !== undefined ? input.is_paid : dueDate <= todayStr;
    const scope: FinancialScope = input.scope || 'personal';
    const taggedNotes = applyScopeToNotes(input.notes, scope);

    const baseRow = {
      user_id: user.id,
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      payment_method: input.payment_method,
      transaction_date: input.transaction_date,
      due_date: dueDate,
      category_id: input.category_id || null,
      account_id: input.account_id || null,
      credit_card_id: null,
      installment_group_id: null,
      current_installment: 1,
      total_installments: 1,
      is_paid: isPaid,
      paid_at: isPaid ? new Date().toISOString() : null,
      notes: taggedNotes,
    };

    let { error: insertError } = await supabase
      .from('transactions')
      .insert({ ...baseRow, scope });

    if (insertError && insertError.message?.includes('scope')) {
      const retry = await supabase.from('transactions').insert(baseRow);
      insertError = retry.error;
    }

    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
  revalidatePath('/contas');
  revalidatePath('/cartoes');
}

export async function updateTransaction(id: string, input: UpdateTransactionInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const updates: Record<string, unknown> = {};
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.amount !== undefined) updates.amount = input.amount;
  if (input.type !== undefined) updates.type = input.type;
  if (input.payment_method !== undefined) updates.payment_method = input.payment_method;
  if (input.transaction_date !== undefined) updates.transaction_date = input.transaction_date;
  if (input.due_date !== undefined) updates.due_date = input.due_date;
  if (input.category_id !== undefined) updates.category_id = input.category_id;
  if (input.account_id !== undefined) updates.account_id = input.account_id;
  if (input.credit_card_id !== undefined) updates.credit_card_id = input.credit_card_id;
  if (input.is_paid !== undefined) {
    updates.is_paid = input.is_paid;
    updates.paid_at = input.is_paid ? new Date().toISOString() : null;
  }
  if (input.notes !== undefined) {
    // Preserva tag de vínculo com adiantamento parcial caso a transação seja editada
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('notes')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    let finalNotes = input.notes || '';
    const match = existingTx?.notes?.match(/\[ADVANCE_PARTIAL_PAYMENT:(\{.*?\})\]/);
    if (match && !finalNotes.includes(match[0])) {
      finalNotes = finalNotes ? `${finalNotes}\n${match[0]}` : match[0];
    }
    updates.notes = applyScopeToNotes(finalNotes, input.scope || 'personal');
  } else if (input.scope !== undefined) {
    updates.notes = applyScopeToNotes(undefined, input.scope);
  }
  if (input.scope !== undefined) {
    updates.scope = input.scope;
  }

  let { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(`
      *,
      category:categories(*),
      account:accounts(*),
      credit_card:credit_cards(*)
    `)
    .single();

  if (error && input.scope !== undefined && error.message?.includes('scope')) {
    delete updates.scope;
    const retry = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        category:categories(*),
        account:accounts(*),
        credit_card:credit_cards(*)
      `)
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw new Error(error.message);

  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
  revalidatePath('/contas');
  revalidatePath('/cartoes');

  return data;
}

export async function toggleTransactionPaid(id: string, is_paid: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const updatePayload: Record<string, unknown> = {
    is_paid,
    paid_at: is_paid ? new Date().toISOString() : null,
  };

  if (!is_paid) {
    // Se for compra de cartão desmarcada como paga, remove vínculo com conta pagadora
    const { data: current } = await supabase
      .from('transactions')
      .select('credit_card_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (current?.credit_card_id) {
      updatePayload.account_id = null;
    }
  } else {
    // Se for compra de cartão marcada como paga sem conta vinculada, vincula à conta bancária padrão
    const { data: current } = await supabase
      .from('transactions')
      .select('credit_card_id, account_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (current?.credit_card_id && !current.account_id) {
      const { data: defaultAcc } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (defaultAcc) {
        updatePayload.account_id = defaultAcc.id;
      }
    }
  }

  const { error } = await supabase
    .from('transactions')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
  revalidatePath('/contas');
  revalidatePath('/cartoes');
}

export async function deleteTransaction(id: string, deleteEntireGroup: boolean = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  // 1. Busca dados da transação antes de excluir para verificar se é adiantamento parcial ou grupo de parcelas
  const { data: current } = await supabase
    .from('transactions')
    .select('id, amount, notes, installment_group_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  // 2. Se for um adiantamento parcial de fatura, restaura o valor na transação de origem
  if (current?.notes) {
    const meta = parseAdvancePaymentMetadata(current.notes);
    if (meta?.parent_transaction_id && meta.abated_amount > 0) {
      try {
        const { data: parentTx } = await supabase
          .from('transactions')
          .select('id, amount, is_paid')
          .eq('id', meta.parent_transaction_id)
          .eq('user_id', user.id)
          .single();

        if (parentTx) {
          const restoredAmount = Math.round((Number(parentTx.amount) + Number(meta.abated_amount)) * 100) / 100;
          await supabase
            .from('transactions')
            .update({
              amount: restoredAmount,
              is_paid: false,
            })
            .eq('id', parentTx.id)
            .eq('user_id', user.id);
        }
      } catch (restoreErr) {
        console.error('Erro ao restaurar valor original da compra ao excluir adiantamento:', restoreErr);
      }
    }
  }

  // 3. Exclui a transação (ou o grupo inteiro se solicitado e existente)
  if (deleteEntireGroup && current?.installment_group_id) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('installment_group_id', current.installment_group_id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
  }

  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
  revalidatePath('/contas');
  revalidatePath('/cartoes');
}

export async function getUpcomingAndOverdueBills(daysAhead: number = 3): Promise<Transaction[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  const today = getZonedParts();
  const targetDate = new Date(today.year, today.month, today.day + daysAhead);
  const maxDueDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories(*),
      account:accounts(*),
      credit_card:credit_cards(*)
    `)
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .eq('is_paid', false)
    .lte('due_date', maxDueDate)
    .order('due_date', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Erro ao buscar contas a vencer:', error);
    return [];
  }

  return (data as unknown as Transaction[]) || [];
}

export async function getPendingIncomeReceipts(): Promise<Transaction[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  const todayStr = getTodayYMD();

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories(*),
      account:accounts(*),
      credit_card:credit_cards(*)
    `)
    .eq('user_id', user.id)
    .eq('type', 'income')
    .eq('is_paid', false)
    .lte('due_date', todayStr)
    .order('due_date', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Erro ao buscar recebimentos pendentes:', error);
    return [];
  }

  return (data as unknown as Transaction[]) || [];
}

