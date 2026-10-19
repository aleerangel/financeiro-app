'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Recurrence, TransactionType } from '@/types/database';

export interface CreateRecurrenceInput {
  description: string;
  amount: number;
  type: TransactionType;
  category_id?: string | null;
  account_id?: string | null;
  credit_card_id?: string | null;
  due_day: number;
  frequency?: 'monthly' | 'yearly';
}

export interface UpdateRecurrenceInput {
  description?: string;
  amount?: number;
  type?: TransactionType;
  category_id?: string | null;
  account_id?: string | null;
  credit_card_id?: string | null;
  due_day?: number;
  frequency?: 'monthly' | 'yearly';
  active?: boolean;
}

export async function getRecurrences(): Promise<Recurrence[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data, error } = await supabase
    .from('recurrences')
    .select(`
      *,
      category:categories(*),
      account:accounts(*),
      credit_card:credit_cards(*)
    `)
    .eq('user_id', user.id)
    .order('due_day', { ascending: true });

  if (error) {
    console.error('Erro ao buscar recorrências:', error);
    return [];
  }

  return (data as unknown as Recurrence[]) || [];
}

/**
 * Garante que todas as despesas e receitas fixas ativas sejam geradas como
 * transações pendentes no mês/ano selecionado, caso ainda não existam.
 */
export async function syncMonthlyRecurrences(month: number, year: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  // 1. Busca todas as recorrências ativas do usuário
  const { data: recurrences, error: recError } = await supabase
    .from('recurrences')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true);

  if (recError || !recurrences || recurrences.length === 0) {
    return;
  }

  // 2. Busca as transações já geradas por recorrência nesse mês/ano
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: existingTransactions } = await supabase
    .from('transactions')
    .select('recurrence_id')
    .eq('user_id', user.id)
    .not('recurrence_id', 'is', null)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  const existingRecurrenceIds = new Set(
    (existingTransactions || []).map((t) => t.recurrence_id)
  );

  // 3. Identifica as que ainda não foram geradas neste mês
  const toInsert = recurrences.filter((rec) => !existingRecurrenceIds.has(rec.id));

  if (toInsert.length > 0) {
    const newTransactions = toInsert.map((rec) => {
      // Ajusta o dia de vencimento para o mês específico (ex: dia 31 em fevereiro)
      const validDay = Math.min(rec.due_day, lastDay);
      const dueDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
      const paymentMethod = rec.credit_card_id ? 'credit' : rec.account_id ? 'debit' : 'pix';

      return {
        user_id: user.id,
        description: rec.description,
        amount: rec.amount,
        type: rec.type,
        payment_method: paymentMethod,
        transaction_date: dueDate,
        due_date: dueDate,
        category_id: rec.category_id || null,
        account_id: rec.account_id || null,
        credit_card_id: rec.credit_card_id || null,
        recurrence_id: rec.id,
        is_paid: false,
        paid_at: null,
        notes: 'Lançamento automático de conta fixa',
      };
    });

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(newTransactions);

    if (insertError) {
      console.error('Erro ao sincronizar transações recorrentes:', insertError);
    }
  }

  // 4. Sincroniza categoria e descrição das transações deste mês caso a recorrência tenha sido editada
  for (const rec of recurrences) {
    await supabase
      .from('transactions')
      .update({
        category_id: rec.category_id || null,
        description: rec.description,
      })
      .eq('user_id', user.id)
      .eq('recurrence_id', rec.id)
      .gte('due_date', startDate)
      .lte('due_date', endDate);
  }

  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
}

export async function createRecurrence(input: CreateRecurrenceInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data, error } = await supabase
    .from('recurrences')
    .insert({
      user_id: user.id,
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      category_id: input.category_id || null,
      account_id: input.account_id || null,
      credit_card_id: input.credit_card_id || null,
      due_day: input.due_day,
      frequency: input.frequency || 'monthly',
      active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Sincroniza imediatamente com o mês atual
  const now = new Date();
  await syncMonthlyRecurrences(now.getMonth(), now.getFullYear());

  revalidatePath('/recorrencias');
  revalidatePath('/dashboard');
  return data;
}

export async function updateRecurrence(id: string, input: UpdateRecurrenceInput): Promise<Recurrence> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const updates: Record<string, unknown> = {};
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.amount !== undefined) updates.amount = input.amount;
  if (input.type !== undefined) updates.type = input.type;
  if (input.category_id !== undefined) updates.category_id = input.category_id;
  if (input.account_id !== undefined) updates.account_id = input.account_id;
  if (input.credit_card_id !== undefined) updates.credit_card_id = input.credit_card_id;
  if (input.due_day !== undefined) updates.due_day = input.due_day;
  if (input.frequency !== undefined) updates.frequency = input.frequency;
  if (input.active !== undefined) updates.active = input.active;

  const { data, error } = await supabase
    .from('recurrences')
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

  if (error) throw new Error(error.message);

  // Sincroniza lançamentos pendentes (não pagos) gerados por esta recorrência
  const txUpdates: Record<string, unknown> = {};
  if (input.description !== undefined) txUpdates.description = input.description.trim();
  if (input.amount !== undefined) txUpdates.amount = input.amount;
  if (input.type !== undefined) txUpdates.type = input.type;
  if (input.category_id !== undefined) txUpdates.category_id = input.category_id;
  if (input.account_id !== undefined) txUpdates.account_id = input.account_id;
  if (input.credit_card_id !== undefined) txUpdates.credit_card_id = input.credit_card_id;

  if (input.credit_card_id) {
    txUpdates.payment_method = 'credit';
  } else if (input.account_id) {
    txUpdates.payment_method = 'debit';
  }

  if (Object.keys(txUpdates).length > 0) {
    await supabase
      .from('transactions')
      .update(txUpdates)
      .eq('recurrence_id', id)
      .eq('user_id', user.id);
  }

  revalidatePath('/recorrencias');
  revalidatePath('/transacoes');
  revalidatePath('/dashboard');

  return data as unknown as Recurrence;
}

export async function toggleRecurrenceActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('recurrences')
    .update({ active })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/recorrencias');
  revalidatePath('/dashboard');
}

export async function deleteRecurrence(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('recurrences')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/recorrencias');
  revalidatePath('/dashboard');
}

