'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Sale, PaymentMethod } from '@/types/database';
import { getOrCreateBarbeariaCategory } from '@/lib/actions/categories';
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
  payment_method: PaymentMethod;
  account_id: string;
  items: CreateSaleItemInput[];
  notes?: string;
  sale_date?: string;
}

export interface TodaySalesSummary {
  todayTotal: number;
  todayClientsCount: number;
  averageTicket: number;
  todaySales: Sale[];
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
      client:clients(*)
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

  const { data: sales, error } = await supabase
    .from('sales')
    .select(`
      *,
      items:sale_items(*),
      account:accounts(*),
      client:clients(*)
    `)
    .eq('user_id', user.id)
    .gte('sale_date', startOfDay)
    .lte('sale_date', endOfDay)
    .order('sale_date', { ascending: false });

  if (error || !sales) {
    return { todayTotal: 0, todayClientsCount: 0, averageTicket: 0, todaySales: [] };
  }

  const todaySalesList = sales as unknown as Sale[];
  const total = todaySalesList.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
  const count = todaySalesList.length;
  const avg = count > 0 ? total / count : 0;

  return {
    todayTotal: total,
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

  // 3. Obtém ou cria a categoria padrão "Barbearia" para vincular ao atendimento
  const barbeariaCategoryId = await getOrCreateBarbeariaCategory(user.id);

  const transactionNotes = input.notes
    ? `Comanda: ${input.notes}`
    : 'Atendimento registrado no módulo de vendas';

  // 4. Registra receita + venda + itens de forma ATÔMICA (tudo ou nada) via RPC
  const { data: saleId, error: rpcError } = await supabase.rpc('create_sale_atomic', {
    p_client_id: input.client_id || null,
    p_client_name: input.client_name.trim(),
    p_payment_method: input.payment_method,
    p_account_id: input.account_id,
    p_category_id: barbeariaCategoryId,
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
  });

  let sale: { id: string } | null = null;

  if (!rpcError && saleId) {
    sale = { id: saleId as string };
  } else if (rpcError && isMissingRpcError(rpcError)) {
    // Compatibilidade: migration ainda não aplicada no banco -> fluxo legado com rollback completo
    sale = await createSaleLegacy({
      supabase,
      userId: user.id,
      input,
      totalAmount,
      transactionDesc,
      transactionNotes,
      categoryId: barbeariaCategoryId,
      saleDateIso,
      dateOnlyStr,
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
  } = params;

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

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      user_id: userId,
      client_id: input.client_id || null,
      client_name: input.client_name.trim(),
      total_amount: totalAmount,
      payment_method: input.payment_method,
      account_id: input.account_id,
      transaction_id: transaction.id,
      sale_date: saleDateIso,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  if (saleError || !sale) {
    await supabase.from('transactions').delete().eq('id', transaction.id).eq('user_id', userId);
    throw new Error(saleError?.message || 'Erro ao registrar atendimento.');
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
    // Reverte venda (cascade nos itens) e receita para não deixar dados órfãos
    await supabase.from('sales').delete().eq('id', sale.id).eq('user_id', userId);
    await supabase.from('transactions').delete().eq('id', transaction.id).eq('user_id', userId);
    throw new Error(itemsError.message || 'Erro ao salvar itens do atendimento.');
  }

  return sale;
}

export async function deleteSale(saleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  // Busca a venda para pegar o transaction_id correspondente
  const { data: sale } = await supabase
    .from('sales')
    .select('transaction_id')
    .eq('id', saleId)
    .eq('user_id', user.id)
    .single();

  // Deleta a venda (por cascade, remove os sale_items)
  const { error: deleteSaleError } = await supabase
    .from('sales')
    .delete()
    .eq('id', saleId)
    .eq('user_id', user.id);

  if (deleteSaleError) {
    throw new Error(deleteSaleError.message);
  }

  // Se houver transação financeira associada, remove-a para estornar a receita
  if (sale?.transaction_id) {
    await supabase
      .from('transactions')
      .delete()
      .eq('id', sale.transaction_id)
      .eq('user_id', user.id);
  }

  revalidatePath('/vendas');
  revalidatePath('/dashboard');
  revalidatePath('/transacoes');
  revalidatePath('/contas');
  revalidatePath('/clientes');
}

