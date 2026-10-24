'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { Category, CategoryType, FinancialScope, BusinessSegment } from '@/types/database';
import { SEGMENTS_CONFIG } from '@/lib/business-presets';
import { revalidatePath } from 'next/cache';

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  scope?: FinancialScope;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: CategoryType;
  color?: string;
  icon?: string;
  scope?: FinancialScope;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

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
      { user_id: user.id, name: 'Insumos & Barbearia', type: 'expense', icon: 'scissors', color: '#f59e0b', is_default: true },
      { user_id: user.id, name: 'Alimentação', type: 'expense', icon: 'utensils', color: '#ef4444', is_default: true },
      { user_id: user.id, name: 'Moradia', type: 'expense', icon: 'home', color: '#f97316', is_default: true },
      { user_id: user.id, name: 'Transporte', type: 'expense', icon: 'car', color: '#f59e0b', is_default: true },
      { user_id: user.id, name: 'Lazer', type: 'expense', icon: 'film', color: '#8b5cf6', is_default: true },
      { user_id: user.id, name: 'Saúde', type: 'expense', icon: 'activity', color: '#ec4899', is_default: true },
      { user_id: user.id, name: 'Educação', type: 'expense', icon: 'book-open', color: '#06b6d4', is_default: true },
      { user_id: user.id, name: 'Outras Despesas', type: 'expense', icon: 'more-horizontal', color: '#64748b', is_default: true },
      { user_id: user.id, name: 'Barbearia', type: 'income', icon: 'scissors', color: '#10b981', is_default: true },
      { user_id: user.id, name: 'Salário', type: 'income', icon: 'briefcase', color: '#3b82f6', is_default: true },
      { user_id: user.id, name: 'Investimentos', type: 'income', icon: 'trending-up', color: '#059669', is_default: true },
      { user_id: user.id, name: 'Outras Receitas', type: 'income', icon: 'plus-circle', color: '#34d399', is_default: true },
    ];

    const { data: inserted } = await supabase
      .from('categories')
      .insert(defaultCategories)
      .select();

    return inserted || [];
  }

  // Garante que a categoria de despesa "Insumos & Barbearia" exista para usuários existentes
  const hasInsumosCategory = categories.some(
    (c) =>
      c.type === 'expense' &&
      (c.name.trim().toLowerCase() === 'insumos & barbearia' ||
        c.name.trim().toLowerCase() === 'insumos barbearia')
  );

  if (!hasInsumosCategory) {
    const { data: createdInsumos } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: 'Insumos & Barbearia',
        type: 'expense',
        icon: 'scissors',
        color: '#f59e0b',
        is_default: true,
      })
      .select()
      .maybeSingle();

    if (createdInsumos) {
      categories.unshift(createdInsumos);
    }
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

  const baseRow = {
    user_id: user.id,
    name: input.name.trim(),
    type: input.type,
    color: input.color || '#10b981',
    icon: input.icon || 'tag',
    is_default: false,
  };

  let { data, error } = await supabase
    .from('categories')
    .insert([{ ...baseRow, ...(input.scope ? { scope: input.scope } : {}) }])
    .select()
    .single();

  // Fallback caso a coluna scope ainda não tenha sido migrada no banco
  if (error && input.scope && error.message?.includes('scope')) {
    const retry = await supabase
      .from('categories')
      .insert([baseRow])
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

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
  if (input.scope !== undefined) updates.scope = input.scope;

  let { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error && input.scope !== undefined && error.message?.includes('scope')) {
    delete updates.scope;
    const retry = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

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

export async function getOrCreateBusinessIncomeCategory(
  userId: string,
  segment: BusinessSegment = 'barbearia',
  businessName?: string | null
): Promise<string> {
  const supabase = await createClient();
  const segmentConfig = SEGMENTS_CONFIG[segment] || SEGMENTS_CONFIG.outro;
  const suggestedIncome = segmentConfig.suggestedCategories?.find((c) => c.type === 'income');
  const targetCategoryName = suggestedIncome?.name || (businessName ? `Receitas de ${businessName}` : 'Atendimentos & Vendas');
  const targetIcon = suggestedIncome?.icon || 'briefcase';
  const targetColor = suggestedIncome?.color || '#10b981';

  // 1. Procura categoria de receita existente para este negócio ou segmento
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'income')
    .or(`name.ilike.${targetCategoryName},name.ilike.Barbearia,scope.eq.business`)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  // 2. Se não existir, cria a categoria contextual para o segmento
  const { data: created, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: targetCategoryName,
      type: 'income',
      icon: targetIcon,
      color: targetColor,
      scope: 'business',
      is_default: true,
    })
    .select('id')
    .maybeSingle();

  if (created?.id) {
    return created.id;
  }

  // Fallback caso já tenha sido criada concorrentemente
  const { data: fallback } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'income')
    .ilike('name', targetCategoryName)
    .limit(1)
    .maybeSingle();

  if (fallback?.id) {
    return fallback.id;
  }

  throw new Error(error?.message || 'Não foi possível encontrar ou criar a categoria de receita do negócio.');
}

// Compatibilidade retroativa
export async function getOrCreateBarbeariaCategory(userId: string): Promise<string> {
  return getOrCreateBusinessIncomeCategory(userId, 'barbearia');
}

export async function getOrCreateInvestimentosCategory(userId: string): Promise<string> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .eq('type', 'income')
    .or('name.ilike.%Investimento%,name.ilike.%Rendimento%')
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: 'Investimentos',
      type: 'income',
      icon: 'trending-up',
      color: '#059669',
      is_default: true,
    })
    .select('id')
    .maybeSingle();

  if (created?.id) {
    return created.id;
  }

  throw new Error(error?.message || 'Não foi possível encontrar ou criar a categoria de Rendimentos.');
}
