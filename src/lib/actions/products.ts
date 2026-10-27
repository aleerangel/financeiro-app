'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Product, ProductType } from '@/types/database';

export interface ServiceProductInput {
  product_id: string;
  quantity: number;
}

export interface CreateProductInput {
  name: string;
  type?: ProductType;
  default_price: number;
  cost_price?: number;
  stock_quantity?: number | null;
  min_stock?: number | null;
  service_products?: ServiceProductInput[];
  icon?: string;
  color?: string;
}

export async function getProducts(includeInactive: boolean = false): Promise<Product[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  let query = supabase
    .from('products')
    .select('*, service_products:service_products!service_products_service_id_fkey(*, product:products!service_products_product_id_fkey(id, name, cost_price, stock_quantity, min_stock))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (!includeInactive) {
    query = query.eq('active', true);
  }

  let { data: products, error } = await query;

  // Fallback caso a tabela service_products ainda não exista no banco
  if (error) {
    let fallbackQuery = supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!includeInactive) {
      fallbackQuery = fallbackQuery.eq('active', true);
    }
    const fallbackRes = await fallbackQuery;
    products = fallbackRes.data;
    error = fallbackRes.error;
  }

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

  const isPhysicalProduct = input.type === 'product';
  const basePayload = {
    user_id: user.id,
    name: input.name.trim(),
    type: input.type || 'service',
    default_price: input.default_price,
    icon: input.icon || 'scissors',
    color: input.color || '#3b82f6',
    active: true,
  };

  const extendedPayload = {
    ...basePayload,
    cost_price: isPhysicalProduct ? Number(input.cost_price || 0) : 0,
    stock_quantity: isPhysicalProduct && input.stock_quantity !== undefined ? input.stock_quantity : null,
    min_stock: isPhysicalProduct && input.min_stock !== undefined ? input.min_stock : null,
  };

  let { data, error } = await supabase
    .from('products')
    .insert(extendedPayload)
    .select()
    .single();

  if (error && (error.message?.includes('cost_price') || error.code === '42703')) {
    const fallback = await supabase
      .from('products')
      .insert(basePayload)
      .select()
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message);

  // Se for serviço e possuir peças vinculadas (service_products), persiste
  if (data && input.type === 'service' && input.service_products && input.service_products.length > 0) {
    const links = input.service_products
      .filter((sp) => sp.product_id && Number(sp.quantity) > 0)
      .map((sp) => ({
        user_id: user.id,
        service_id: data.id,
        product_id: sp.product_id,
        quantity: Number(sp.quantity),
      }));

    if (links.length > 0) {
      await supabase.from('service_products').insert(links);
    }
  }

  revalidatePath('/produtos');
  revalidatePath('/vendas');
  revalidatePath('/');
  return data;
}

export async function updateProduct(
  id: string,
  input: {
    name: string;
    type?: ProductType;
    default_price: number;
    cost_price?: number;
    stock_quantity?: number | null;
    min_stock?: number | null;
    service_products?: ServiceProductInput[];
    icon?: string;
    color?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const isPhysicalProduct = input.type === 'product';
  const basePayload = {
    name: input.name.trim(),
    type: input.type,
    default_price: input.default_price,
    icon: input.icon,
    color: input.color,
  };

  const extendedPayload = {
    ...basePayload,
    cost_price: isPhysicalProduct ? Number(input.cost_price || 0) : 0,
    stock_quantity: isPhysicalProduct && input.stock_quantity !== undefined ? input.stock_quantity : null,
    min_stock: isPhysicalProduct && input.min_stock !== undefined ? input.min_stock : null,
  };

  let { error } = await supabase
    .from('products')
    .update(extendedPayload)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error && (error.message?.includes('cost_price') || error.code === '42703')) {
    const fallback = await supabase
      .from('products')
      .update(basePayload)
      .eq('id', id)
      .eq('user_id', user.id);
    error = fallback.error;
  }

  if (error) throw new Error(error.message);

  // Sincroniza peças vinculadas se for serviço
  if (input.type === 'service' && input.service_products !== undefined) {
    await supabase
      .from('service_products')
      .delete()
      .eq('service_id', id)
      .eq('user_id', user.id);

    const links = input.service_products
      .filter((sp) => sp.product_id && Number(sp.quantity) > 0)
      .map((sp) => ({
        user_id: user.id,
        service_id: id,
        product_id: sp.product_id,
        quantity: Number(sp.quantity),
      }));

    if (links.length > 0) {
      await supabase.from('service_products').insert(links);
    }
  } else if (input.type === 'product') {
    await supabase
      .from('service_products')
      .delete()
      .eq('service_id', id)
      .eq('user_id', user.id);
  }

  revalidatePath('/produtos');
  revalidatePath('/vendas');
  revalidatePath('/');
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

