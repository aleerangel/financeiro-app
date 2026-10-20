'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Recurrence, TransactionType, FinancialScope } from '@/types/database';
import { isPastMonth, getZonedParts } from '@/lib/date-utils';
import { isRecurrenceEligible, buildDueDate } from '@/lib/recurrence-utils';
import { isBusinessRecurrence, applyScopeToNotes } from '@/lib/business-scope-utils';

export interface CreateRecurrenceInput {
  description: string;
  amount: number;
  type: TransactionType;
  category_id?: string | null;
  account_id?: string | null;
  credit_card_id?: string | null;
  due_day: number;
  frequency?: 'monthly' | 'yearly';
  scope?: FinancialScope;
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
  scope?: FinancialScope;
}

export async function getRecurrences(): Promise<Recurrence[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

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
 * Garante que as despesas e receitas fixas ativas sejam geradas como transações
 * pendentes no mês/ano informado. Idempotente: o índice único
 * (recurrence_id, due_date) no banco impede duplicatas mesmo com chamadas concorrentes.
 *
 * Regras:
 * - nunca gera em meses passados (fuso America/Sao_Paulo);
 * - só gera a partir do mês de criação da recorrência;
 * - NÃO chama revalidatePath: é executada durante o render do servidor.
 */
export async function syncMonthlyRecurrences(month: number, year: number) {
  if (isPastMonth(month, year)) return;

  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  const { data: recurrences, error: recError } = await supabase
    .from('recurrences')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('user_id', user.id)
    .eq('active', true);

  if (recError || !recurrences || recurrences.length === 0) return;

  const eligible = recurrences.filter((rec) => isRecurrenceEligible(rec, month, year));
  if (eligible.length === 0) return;

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: existing } = await supabase
    .from('transactions')
    .select('recurrence_id')
    .eq('user_id', user.id)
    .not('recurrence_id', 'is', null)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  const existingIds = new Set((existing || []).map((t) => t.recurrence_id));
  const toInsert = eligible.filter((rec) => !existingIds.has(rec.id));

  if (toInsert.length > 0) {
    const rows = toInsert.map((rec) => {
      const dueDate = buildDueDate(year, month, rec.due_day);
      const isBiz = isBusinessRecurrence(rec as unknown as Recurrence);
      const scope: FinancialScope = isBiz ? 'business' : 'personal';
      return {
        user_id: user.id,
        description: rec.description,
        amount: rec.amount,
        type: rec.type,
        payment_method: rec.credit_card_id ? 'credit' : rec.account_id ? 'debit' : 'pix',
        transaction_date: dueDate,
        due_date: dueDate,
        category_id: rec.category_id || null,
        account_id: rec.account_id || null,
        credit_card_id: rec.credit_card_id || null,
        recurrence_id: rec.id,
        is_paid: false,
        paid_at: null,
        notes: applyScopeToNotes('Lançamento automático de conta fixa', scope),
        scope,
      };
    });

    // ignoreDuplicates => ON CONFLICT DO NOTHING (corrida entre abas/dispositivos)
    let { error: insertError } = await supabase
      .from('transactions')
      .upsert(rows, { onConflict: 'recurrence_id,due_date', ignoreDuplicates: true });

    if (insertError && insertError.message?.includes('scope')) {
      const fallbackRows = rows.map(({ scope: _s, ...rest }) => {
        void _s;
        return rest;
      });
      const retry = await supabase
        .from('transactions')
        .upsert(fallbackRows, { onConflict: 'recurrence_id,due_date', ignoreDuplicates: true });
      insertError = retry.error;
    }

    if (insertError) {
      console.error('Erro ao sincronizar transações recorrentes:', insertError);
    }
  }

  // Propaga categoria/descrição editadas na recorrência para os lançamentos do mês
  for (const rec of eligible) {
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
}

export async function createRecurrence(input: CreateRecurrenceInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const baseRecRow = {
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
  };

  let { data, error } = await supabase
    .from('recurrences')
    .insert({
      ...baseRecRow,
      ...(input.scope ? { scope: input.scope } : {}),
    })
    .select()
    .single();

  if (error && input.scope && error.message?.includes('scope')) {
    const retry = await supabase
      .from('recurrences')
      .insert(baseRecRow)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw new Error(error.message);

  // Sincroniza imediatamente com o mês atual
  const today = getZonedParts();
  await syncMonthlyRecurrences(today.month, today.year);

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
  if (input.scope !== undefined) updates.scope = input.scope;

  let { data, error } = await supabase
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

  if (error && input.scope !== undefined && error.message?.includes('scope')) {
    delete updates.scope;
    const retry = await supabase
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
    data = retry.data;
    error = retry.error;
  }

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

