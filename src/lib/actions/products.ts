'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Product, ProductType } from '@/types/database';

export interface CreateProductInput {
  name: string;
  type?: ProductType;
  default_price: number;
  icon?: string;
  color?: string;
}

export async function getProducts(includeInactive: boolean = false): Promise<Product[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  let query = supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (!includeInactive) {
    query = query.eq('active', true);
  }

  const { data: products, error } = await query;

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }

  // Seed automático dos serviços essenciais de barbearia se o usuário ainda não tiver nenhum
  if (!products || products.length === 0) {
    const defaultServices = [
      { user_id: user.id, name: 'Corte', type: 'service', default_price: 35.00, icon: 'scissors', color: '#3b82f6', active: true },
      { user_id: user.id, name: 'Barba', type: 'service', default_price: 25.00, icon: 'sparkles', color: '#8b5cf6', active: true },
      { user_id: user.id, name: 'Sobrancelha', type: 'service', default_price: 15.00, icon: 'eye', color: '#10b981', active: true },
      { user_id: user.id, name: 'Bigode', type: 'service', default_price: 10.00, icon: 'smile', color: '#f59e0b', active: true },
    ];

    const { data: inserted, error: insertError } = await supabase
      .from('products')
      .insert(defaultServices)
      .select();

    if (!insertError && inserted) {
      return inserted as Product[];
    }
  }

  return (products as Product[]) || [];
}

export async function createProduct(input: CreateProductInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data, error } = await supabase
    .from('products')
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      type: input.type || 'service',
      default_price: input.default_price,
      icon: input.icon || 'scissors',
      color: input.color || '#3b82f6',
      active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/produtos');
  revalidatePath('/vendas');
  return data;
}

export async function updateProduct(
  id: string,
  input: {
    name: string;
    type?: ProductType;
    default_price: number;
    icon?: string;
    color?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('products')
    .update({
      name: input.name.trim(),
      type: input.type,
      default_price: input.default_price,
      icon: input.icon,
      color: input.color,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/produtos');
  revalidatePath('/vendas');
}

export async function toggleProductActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('products')
    .update({ active })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/produtos');
  revalidatePath('/vendas');
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/produtos');
  revalidatePath('/vendas');
}
