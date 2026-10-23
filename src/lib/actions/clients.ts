'use server';

import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Client } from '@/types/database';
import {
  analyzeClientSales,
  computeVipClientIds,
  ClientAnalytics,
  RawClientSale,
} from '@/lib/client-analytics';

export interface CreateClientInput {
  name: string;
  phone?: string | null;
  cpf?: string | null;
  notes?: string | null;
}

export interface ClientWithStats extends Client {
  totalSalesCount: number;
  totalSpent: number;
  lastSaleDate: string | null;
  isVip: boolean;
  analytics: ClientAnalytics;
  salesHistory: RawClientSale[];
}

export async function getClients(searchTerm?: string): Promise<ClientWithStats[]> {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  let query = supabase
    .from('clients')
    .select(`
      *,
      sales:sales(
        id,
        total_amount,
        sale_date,
        payment_method,
        notes,
        items:sale_items(
          product_name,
          quantity,
          unit_price,
          total_price
        )
      )
    `)
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (searchTerm && searchTerm.trim()) {
    const term = `%${searchTerm.trim()}%`;
    query = query.or(`name.ilike.${term},phone.ilike.${term},cpf.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar clientes:', error);
    return [];
  }

  type RawClientWithSales = Client & {
    sales?: RawClientSale[];
  };

  const rawList = (data as unknown as RawClientWithSales[]) || [];
  const now = new Date();

  const preliminary = rawList.map((c) => {
    const sales = c.sales || [];
    const totalSalesCount = sales.length;
    const totalSpent = sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
    const sortedSales = [...sales].sort(
      (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
    );
    const lastSaleDate = sortedSales[0]?.sale_date || null;
    const analytics = analyzeClientSales(sales, now);

    return {
      id: c.id,
      user_id: c.user_id,
      name: c.name,
      phone: c.phone,
      cpf: c.cpf,
      notes: c.notes,
      created_at: c.created_at,
      updated_at: c.updated_at,
      totalSalesCount,
      totalSpent,
      lastSaleDate,
      analytics,
      salesHistory: sortedSales,
    };
  });

  const vipIds = computeVipClientIds(preliminary);

  return preliminary.map((item) => ({
    ...item,
    isVip: vipIds.has(item.id),
  }));
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  if (!input.name.trim()) {
    throw new Error('Informe o nome do cliente.');
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      cpf: input.cpf?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao cadastrar cliente.');
  }

  revalidatePath('/clientes');
  revalidatePath('/vendas');
  return data as unknown as Client;
}

export async function updateClient(id: string, input: CreateClientInput): Promise<Client> {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  if (!input.name.trim()) {
    throw new Error('Informe o nome do cliente.');
  }

  const { data, error } = await supabase
    .from('clients')
    .update({
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      cpf: input.cpf?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao atualizar cliente.');
  }

  revalidatePath('/clientes');
  revalidatePath('/vendas');
  return data as unknown as Client;
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/clientes');
  revalidatePath('/vendas');
}

export type SimpleClient = Pick<Client, 'id' | 'name' | 'phone'>;

export async function getSimpleClients(): Promise<SimpleClient[]> {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao buscar clientes simples:', error);
    return [];
  }

  return (data as SimpleClient[]) || [];
}
