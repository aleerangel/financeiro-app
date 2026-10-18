'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { CreditCard } from '@/types/database';

export interface CreditCardWithUsage extends CreditCard {
  used_limit: number;
  available_limit: number;
}

export async function getCreditCards(): Promise<CreditCardWithUsage[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Não autenticado');
  }

  const { data: cards, error: cardsError } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (cardsError || !cards) {
    console.error('Erro ao buscar cartões:', cardsError);
    return [];
  }

  // Busca compras em cartão que ainda não foram pagas (faturas abertas/pendentes)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('credit_card_id, amount, is_paid')
    .eq('user_id', user.id)
    .eq('payment_method', 'credit')
    .eq('is_paid', false)
    .not('credit_card_id', 'is', null);

  const usageByCard = new Map<string, number>();

  if (transactions) {
    for (const t of transactions) {
      if (!t.credit_card_id) continue;
      const current = usageByCard.get(t.credit_card_id) || 0;
      usageByCard.set(t.credit_card_id, current + Number(t.amount));
    }
  }

  return cards.map((card) => {
    const limit = Number(card.credit_limit) || 0;
    const used = usageByCard.get(card.id) || 0;
    return {
      ...card,
      used_limit: used,
      available_limit: Math.max(0, limit - used),
    };
  });
}

export async function createCreditCard(formData: {
  name: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  color?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data, error } = await supabase
    .from('credit_cards')
    .insert({
      user_id: user.id,
      name: formData.name.trim(),
      credit_limit: formData.credit_limit,
      closing_day: formData.closing_day,
      due_day: formData.due_day,
      color: formData.color || '#8b5cf6',
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/cartoes');
  revalidatePath('/dashboard');
  return data;
}

export async function updateCreditCard(
  id: string,
  formData: {
    name: string;
    credit_limit: number;
    closing_day: number;
    due_day: number;
    color?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('credit_cards')
    .update({
      name: formData.name.trim(),
      credit_limit: formData.credit_limit,
      closing_day: formData.closing_day,
      due_day: formData.due_day,
      color: formData.color,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/cartoes');
  revalidatePath('/dashboard');
}

export async function deleteCreditCard(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('credit_cards')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/cartoes');
  revalidatePath('/dashboard');
}
