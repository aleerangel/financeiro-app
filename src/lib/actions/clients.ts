'use server';

import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Client } from '@/types/database';

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
}

export async function getClients(searchTerm?: string): Promise<ClientWithStats[]> {
  const supabase = await createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  let query = supabase
    .from('clients')
    .select(`
      *,
      sales:sales(id, total_amount, sale_date)
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
    sales?: { id: string; total_amount: number; sale_date: string }[];
  };

  const rawList = (data as unknown as RawClientWithSales[]) || [];

  return rawList.map((c) => {
    const sales = c.sales || [];
    const totalSalesCount = sales.length;
    const totalSpent = sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
    const sortedSales = [...sales].sort(
      (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
    );
    const lastSaleDate = sortedSales[0]?.sale_date || null;

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
    };
  });
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
