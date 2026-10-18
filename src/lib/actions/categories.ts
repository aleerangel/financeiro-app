'use server';

import { createClient } from '@/lib/supabase/server';
import { Category } from '@/types/database';

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

  return categories;
}
