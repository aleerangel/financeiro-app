'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Account, AccountType } from '@/types/database';

export interface AccountWithBalance extends Account {
  current_balance: number;
}

export async function getAccounts(): Promise<AccountWithBalance[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Não autenticado');
  }

  // Busca as contas
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (accountsError || !accounts) {
    console.error('Erro ao buscar contas:', accountsError);
    return [];
  }

  // Busca as transações pagas dessas contas para calcular o saldo real atual
  const { data: transactions } = await supabase
    .from('transactions')
    .select('account_id, type, amount, is_paid')
    .eq('user_id', user.id)
    .eq('is_paid', true)
    .not('account_id', 'is', null);

  const balanceByAccount = new Map<string, number>();

  if (transactions) {
    for (const t of transactions) {
      if (!t.account_id) continue;
      const current = balanceByAccount.get(t.account_id) || 0;
      const amount = Number(t.amount);
      if (t.type === 'income') {
        balanceByAccount.set(t.account_id, current + amount);
      } else if (t.type === 'expense') {
        balanceByAccount.set(t.account_id, current - amount);
      }
    }
  }

  return accounts.map((acc) => {
    const transactionSum = balanceByAccount.get(acc.id) || 0;
    const initial = Number(acc.initial_balance) || 0;
    return {
      ...acc,
      current_balance: initial + transactionSum,
    };
  });
}

export async function createAccount(formData: {
  name: string;
  type: AccountType;
  initial_balance: number;
  color?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      name: formData.name.trim(),
      type: formData.type,
      initial_balance: formData.initial_balance,
      color: formData.color || '#3b82f6',
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/contas');
  revalidatePath('/dashboard');
  return data;
}

export async function updateAccount(
  id: string,
  formData: {
    name: string;
    type: AccountType;
    initial_balance?: number;
    current_balance?: number;
    color?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  let initialBalanceToSave = formData.initial_balance;

  // Se o usuário informou o saldo atual diretamente, calcula o initial_balance proporcional
  if (formData.current_balance !== undefined) {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('type, amount, is_paid')
      .eq('user_id', user.id)
      .eq('account_id', id)
      .eq('is_paid', true);

    let transactionSum = 0;
    if (transactions) {
      for (const t of transactions) {
        const amt = Number(t.amount);
        if (t.type === 'income') transactionSum += amt;
        else if (t.type === 'expense') transactionSum -= amt;
      }
    }

    initialBalanceToSave = formData.current_balance - transactionSum;
  }

  const { error } = await supabase
    .from('accounts')
    .update({
      name: formData.name.trim(),
      type: formData.type,
      ...(initialBalanceToSave !== undefined ? { initial_balance: initialBalanceToSave } : {}),
      color: formData.color,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/contas');
  revalidatePath('/dashboard');
}

export async function updateAccountBalance(id: string, newBalance: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount, is_paid')
    .eq('user_id', user.id)
    .eq('account_id', id)
    .eq('is_paid', true);

  let transactionSum = 0;
  if (transactions) {
    for (const t of transactions) {
      const amt = Number(t.amount);
      if (t.type === 'income') transactionSum += amt;
      else if (t.type === 'expense') transactionSum -= amt;
    }
  }

  const newInitialBalance = newBalance - transactionSum;

  const { error } = await supabase
    .from('accounts')
    .update({
      initial_balance: newInitialBalance,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/contas');
  revalidatePath('/dashboard');
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/contas');
  revalidatePath('/dashboard');
}

