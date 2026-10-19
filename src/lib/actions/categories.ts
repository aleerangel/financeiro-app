'use server';

import { createClient } from '@/lib/supabase/server';
import { Category, CategoryType } from '@/types/database';
import { revalidatePath } from 'next/cache';

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: CategoryType;
  color?: string;
  icon?: string;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Não autenticado');
  }

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao buscar categorias:', error);
    return [];
  }

  // Se o usuário não tiver categorias (ex: conta criada antes do trigger), cria as categorias padrão
  if (!categories || categories.length === 0) {
    const defaultCategories = [
      { user_id: user.id, name: 'Alimentação', type: 'expense', icon: 'utensils', color: '#ef4444', is_default: true },
      { user_id: user.id, name: 'Moradia', type: 'expense', icon: 'home', color: '#f97316', is_default: true },
      { user_id: user.id, name: 'Transporte', type: 'expense', icon: 'car', color: '#f59e0b', is_default: true },
      { user_id: user.id, name: 'Lazer', type: 'expense', icon: 'film', color: '#8b5cf6', is_default: true },
      { user_id: user.id, name: 'Saúde', type: 'expense', icon: 'activity', color: '#ec4899', is_default: true },
      { user_id: user.id, name: 'Educação', type: 'expense', icon: 'book-open', color: '#06b6d4', is_default: true },
      { user_id: user.id, name: 'Outras Despesas', type: 'expense', icon: 'more-horizontal', color: '#64748b', is_default: true },
      { user_id: user.id, name: 'Salário', type: 'income', icon: 'briefcase', color: '#10b981', is_default: true },
      { user_id: user.id, name: 'Investimentos', type: 'income', icon: 'trending-up', color: '#059669', is_default: true },
      { user_id: user.id, name: 'Outras Receitas', type: 'income', icon: 'plus-circle', color: '#34d399', is_default: true },
    ];

    const { data: inserted } = await supabase
      .from('categories')
      .insert(defaultCategories)
      .select();

    return inserted || [];
  }

  // Deduplicação defensiva em memória (por nome e tipo) para garantir que nunca apareçam duplicadas na interface
  const uniqueCategories: Category[] = [];
  const seen = new Set<string>();

  for (const cat of categories) {
    const key = `${cat.name.trim().toLowerCase()}_${cat.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCategories.push(cat);
    }
  }

  return uniqueCategories;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  if (!input.name.trim()) {
    throw new Error('O nome da categoria é obrigatório.');
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([
      {
        user_id: user.id,
        name: input.name.trim(),
        type: input.type,
        color: input.color || '#10b981',
        icon: input.icon || 'tag',
        is_default: false,
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Já existe uma categoria chamada "${input.name.trim()}" deste tipo.`);
    }
    console.error('Erro ao criar categoria:', error);
    throw new Error('Não foi possível criar a categoria.');
  }

  revalidatePath('/categorias');
  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
  revalidatePath('/recorrencias');

  return data;
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error('O nome da categoria não pode ficar vazio.');
    updates.name = input.name.trim();
  }
  if (input.type !== undefined) updates.type = input.type;
  if (input.color !== undefined) updates.color = input.color;
  if (input.icon !== undefined) updates.icon = input.icon;

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Já existe uma categoria com este nome e tipo.');
    }
    console.error('Erro ao atualizar categoria:', error);
    throw new Error('Não foi possível atualizar a categoria.');
  }

  revalidatePath('/categorias');
  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
  revalidatePath('/recorrencias');

  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Erro ao excluir categoria:', error);
    throw new Error('Não foi possível excluir a categoria.');
  }

  revalidatePath('/categorias');
  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
  revalidatePath('/recorrencias');
}
