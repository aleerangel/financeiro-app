'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Transaction, TransactionType, PaymentMethod } from '@/types/database';
import { calculateInstallmentDueDates } from '@/lib/credit-card-utils';

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
}

export async function getTransactions(month: number, year: number): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Não autenticado');
  }

  // Primeiro e último dia do mês selecionado
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories(*),
      account:accounts(*),
      credit_card:credit_cards(*)
    `)
    .eq('user_id', user.id)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar transações:', error);
    return [];
  }

  return (data as unknown as Transaction[]) || [];
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
    const installmentAmount = Math.round((input.amount / totalInstallments) * 100) / 100;

    const transactionsToInsert = dueDates.map((dueDate, index) => {
      const currentNumber = index + 1;
      const desc = totalInstallments > 1
        ? `${input.description.trim()} (${currentNumber}/${totalInstallments})`
        : input.description.trim();

      return {
        user_id: user.id,
        description: desc,
        amount: installmentAmount,
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
        notes: input.notes || null,
      };
    });

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(transactionsToInsert);

    if (insertError) throw new Error(insertError.message);
  } else {
    // Transação comum (Receita, Pix, Débito, Dinheiro)
    const dueDate = input.due_date || input.transaction_date;
    const isPaid = input.is_paid ?? true;

    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
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
        notes: input.notes || null,
      });

    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
  revalidatePath('/contas');
  revalidatePath('/cartoes');
}

export async function toggleTransactionPaid(id: string, is_paid: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('transactions')
    .update({
      is_paid,
      paid_at: is_paid ? new Date().toISOString() : null,
    })
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

  if (deleteEntireGroup) {
    // Busca o installment_group_id da transação antes de deletar
    const { data: current } = await supabase
      .from('transactions')
      .select('installment_group_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (current?.installment_group_id) {
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
