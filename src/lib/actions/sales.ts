'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Sale, PaymentMethod } from '@/types/database';
import { getOrCreateBarbeariaCategory } from '@/lib/actions/categories';

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
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00.000Z`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

    query = query.gte('sale_date', startDate).lte('sale_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar vendas:', error);
    return [];
  }

  // Auto-correção: associa transações antigas de atendimentos que ficaram sem categoria à Barbearia
  try {
    const barbeariaCatId = await getOrCreateBarbeariaCategory(user.id);
    await supabase
      .from('transactions')
      .update({ category_id: barbeariaCatId })
      .eq('user_id', user.id)
      .is('category_id', null)
      .ilike('description', 'Atendimento:%');
  } catch (err) {
    console.warn('Aviso ao sincronizar categoria de vendas:', err);
  }

  return (data as unknown as Sale[]) || [];
}

export async function getTodaySalesSummary(): Promise<TodaySalesSummary> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

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
  const now = new Date();
  let saleDateIso: string;
  let dateOnlyStr: string;

  if (input.sale_date) {
    if (input.sale_date.includes('T')) {
      const parsed = new Date(input.sale_date);
      saleDateIso = parsed.toISOString();
      dateOnlyStr = saleDateIso.split('T')[0];
    } else {
      const [year, month, day] = input.sale_date.split('-').map(Number);
      const customDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
      saleDateIso = customDate.toISOString();
      dateOnlyStr = input.sale_date;
    }
  } else {
    saleDateIso = now.toISOString();
    dateOnlyStr = now.toISOString().split('T')[0];
  }

  // 3. Obtém ou cria a categoria padrão "Barbearia" para vincular ao atendimento
  const barbeariaCategoryId = await getOrCreateBarbeariaCategory(user.id);

  // 4. Cria a transação financeira de receita vinculada à Barbearia
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      description: transactionDesc,
      amount: totalAmount,
      type: 'income',
      payment_method: input.payment_method,
      transaction_date: dateOnlyStr,
      due_date: dateOnlyStr,
      category_id: barbeariaCategoryId,
      account_id: input.account_id,
      is_paid: true,
      paid_at: saleDateIso,
      notes: input.notes ? `Comanda: ${input.notes}` : 'Atendimento registrado no módulo de vendas',
    })
    .select('id')
    .single();

  if (txError || !transaction) {
    throw new Error(txError?.message || 'Erro ao gerar receita do atendimento.');
  }

  // 4. Cria o registro de venda
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      user_id: user.id,
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
    // Reverte a transação financeira em caso de erro
    await supabase.from('transactions').delete().eq('id', transaction.id);
    throw new Error(saleError?.message || 'Erro ao registrar atendimento.');
  }

  // 5. Cria os itens da venda
  const saleItemsToInsert = input.items.map((item) => ({
    sale_id: sale.id,
    product_id: item.product_id || null,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.quantity * item.unit_price,
  }));

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(saleItemsToInsert);

  if (itemsError) {
    console.error('Erro ao salvar itens da venda:', itemsError);
  }

  revalidatePath('/vendas');
  revalidatePath('/dashboard');
  revalidatePath('/transacoes');
  revalidatePath('/contas');
  revalidatePath('/clientes');

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

