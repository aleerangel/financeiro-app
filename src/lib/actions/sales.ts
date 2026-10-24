'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Sale, PaymentMethod, SalePaymentMethod } from '@/types/database';
import { getOrCreateBusinessIncomeCategory } from '@/lib/actions/categories';
import { getBusinessProfile } from '@/lib/actions/business-profile';
import {
  getTodayYMD,
  getZonedRangeBoundsIso,
  resolveSaleTimestamps,
} from '@/lib/date-utils';

export interface CreateSaleItemInput {
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface CreateSaleInput {
  client_id?: string | null;
  client_name: string;
  payment_method: SalePaymentMethod;
  account_id: string;
  items: CreateSaleItemInput[];
  notes?: string;
  sale_date?: string;
  due_date?: string | null;
  initial_payment?: number | null;
  initial_payment_method?: PaymentMethod;
}

export interface TodaySalesSummary {
  todayTotal: number;
  todayOnCreditTotal: number;
  totalPendingReceivables: number;
  todayClientsCount: number;
  averageTicket: number;
  todaySales: Sale[];
}

export interface AmortizeSaleInput {
  saleId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  accountId: string;
  notes?: string;
  amortizedAt?: string;
}

export interface AmortizeClientDebtInput {
  clientId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  accountId: string;
  notes?: string;
  amortizedAt?: string;
}

export async function getSales(month?: number, year?: number): Promise<Sale[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  let query = supabase
    .from('sales')
    .select(`
      *,
      items:sale_items(*),
      account:accounts(*),
      client:clients(*),
      amortizations:sale_amortizations(
        *,
        account:accounts(id, name)
      )
    `)
    .eq('user_id', user.id)
    .order('sale_date', { ascending: false });

  if (month !== undefined && year !== undefined) {
    const startYmd = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endYmd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const { startIso, endIso } = getZonedRangeBoundsIso(startYmd, endYmd);

    query = query.gte('sale_date', startIso).lte('sale_date', endIso);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar vendas:', error);
    return [];
  }

  return (data as unknown as Sale[]) || [];
}

export async function getTodaySalesSummary(): Promise<TodaySalesSummary> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const todayYmd = getTodayYMD();
  const { startIso: startOfDay, endIso: endOfDay } = getZonedRangeBoundsIso(todayYmd);

  const [
    { data: sales, error: salesError },
    { data: todayAmortizations },
    { data: pendingSales },
  ] = await Promise.all([
    supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(*),
        account:accounts(*),
        client:clients(*),
        amortizations:sale_amortizations(
          *,
          account:accounts(id, name)
        )
      `)
      .eq('user_id', user.id)
      .gte('sale_date', startOfDay)
      .lte('sale_date', endOfDay)
      .order('sale_date', { ascending: false }),
    supabase
      .from('sale_amortizations')
      .select('amount')
      .eq('user_id', user.id)
      .gte('amortized_at', startOfDay)
      .lte('amortized_at', endOfDay),
    supabase
      .from('sales')
      .select('remaining_amount')
      .eq('user_id', user.id)
      .in('status', ['pending', 'partially_paid']),
  ]);

  if (salesError || !sales) {
    return {
      todayTotal: 0,
      todayOnCreditTotal: 0,
      totalPendingReceivables: 0,
      todayClientsCount: 0,
      averageTicket: 0,
      todaySales: [],
    };
  }

  const todaySalesList = sales as unknown as Sale[];
  const cashSalesToday = todaySalesList
    .filter((s) => s.payment_method !== 'on_credit')
    .reduce((acc, curr) => acc + Number(curr.total_amount), 0);

  const amortizationsToday = (todayAmortizations || []).reduce(
    (acc, curr) => acc + Number(curr.amount || 0),
    0
  );

  const todayTotal = cashSalesToday + amortizationsToday;

  const todayOnCreditTotal = todaySalesList
    .filter((s) => s.payment_method === 'on_credit')
    .reduce((acc, curr) => acc + Number(curr.remaining_amount ?? curr.total_amount), 0);

  const totalPendingReceivables = (pendingSales || []).reduce(
    (acc, curr) => acc + Number(curr.remaining_amount || 0),
    0
  );

  const count = todaySalesList.length;
  const avg = count > 0 ? todayTotal / count : 0;

  return {
    todayTotal,
    todayOnCreditTotal,
    totalPendingReceivables,
    todayClientsCount: count,
    averageTicket: avg,
    todaySales: todaySalesList,
  };
}

export async function createSale(input: CreateSaleInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  if (!input.client_name.trim()) {
    throw new Error('Informe o nome do cliente atendido.');
  }

  if (input.payment_method === 'on_credit' && !input.client_id) {
    throw new Error('Vendas a prazo exigem a vinculação de um cliente cadastrado.');
  }

  if (!input.items || input.items.length === 0) {
    throw new Error('Adicione ao menos um serviço ou produto ao atendimento.');
  }

  // 1. Calcula o valor total somando todos os itens
  const totalAmount = input.items.reduce((acc, item) => {
    return acc + Number(item.quantity) * Number(item.unit_price);
  }, 0);

  // 2. Cria o resumo dos itens para a descrição da receita
  const itemsSummary = input.items
    .map((item) => `${item.quantity > 1 ? `${item.quantity}x ` : ''}${item.product_name}`)
    .join(', ');

  const transactionDesc = `Atendimento: ${input.client_name.trim()} (${itemsSummary})`;
  const { saleDateIso, dateOnlyStr } = resolveSaleTimestamps(input.sale_date);

  // 3. Obtém ou cria a categoria contextual para vincular ao atendimento
  const profile = await getBusinessProfile();
  const businessCategoryId = await getOrCreateBusinessIncomeCategory(
    user.id,
    profile.segment,
    profile.business_name
  );

  const transactionNotes = input.notes
    ? `Comanda: ${input.notes}`
    : 'Atendimento registrado no módulo de vendas';

  const initialPayment = Number(input.initial_payment || 0);
  const initialPaymentMethod = input.initial_payment_method || 'cash';

  // 4. Registra receita + venda + itens de forma ATÔMICA via RPC
  const { data: saleId, error: rpcError } = await supabase.rpc('create_sale_atomic', {
    p_client_id: input.client_id || null,
    p_client_name: input.client_name.trim(),
    p_payment_method: input.payment_method,
    p_account_id: input.account_id,
    p_category_id: businessCategoryId,
    p_description: transactionDesc,
    p_notes_transaction: transactionNotes,
    p_notes_sale: input.notes?.trim() || null,
    p_sale_date: saleDateIso,
    p_date_only: dateOnlyStr,
    p_items: input.items.map((item) => ({
      product_id: item.product_id || null,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    p_due_date: input.due_date || null,
    p_initial_payment: initialPayment,
    p_initial_payment_method: initialPaymentMethod,
  });

  let sale: { id: string } | null = null;

  if (!rpcError && saleId) {
    sale = { id: saleId as string };
  } else if (rpcError && isMissingRpcError(rpcError)) {
    // Compatibilidade / Fallback
    sale = await createSaleLegacy({
      supabase,
      userId: user.id,
      input,
      totalAmount,
      transactionDesc,
      transactionNotes,
      categoryId: businessCategoryId,
      saleDateIso,
      dateOnlyStr,
      initialPayment,
      initialPaymentMethod,
    });
  } else {
    throw new Error(rpcError?.message || 'Erro ao registrar atendimento.');
  }

  revalidatePath('/vendas');
  revalidatePath('/dashboard');
  revalidatePath('/transacoes');
  revalidatePath('/contas');
  revalidatePath('/clientes');

  return sale;
}

function isMissingRpcError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    Boolean(error.message?.includes('create_sale_atomic'))
  );
}

async function createSaleLegacy(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  input: CreateSaleInput;
  totalAmount: number;
  transactionDesc: string;
  transactionNotes: string;
  categoryId: string;
  saleDateIso: string;
  dateOnlyStr: string;
  initialPayment: number;
  initialPaymentMethod: PaymentMethod;
}): Promise<{ id: string }> {
  const {
    supabase,
    userId,
    input,
    totalAmount,
    transactionDesc,
    transactionNotes,
    categoryId,
    saleDateIso,
    dateOnlyStr,
    initialPayment,
    initialPaymentMethod,
  } = params;

  const isOnCredit = input.payment_method === 'on_credit';
  let transactionId: string | null = null;

  // Se não for fiado, ou se tiver entrada imediata no fiado, cria transação financeira
  if (!isOnCredit) {
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        description: transactionDesc,
        amount: totalAmount,
        type: 'income',
        payment_method: input.payment_method,
        transaction_date: dateOnlyStr,
        due_date: dateOnlyStr,
        category_id: categoryId,
        account_id: input.account_id,
        is_paid: true,
        paid_at: saleDateIso,
        notes: transactionNotes,
      })
      .select('id')
      .single();

    if (txError || !transaction) {
      throw new Error(txError?.message || 'Erro ao gerar receita do atendimento.');
    }
    transactionId = transaction.id;
  } else if (initialPayment > 0) {
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        description: `Entrada Atendimento: ${input.client_name.trim()}`,
        amount: initialPayment,
        type: 'income',
        payment_method: initialPaymentMethod,
        transaction_date: dateOnlyStr,
        due_date: dateOnlyStr,
        category_id: categoryId,
        account_id: input.account_id,
        is_paid: true,
        paid_at: saleDateIso,
        notes: 'Entrada inicial no ato da venda a prazo',
      })
      .select('id')
      .single();

    if (txError || !transaction) {
      throw new Error(txError?.message || 'Erro ao gerar receita da entrada do atendimento.');
    }
    transactionId = transaction.id;
  }

  const paidAmount = isOnCredit ? initialPayment : totalAmount;
  const remainingAmount = isOnCredit ? Math.max(0, totalAmount - initialPayment) : 0;
  const status = isOnCredit
    ? remainingAmount <= 0
      ? 'paid'
      : initialPayment > 0
      ? 'partially_paid'
      : 'pending'
    : 'paid';

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      user_id: userId,
      client_id: input.client_id || null,
      client_name: input.client_name.trim(),
      total_amount: totalAmount,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      status,
      payment_method: input.payment_method,
      due_date: input.due_date || null,
      account_id: input.account_id,
      transaction_id: isOnCredit ? null : transactionId,
      sale_date: saleDateIso,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  if (saleError || !sale) {
    if (transactionId) {
      await supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', userId);
    }
    throw new Error(saleError?.message || 'Erro ao registrar atendimento.');
  }

  // Se for a prazo e tiver entrada, grava amortização correspondente
  if (isOnCredit && initialPayment > 0 && transactionId) {
    await supabase.from('sale_amortizations').insert({
      user_id: userId,
      sale_id: sale.id,
      client_id: input.client_id || null,
      amount: initialPayment,
      payment_method: initialPaymentMethod,
      account_id: input.account_id,
      transaction_id: transactionId,
      amortized_at: saleDateIso,
      notes: 'Entrada inicial no ato da venda',
    });
  }

  const { error: itemsError } = await supabase.from('sale_items').insert(
    input.items.map((item) => ({
      sale_id: sale.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
    }))
  );

  if (itemsError) {
    await supabase.from('sales').delete().eq('id', sale.id).eq('user_id', userId);
    if (transactionId) {
      await supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', userId);
    }
    throw new Error(itemsError.message || 'Erro ao salvar itens do atendimento.');
  }

  return sale;
}

export async function amortizeSale(input: AmortizeSaleInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  if (input.amount <= 0) {
    throw new Error('O valor da amortização deve ser maior que zero.');
  }

  const { saleDateIso, dateOnlyStr } = resolveSaleTimestamps(input.amortizedAt);
  const profile = await getBusinessProfile();
  const businessCategoryId = await getOrCreateBusinessIncomeCategory(
    user.id,
    profile.segment,
    profile.business_name
  );

  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('id, client_id, client_name, total_amount, paid_amount, remaining_amount')
    .eq('id', input.saleId)
    .eq('user_id', user.id)
    .single();

  if (saleErr || !sale) {
    throw new Error('Comanda não encontrada.');
  }

  if (input.amount > Number(sale.remaining_amount || 0)) {
    throw new Error(
      `O valor informado (R$ ${input.amount.toFixed(2)}) excede o saldo devedor restante (R$ ${Number(sale.remaining_amount || 0).toFixed(2)}).`
    );
  }

  const description = `Amortização: ${sale.client_name}`;
  const notes = input.notes?.trim() || 'Amortização de atendimento a prazo';

  const { data: amortizationId, error: rpcError } = await supabase.rpc('amortize_sale_atomic', {
    p_sale_id: input.saleId,
    p_amount: input.amount,
    p_payment_method: input.paymentMethod,
    p_account_id: input.accountId,
    p_category_id: businessCategoryId,
    p_description: description,
    p_notes: notes,
    p_amortized_at: saleDateIso,
    p_date_only: dateOnlyStr,
  });

  if (rpcError) {
    // Fallback sem RPC
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        description,
        amount: input.amount,
        type: 'income',
        payment_method: input.paymentMethod,
        transaction_date: dateOnlyStr,
        due_date: dateOnlyStr,
        category_id: businessCategoryId,
        account_id: input.accountId,
        is_paid: true,
        paid_at: saleDateIso,
        notes,
      })
      .select('id')
      .single();

    if (txErr || !tx) {
      throw new Error(txErr?.message || 'Erro ao registrar receita da amortização.');
    }

    const { data: amort, error: amortErr } = await supabase
      .from('sale_amortizations')
      .insert({
        user_id: user.id,
        sale_id: sale.id,
        client_id: sale.client_id,
        amount: input.amount,
        payment_method: input.paymentMethod,
        account_id: input.accountId,
        transaction_id: tx.id,
        amortized_at: saleDateIso,
        notes,
      })
      .select('id')
      .single();

    if (amortErr || !amort) {
      await supabase.from('transactions').delete().eq('id', tx.id).eq('user_id', user.id);
      throw new Error(amortErr?.message || 'Erro ao registrar amortização.');
    }

    const newPaid = Number(sale.paid_amount || 0) + input.amount;
    const newRemaining = Math.max(0, Number(sale.remaining_amount || 0) - input.amount);
    const newStatus = newRemaining <= 0 ? 'paid' : 'partially_paid';

    await supabase
      .from('sales')
      .update({
        paid_amount: newPaid,
        remaining_amount: newRemaining,
        status: newStatus,
      })
      .eq('id', sale.id)
      .eq('user_id', user.id);
  }

  revalidatePath('/vendas');
  revalidatePath('/dashboard');
  revalidatePath('/transacoes');
  revalidatePath('/contas');
  revalidatePath('/clientes');

  return { id: amortizationId };
}

export async function amortizeClientDebt(input: AmortizeClientDebtInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  if (input.amount <= 0) {
    throw new Error('O valor da amortização deve ser maior que zero.');
  }

  const { saleDateIso, dateOnlyStr } = resolveSaleTimestamps(input.amortizedAt);
  const profile = await getBusinessProfile();
  const businessCategoryId = await getOrCreateBusinessIncomeCategory(
    user.id,
    profile.segment,
    profile.business_name
  );

  const { data, error: rpcError } = await supabase.rpc('amortize_client_debt_atomic', {
    p_client_id: input.clientId,
    p_amount: input.amount,
    p_payment_method: input.paymentMethod,
    p_account_id: input.accountId,
    p_category_id: businessCategoryId,
    p_notes: input.notes?.trim() || 'Amortização consolidada de débito do cliente',
    p_amortized_at: saleDateIso,
    p_date_only: dateOnlyStr,
  });

  if (rpcError) {
    // Fallback: busca vendas pendentes ordenadas por data crescente
    const { data: pendingSales, error: fetchErr } = await supabase
      .from('sales')
      .select('id, remaining_amount, sale_date')
      .eq('user_id', user.id)
      .eq('client_id', input.clientId)
      .in('status', ['pending', 'partially_paid'])
      .order('sale_date', { ascending: true });

    if (fetchErr || !pendingSales || pendingSales.length === 0) {
      throw new Error('Este cliente não possui débitos em aberto.');
    }

    let remainingToAmortize = input.amount;

    for (const s of pendingSales) {
      if (remainingToAmortize <= 0) break;
      const thisAmount = Math.min(remainingToAmortize, Number(s.remaining_amount || 0));
      if (thisAmount > 0) {
        await amortizeSale({
          saleId: s.id,
          amount: thisAmount,
          paymentMethod: input.paymentMethod,
          accountId: input.accountId,
          notes: input.notes,
          amortizedAt: input.amortizedAt,
        });
        remainingToAmortize -= thisAmount;
      }
    }
  }

  revalidatePath('/vendas');
  revalidatePath('/dashboard');
  revalidatePath('/transacoes');
  revalidatePath('/contas');
  revalidatePath('/clientes');

  return data;
}

export async function deleteSaleAmortization(amortizationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data: amort, error: amortErr } = await supabase
    .from('sale_amortizations')
    .select('*, sale:sales(*)')
    .eq('id', amortizationId)
    .eq('user_id', user.id)
    .single();

  if (amortErr || !amort) {
    throw new Error('Amortização não encontrada.');
  }

  const { error: delErr } = await supabase
    .from('sale_amortizations')
    .delete()
    .eq('id', amortizationId)
    .eq('user_id', user.id);

  if (delErr) throw new Error(delErr.message);

  if (amort.transaction_id) {
    await supabase
      .from('transactions')
      .delete()
      .eq('id', amort.transaction_id)
      .eq('user_id', user.id);
  }

  if (amort.sale) {
    const saleRecord = amort.sale as Sale;
    const newPaid = Math.max(0, Number(saleRecord.paid_amount || 0) - Number(amort.amount));
    const newRemaining = Math.max(0, Number(saleRecord.total_amount) - newPaid);
    const newStatus = newPaid <= 0 ? 'pending' : (newRemaining <= 0 ? 'paid' : 'partially_paid');

    await supabase
      .from('sales')
      .update({
        paid_amount: newPaid,
        remaining_amount: newRemaining,
        status: newStatus,
      })
      .eq('id', amort.sale_id)
      .eq('user_id', user.id);
  }

  revalidatePath('/vendas');
  revalidatePath('/dashboard');
  revalidatePath('/transacoes');
  revalidatePath('/contas');
  revalidatePath('/clientes');
  revalidatePath('/fiados');
}

export async function deleteSale(saleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  // Busca a venda e suas amortizações para coletar os IDs das receitas
  const { data: sale } = await supabase
    .from('sales')
    .select(`
      transaction_id,
      amortizations:sale_amortizations(transaction_id)
    `)
    .eq('id', saleId)
    .eq('user_id', user.id)
    .single();

  const txIdsToDelete: string[] = [];
  if (sale?.transaction_id) {
    txIdsToDelete.push(sale.transaction_id);
  }

  if (sale?.amortizations && Array.isArray(sale.amortizations)) {
    for (const a of sale.amortizations as { transaction_id?: string | null }[]) {
      if (a.transaction_id) txIdsToDelete.push(a.transaction_id);
    }
  }

  // Deleta a venda (por cascade, remove os sale_items e sale_amortizations)
  const { error: deleteSaleError } = await supabase
    .from('sales')
    .delete()
    .eq('id', saleId)
    .eq('user_id', user.id);

  if (deleteSaleError) {
    throw new Error(deleteSaleError.message);
  }

  // Se houver transações financeiras associadas, remove-as para estornar a receita
  if (txIdsToDelete.length > 0) {
    await supabase
      .from('transactions')
      .delete()
      .in('id', txIdsToDelete)
      .eq('user_id', user.id);
  }

  revalidatePath('/vendas');
  revalidatePath('/dashboard');
  revalidatePath('/transacoes');
  revalidatePath('/contas');
  revalidatePath('/clientes');
  revalidatePath('/fiados');
}

export interface ClientDebtItem {
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientCpf: string | null;
  totalDebt: number;
  totalOriginal: number;
  totalPaid: number;
  pendingSalesCount: number;
  mostUrgentDueDate: string | null;
  isOverdue: boolean;
  daysDiff: number | null;
  sales: Sale[];
}

export interface DebtsOverviewSummary {
  totalPendingDebt: number;
  totalOverdueDebt: number;
  totalClientsWithDebt: number;
  maxClientDebt: { clientName: string; amount: number } | null;
  clients: ClientDebtItem[];
}

export async function getPendingDebtsSummary(): Promise<DebtsOverviewSummary> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const todayStr = getTodayYMD();

  // Busca todas as vendas com saldo devedor em aberto
  const { data: salesData, error } = await supabase
    .from('sales')
    .select(`
      *,
      items:sale_items(*),
      account:accounts(*),
      client:clients(*),
      amortizations:sale_amortizations(
        *,
        account:accounts(id, name)
      )
    `)
    .eq('user_id', user.id)
    .in('status', ['pending', 'partially_paid'])
    .order('sale_date', { ascending: false });

  if (error || !salesData) {
    return {
      totalPendingDebt: 0,
      totalOverdueDebt: 0,
      totalClientsWithDebt: 0,
      maxClientDebt: null,
      clients: [],
    };
  }

  const sales = salesData as unknown as Sale[];

  // Agrupa por cliente
  const clientMap = new Map<string, {
    clientId: string;
    clientName: string;
    clientPhone: string | null;
    clientCpf: string | null;
    sales: Sale[];
  }>();

  for (const s of sales) {
    const key = s.client_id || s.client_name.trim().toLowerCase();
    const existing = clientMap.get(key) || {
      clientId: s.client_id || s.id,
      clientName: s.client?.name || s.client_name,
      clientPhone: s.client?.phone || null,
      clientCpf: s.client?.cpf || null,
      sales: [],
    };
    existing.sales.push(s);
    clientMap.set(key, existing);
  }

  let totalPendingDebt = 0;
  let totalOverdueDebt = 0;
  const clientsList: ClientDebtItem[] = [];

  for (const group of clientMap.values()) {
    const totalDebt = group.sales.reduce(
      (acc, s) => acc + Number(s.remaining_amount ?? s.total_amount ?? 0),
      0
    );
    const totalOriginal = group.sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
    const totalPaid = group.sales.reduce((acc, s) => acc + Number(s.paid_amount || 0), 0);

    // Encontra a data de vencimento mais urgente / antiga
    let mostUrgentDueDate: string | null = null;
    let mostUrgentDaysDiff: number | null = null;
    let isClientOverdue = false;

    for (const s of group.sales) {
      if (s.due_date) {
        // diff em dias: hoje - due_date
        const diffMs = new Date(todayStr).getTime() - new Date(s.due_date).getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          isClientOverdue = true;
        }

        if (mostUrgentDaysDiff === null || diffDays > mostUrgentDaysDiff) {
          mostUrgentDaysDiff = diffDays;
          mostUrgentDueDate = s.due_date;
        }
      }
    }

    if (isClientOverdue) {
      totalOverdueDebt += totalDebt;
    }
    totalPendingDebt += totalDebt;

    clientsList.push({
      clientId: group.clientId,
      clientName: group.clientName,
      clientPhone: group.clientPhone,
      clientCpf: group.clientCpf,
      totalDebt: Number(totalDebt.toFixed(2)),
      totalOriginal: Number(totalOriginal.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      pendingSalesCount: group.sales.length,
      mostUrgentDueDate,
      isOverdue: isClientOverdue,
      daysDiff: mostUrgentDaysDiff,
      sales: group.sales,
    });
  }

  // Ordena por maior débito
  clientsList.sort((a, b) => b.totalDebt - a.totalDebt);

  const maxClient = clientsList[0]
    ? { clientName: clientsList[0].clientName, amount: clientsList[0].totalDebt }
    : null;

  return {
    totalPendingDebt: Number(totalPendingDebt.toFixed(2)),
    totalOverdueDebt: Number(totalOverdueDebt.toFixed(2)),
    totalClientsWithDebt: clientsList.length,
    maxClientDebt: maxClient,
    clients: clientsList,
  };
}

export async function updateSaleDebt(input: {
  saleId: string;
  dueDate?: string | null;
  notes?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('sales')
    .update({
      due_date: input.dueDate || null,
      notes: input.notes?.trim() || null,
    })
    .eq('id', input.saleId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message || 'Erro ao atualizar comanda.');
  }

  revalidatePath('/vendas');
  revalidatePath('/fiados');
  revalidatePath('/dashboard');
  revalidatePath('/clientes');
}
