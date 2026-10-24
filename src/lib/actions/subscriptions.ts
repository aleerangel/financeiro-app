'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  SubscriptionPlan,
  ClientSubscription,
  SubscriptionInvoice,
  SubscriptionStatus,
  InvoiceStatus,
} from '@/types/database';
import { getTodayYMD } from '@/lib/date-utils';
import { getOrCreateBarbeariaCategory } from '@/lib/actions/categories';

// ==========================================
// 1. Planos de Assinatura
// ==========================================

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('price', { ascending: true });

  if (error) {
    console.error('Erro ao buscar planos de assinatura:', error);
    return [];
  }

  return (data || []).map((p) => ({
    ...p,
    price: Number(p.price),
  }));
}

export async function saveSubscriptionPlan(input: {
  id?: string;
  name: string;
  description?: string | null;
  price: number;
}): Promise<SubscriptionPlan> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');
  if (!input.name?.trim()) throw new Error('O nome do plano é obrigatório');
  if (input.price < 0) throw new Error('O preço não pode ser negativo');

  const payload = {
    user_id: user.id,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price: input.price,
    interval: 'monthly',
    active: true,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('subscription_plans')
      .update(payload)
      .eq('id', input.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    revalidatePath('/clientes');
    return { ...data, price: Number(data.price) };
  } else {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    revalidatePath('/clientes');
    return { ...data, price: Number(data.price) };
  }
}

export async function deleteSubscriptionPlan(id: string): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  // Soft delete para manter histórico
  const { error } = await supabase
    .from('subscription_plans')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
  revalidatePath('/clientes');
}

// ==========================================
// 2. Assinaturas de Clientes
// ==========================================

export async function getClientSubscriptions(): Promise<ClientSubscription[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return [];

  // Garante que as faturas do mês corrente foram geradas
  await ensureCurrentMonthInvoicesInternal(supabase, user.id);

  const { data, error } = await supabase
    .from('client_subscriptions')
    .select(`
      *,
      client:clients(*),
      plan:subscription_plans(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar assinaturas de clientes:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Buscar fatura mais recente de cada assinatura
  const subIds = data.map((s) => s.id);
  const { data: invoices } = await supabase
    .from('subscription_invoices')
    .select('*')
    .in('subscription_id', subIds)
    .order('period_start', { ascending: false });

  const invoiceMap = new Map<string, SubscriptionInvoice>();
  if (invoices) {
    for (const inv of invoices) {
      if (!invoiceMap.has(inv.subscription_id)) {
        invoiceMap.set(inv.subscription_id, {
          ...inv,
          amount: Number(inv.amount),
        });
      }
    }
  }

  return data.map((s) => ({
    ...s,
    price: Number(s.price),
    client: s.client,
    plan: s.plan ? { ...s.plan, price: Number(s.plan.price) } : null,
    latest_invoice: invoiceMap.get(s.id) || null,
  }));
}

export async function saveClientSubscription(input: {
  id?: string;
  client_id: string;
  plan_id?: string | null;
  custom_plan_name?: string | null;
  price: number;
  due_day: number;
  start_date?: string;
  status?: SubscriptionStatus;
  notes?: string | null;
}): Promise<ClientSubscription> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');
  if (!input.client_id) throw new Error('Selecione um cliente');
  if (input.price < 0) throw new Error('O valor não pode ser negativo');
  if (!input.due_day || input.due_day < 1 || input.due_day > 31) {
    throw new Error('Dia do vencimento deve ser entre 1 e 31');
  }

  const startDate = input.start_date || getTodayYMD();

  const payload = {
    user_id: user.id,
    client_id: input.client_id,
    plan_id: input.plan_id || null,
    custom_plan_name: input.custom_plan_name?.trim() || null,
    price: input.price,
    due_day: input.due_day,
    start_date: startDate,
    status: input.status || 'active',
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  let savedSubId = input.id;

  if (input.id) {
    const { error } = await supabase
      .from('client_subscriptions')
      .update(payload)
      .eq('id', input.id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from('client_subscriptions')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    savedSubId = data.id;

    // Gerar a primeira fatura para o ciclo atual
    if (savedSubId) {
      await generateInitialInvoice(supabase, user.id, savedSubId, input.client_id, input.price, input.due_day, startDate);
    }
  }

  revalidatePath('/clientes');
  return (await getClientSubscriptions()).find((s) => s.id === savedSubId)!;
}

export async function updateClientSubscriptionStatus(
  id: string,
  status: SubscriptionStatus
): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('client_subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
  revalidatePath('/clientes');
}

export async function deleteClientSubscription(id: string): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('client_subscriptions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
  revalidatePath('/clientes');
}

// ==========================================
// 3. Faturas / Mensalidades
// ==========================================

export async function getSubscriptionInvoices(options?: {
  month?: string; // YYYY-MM
  status?: InvoiceStatus;
  clientId?: string;
}): Promise<SubscriptionInvoice[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return [];

  let query = supabase
    .from('subscription_invoices')
    .select(`
      *,
      client:clients(*),
      subscription:client_subscriptions(
        *,
        plan:subscription_plans(*)
      ),
      account:accounts(*)
    `)
    .eq('user_id', user.id)
    .order('due_date', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.clientId) {
    query = query.eq('client_id', options.clientId);
  }

  if (options?.month) {
    const [year, month] = options.month.split('-');
    const startDate = `${year}-${month}-01`;
    // Fim do mês
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    query = query.gte('period_start', startDate).lte('period_start', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar faturas de assinaturas:', error);
    return [];
  }

  return (data || []).map((inv) => ({
    ...inv,
    amount: Number(inv.amount),
    subscription: inv.subscription
      ? {
          ...inv.subscription,
          price: Number(inv.subscription.price),
          plan: inv.subscription.plan
            ? { ...inv.subscription.plan, price: Number(inv.subscription.plan.price) }
            : null,
        }
      : null,
  }));
}

export async function paySubscriptionInvoice(input: {
  invoiceId: string;
  accountId: string;
  paidDate?: string;
}): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');
  if (!input.accountId) throw new Error('Selecione a conta para depósito');

  // 1. Buscar fatura com dados do cliente e assinatura
  const { data: invoice, error: invErr } = await supabase
    .from('subscription_invoices')
    .select(`
      *,
      client:clients(name),
      subscription:client_subscriptions(
        custom_plan_name,
        plan:subscription_plans(name)
      )
    `)
    .eq('id', input.invoiceId)
    .eq('user_id', user.id)
    .single();

  if (invErr || !invoice) {
    throw new Error('Fatura não encontrada');
  }

  if (invoice.status === 'paid') {
    throw new Error('Esta fatura já foi quitada');
  }

  const paidDate = input.paidDate || getTodayYMD();
  const clientName = invoice.client?.name || 'Cliente';
  const planName =
    invoice.subscription?.custom_plan_name ||
    invoice.subscription?.plan?.name ||
    'Mensalidade';

  const description = `Mensalidade: ${clientName} (${planName})`;
  const barbeariaCategoryId = await getOrCreateBarbeariaCategory(user.id);

  // 2. Criar transação de receita no extrato
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      description,
      amount: invoice.amount,
      type: 'income',
      payment_method: 'pix',
      transaction_date: paidDate,
      due_date: paidDate,
      category_id: barbeariaCategoryId,
      account_id: input.accountId,
      is_paid: true,
      paid_at: `${paidDate}T12:00:00Z`,
      notes: `Pagamento de mensalidade referente ao período ${invoice.period_start} a ${invoice.period_end}`,
    })
    .select('id')
    .single();

  if (txErr || !tx) {
    throw new Error(txErr?.message || 'Erro ao registrar receita da mensalidade');
  }

  // 3. Atualizar a fatura como paga
  const { error: updErr } = await supabase
    .from('subscription_invoices')
    .update({
      status: 'paid',
      paid_at: paidDate,
      account_id: input.accountId,
      transaction_id: tx.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoice.id)
    .eq('user_id', user.id);

  if (updErr) {
    throw new Error(updErr.message);
  }

  revalidatePath('/clientes');
  revalidatePath('/transacoes');
  revalidatePath('/');
}

export async function cancelSubscriptionInvoice(invoiceId: string): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('subscription_invoices')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
  revalidatePath('/clientes');
}

// ==========================================
// Helpers Internos de Geração de Faturas
// ==========================================

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function calculateDueDateForMonth(year: number, month: number, dueDay: number): string {
  const lastDayInMonth = new Date(year, month, 0).getDate();
  const validDay = Math.min(dueDay, lastDayInMonth);
  return `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
}

async function generateInitialInvoice(
  supabase: SupabaseServerClient,
  userId: string,
  subscriptionId: string,
  clientId: string,
  price: number,
  dueDay: number,
  startDateStr: string
) {
  const startDate = new Date(startDateStr);
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1;

  const lastDayInMonth = new Date(year, month, 0).getDate();
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDayInMonth).padStart(2, '0')}`;
  const dueDate = calculateDueDateForMonth(year, month, dueDay);

  await supabase.from('subscription_invoices').upsert(
    {
      user_id: userId,
      subscription_id: subscriptionId,
      client_id: clientId,
      amount: price,
      due_date: dueDate,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'pending',
    },
    { onConflict: 'subscription_id,period_start', ignoreDuplicates: true }
  );
}

async function ensureCurrentMonthInvoicesInternal(
  supabase: SupabaseServerClient,
  userId: string
) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const lastDayInMonth = new Date(year, month, 0).getDate();
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDayInMonth).padStart(2, '0')}`;

    // Buscar assinaturas ativas iniciadas até o fim do mês corrente
    const { data: activeSubs, error } = await supabase
      .from('client_subscriptions')
      .select('id, client_id, price, due_day, start_date')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('start_date', periodEnd);

    if (error || !activeSubs || activeSubs.length === 0) return;

    for (const sub of activeSubs) {
      const dueDate = calculateDueDateForMonth(year, month, sub.due_day);
      await supabase.from('subscription_invoices').upsert(
        {
          user_id: userId,
          subscription_id: sub.id,
          client_id: sub.client_id,
          amount: sub.price,
          due_date: dueDate,
          period_start: periodStart,
          period_end: periodEnd,
          status: 'pending',
        },
        { onConflict: 'subscription_id,period_start', ignoreDuplicates: true }
      );
    }
  } catch (err) {
    console.error('Erro ao gerar faturas do mês corrente:', err);
  }
}
