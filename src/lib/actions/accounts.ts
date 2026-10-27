'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Account, AccountType, AccountYieldType, FinancialScope } from '@/types/database';
import {
  resolveAccountYieldConfig,
  calculateProjectedYield,
  isYieldTransaction,
  YIELD_TAG,
} from '@/lib/account-yield-utils';
import { getOrCreateInvestimentosCategory } from '@/lib/actions/categories';
import { getZonedParts, getTodayYMD } from '@/lib/date-utils';
import { applyScopeToNotes } from '@/lib/business-scope-utils';

export interface AccountWithBalance extends Account {
  current_balance: number;
  total_yield_all_time: number;
  total_yield_current_month: number;
  estimated_monthly_yield: number;
  estimated_yearly_yield: number;
  yield_label: string | null;
}

export async function getAccounts(): Promise<AccountWithBalance[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error('Não autenticado');
  }

  // Busca as contas com seleção explícita de colunas
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, user_id, name, type, color, initial_balance, yield_type, yield_rate, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (accountsError || !accounts) {
    console.error('Erro ao buscar contas:', accountsError);
    return [];
  }

  const balanceByAccount = new Map<string, number>();
  const yieldAllTimeByAccount = new Map<string, number>();
  const yieldMonthByAccount = new Map<string, number>();

  const { year: curYear, month: curMonth } = getZonedParts();
  const curMonthPrefix = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;

  // Caminho rápido: agregação feita no banco (RPC get_account_aggregates)
  const { data: aggregates, error: aggError } = await supabase.rpc(
    'get_account_aggregates',
    { p_month_prefix: curMonthPrefix }
  );

  if (!aggError && aggregates) {
    for (const row of aggregates as Array<{
      account_id: string;
      transaction_sum: number | string;
      yield_all_time: number | string;
      yield_current_month: number | string;
    }>) {
      balanceByAccount.set(row.account_id, Number(row.transaction_sum) || 0);
      yieldAllTimeByAccount.set(row.account_id, Number(row.yield_all_time) || 0);
      yieldMonthByAccount.set(row.account_id, Number(row.yield_current_month) || 0);
    }
  } else {
    // Compatibilidade: migration ainda não aplicada -> agrega no servidor (comportamento anterior)
    if (aggError) {
      console.warn('RPC get_account_aggregates indisponível, usando cálculo local:', aggError.message);
    }

    const { data: transactions } = await supabase
      .from('transactions')
      .select('account_id, type, amount, is_paid, paid_at, description, notes, due_date, transaction_date')
      .eq('user_id', user.id)
      .eq('is_paid', true)
      .not('account_id', 'is', null);

    const todayStr = getTodayYMD();

    if (transactions) {
      for (const t of transactions) {
        if (!t.account_id) continue;
        const effectiveDate = t.paid_at
          ? t.paid_at.slice(0, 10)
          : t.due_date || t.transaction_date || '';
        if (effectiveDate && effectiveDate > todayStr) continue;

        const current = balanceByAccount.get(t.account_id) || 0;
        const amount = Number(t.amount);
        if (t.type === 'income') {
          balanceByAccount.set(t.account_id, current + amount);

          if (isYieldTransaction(t)) {
            yieldAllTimeByAccount.set(
              t.account_id,
              (yieldAllTimeByAccount.get(t.account_id) || 0) + amount
            );
            if (effectiveDate.startsWith(curMonthPrefix)) {
              yieldMonthByAccount.set(
                t.account_id,
                (yieldMonthByAccount.get(t.account_id) || 0) + amount
              );
            }
          }
        } else if (t.type === 'expense') {
          balanceByAccount.set(t.account_id, current - amount);
        }
      }
    }
  }

  return accounts.map((acc) => {
    const transactionSum = balanceByAccount.get(acc.id) || 0;
    const initial = Number(acc.initial_balance) || 0;
    const currentBalance = initial + transactionSum;

    const yieldCfg = resolveAccountYieldConfig(acc);
    const { monthlyEstimate, yearlyEstimate } = calculateProjectedYield(
      currentBalance,
      yieldCfg.effectiveMonthlyPercent
    );

    return {
      ...acc,
      yield_type: yieldCfg.yieldType,
      yield_rate: yieldCfg.yieldRate,
      current_balance: currentBalance,
      total_yield_all_time: yieldAllTimeByAccount.get(acc.id) || 0,
      total_yield_current_month: yieldMonthByAccount.get(acc.id) || 0,
      estimated_monthly_yield: monthlyEstimate,
      estimated_yearly_yield: yearlyEstimate,
      yield_label: yieldCfg.label,
    };
  });
}

export async function createAccount(formData: {
  name: string;
  type: AccountType;
  initial_balance: number;
  color?: string;
  yield_type?: AccountYieldType;
  yield_rate?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const baseRow = {
    user_id: user.id,
    name: formData.name.trim(),
    type: formData.type,
    initial_balance: formData.initial_balance,
    color: formData.color || '#3b82f6',
  };

  let { data, error } = await supabase
    .from('accounts')
    .insert({
      ...baseRow,
      ...(formData.yield_type ? { yield_type: formData.yield_type } : {}),
      ...(formData.yield_rate !== undefined ? { yield_rate: formData.yield_rate } : {}),
    })
    .select()
    .single();

  if (error && error.message?.includes('yield_')) {
    const retry = await supabase.from('accounts').insert(baseRow).select().single();
    data = retry.data;
    error = retry.error;
  }

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
    yield_type?: AccountYieldType;
    yield_rate?: number;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const baseUpdates: Record<string, unknown> = {
    name: formData.name.trim(),
    type: formData.type,
    ...(formData.initial_balance !== undefined && formData.current_balance === undefined
      ? { initial_balance: formData.initial_balance }
      : {}),
    color: formData.color,
  };

  const fullUpdates: Record<string, unknown> = {
    ...baseUpdates,
    ...(formData.yield_type !== undefined ? { yield_type: formData.yield_type } : {}),
    ...(formData.yield_rate !== undefined ? { yield_rate: formData.yield_rate } : {}),
  };

  let { error } = await supabase
    .from('accounts')
    .update(fullUpdates)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error && error.message?.includes('yield_')) {
    const retry = await supabase
      .from('accounts')
      .update(baseUpdates)
      .eq('id', id)
      .eq('user_id', user.id);
    error = retry.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  // Se o usuário informou um novo saldo atual, registra transação de ajuste na data atual
  // para preservar os saldos históricos dos meses anteriores (RN-06 / INC-06)
  if (formData.current_balance !== undefined) {
    await updateAccountBalance(id, formData.current_balance);
  } else {
    revalidatePath('/contas');
    revalidatePath('/dashboard');
  }
}

/**
 * Registra um rendimento de juros (ex: Nubank / CDI / Poupança) como uma receita paga
 * vinculada à conta e à categoria "Investimentos".
 */
export async function recordAccountYield(
  accountId: string,
  yieldAmount: number,
  options?: { scope?: FinancialScope; notes?: string }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const roundedAmount = Math.round(yieldAmount * 100) / 100;
  if (roundedAmount <= 0) {
    throw new Error('O valor do rendimento deve ser maior que zero.');
  }

  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single();

  if (accError || !account) {
    throw new Error('Conta não encontrada.');
  }

  const categoryId = await getOrCreateInvestimentosCategory(user.id);
  const todayStr = getTodayYMD();
  const scope: FinancialScope = options?.scope || 'personal';
  const rawNote = options?.notes
    ? `${YIELD_TAG} ${options.notes}`
    : `${YIELD_TAG} Rendimento de juros em conta`;
  const finalNotes = applyScopeToNotes(rawNote, scope);

  const baseTx = {
    user_id: user.id,
    description: `Rendimento: ${account.name}`,
    amount: roundedAmount,
    type: 'income',
    payment_method: 'transfer',
    transaction_date: todayStr,
    due_date: todayStr,
    category_id: categoryId,
    account_id: account.id,
    credit_card_id: null,
    installment_group_id: null,
    current_installment: 1,
    total_installments: 1,
    is_paid: true,
    paid_at: new Date().toISOString(),
    notes: finalNotes,
  };

  let { error: txError } = await supabase
    .from('transactions')
    .insert({ ...baseTx, scope });

  if (txError && txError.message?.includes('scope')) {
    const retry = await supabase.from('transactions').insert(baseTx);
    txError = retry.error;
  }

  if (txError) {
    throw new Error(txError.message);
  }

  revalidatePath('/contas');
  revalidatePath('/dashboard');
  revalidatePath('/transacoes');
}

export async function updateAccountBalance(id: string, newBalance: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('id, name, initial_balance')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (accError || !account) {
    throw new Error('Conta não encontrada.');
  }

  const todayStr = getTodayYMD();

  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount, is_paid, paid_at, due_date, transaction_date')
    .eq('user_id', user.id)
    .eq('account_id', id)
    .eq('is_paid', true);

  let transactionSum = 0;
  if (transactions) {
    for (const t of transactions) {
      const effectiveDate = t.paid_at
        ? t.paid_at.slice(0, 10)
        : t.due_date || t.transaction_date || '';
      if (effectiveDate && effectiveDate > todayStr) continue;

      const amt = Number(t.amount);
      if (t.type === 'income') transactionSum += amt;
      else if (t.type === 'expense') transactionSum -= amt;
    }
  }

  const currentBalance = Math.round(((Number(account.initial_balance) || 0) + transactionSum) * 100) / 100;
  const targetBalance = Math.round(Number(newBalance) * 100) / 100;
  const delta = Math.round((targetBalance - currentBalance) * 100) / 100;

  if (Math.abs(delta) >= 0.01) {
    const baseTx = {
      user_id: user.id,
      description: `Ajuste de Saldo: ${account.name}`,
      amount: Math.abs(delta),
      type: delta > 0 ? 'income' : 'expense',
      payment_method: 'transfer',
      transaction_date: todayStr,
      due_date: todayStr,
      category_id: null,
      account_id: id,
      credit_card_id: null,
      installment_group_id: null,
      current_installment: 1,
      total_installments: 1,
      is_paid: true,
      paid_at: new Date().toISOString(),
      notes: '[Ajuste de Saldo] Reajuste manual de saldo na data atual',
    };

    let { error: txError } = await supabase
      .from('transactions')
      .insert({ ...baseTx, scope: 'personal' });

    if (txError && txError.message?.includes('scope')) {
      const retry = await supabase.from('transactions').insert(baseTx);
      txError = retry.error;
    }

    if (txError) {
      throw new Error(txError.message);
    }
  }

  revalidatePath('/contas');
  revalidatePath('/transacoes');
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

