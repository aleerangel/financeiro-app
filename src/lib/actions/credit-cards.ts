'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { CreditCard, Transaction } from '@/types/database';
import { getZonedParts } from '@/lib/date-utils';

export interface CreditCardWithUsage extends CreditCard {
  used_limit: number;
  available_limit: number;
  current_invoice: number;
}

export async function getCreditCards(
  referenceMonth?: number,
  referenceYear?: number
): Promise<CreditCardWithUsage[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

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
    .select('credit_card_id, amount, is_paid, due_date')
    .eq('user_id', user.id)
    .eq('payment_method', 'credit')
    .eq('is_paid', false)
    .not('credit_card_id', 'is', null);

  const usageByCard = new Map<string, number>();
  const currentInvoiceByCard = new Map<string, number>();

  const { month: defaultM, year: defaultY } = getZonedParts();
  const targetM = referenceMonth !== undefined ? referenceMonth : defaultM;
  const targetY = referenceYear !== undefined ? referenceYear : defaultY;

  const targetStartDate = `${targetY}-${String(targetM + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(targetY, targetM + 1, 0).getDate();
  const targetEndDate = `${targetY}-${String(targetM + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  if (transactions) {
    for (const t of transactions) {
      if (!t.credit_card_id) continue;
      const amt = Number(t.amount) || 0;

      // Limite total utilizado = soma de todas as transações não pagas de todas as faturas
      const currentUsage = usageByCard.get(t.credit_card_id) || 0;
      usageByCard.set(t.credit_card_id, currentUsage + amt);

      // Fatura atual = compras não pagas cuja data de vencimento da fatura cai no mês de referência
      if (t.due_date && t.due_date >= targetStartDate && t.due_date <= targetEndDate) {
        const currentInvoice = currentInvoiceByCard.get(t.credit_card_id) || 0;
        currentInvoiceByCard.set(t.credit_card_id, currentInvoice + amt);
      }
    }
  }

  return cards.map((card) => {
    const limit = Number(card.credit_limit) || 0;
    const used = usageByCard.get(card.id) || 0;
    const currentInvoice = currentInvoiceByCard.get(card.id) || 0;
    return {
      ...card,
      used_limit: used,
      available_limit: Math.max(0, limit - used),
      current_invoice: currentInvoice,
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

export async function getCreditCardTransactions(cardId: string): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories(*),
      account:accounts(*),
      credit_card:credit_cards(*)
    `)
    .eq('user_id', user.id)
    .eq('credit_card_id', cardId)
    .order('due_date', { ascending: true })
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar faturas do cartão:', error);
    return [];
  }

  return (data as unknown as Transaction[]) || [];
}

export async function setCreditCardInvoicePaid(
  cardId: string,
  month: number,
  year: number,
  isPaid: boolean
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { error } = await supabase
    .from('transactions')
    .update({
      is_paid: isPaid,
      paid_at: isPaid ? new Date().toISOString() : null,
    })
    .eq('user_id', user.id)
    .eq('credit_card_id', cardId)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/cartoes');
  revalidatePath('/transacoes');
  revalidatePath('/dashboard');
}

export interface PayInvoiceResult {
  paidAmount: number;
  remainingPending: number;
  isFullyPaid: boolean;
}

export async function payCreditCardInvoiceAmount(
  cardId: string,
  month: number,
  year: number,
  amountToPay: number
): Promise<PayInvoiceResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  if (isNaN(amountToPay) || amountToPay <= 0) {
    throw new Error('Informe um valor de pagamento válido maior que zero.');
  }

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // Busca todos os lançamentos pendentes desta fatura
  const { data: pendingTxs, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('credit_card_id', cardId)
    .eq('is_paid', false)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('transaction_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const items = (pendingTxs as unknown as Transaction[]) || [];
  const totalPending = items.reduce((sum, item) => sum + Number(item.amount), 0);

  if (items.length === 0 || totalPending <= 0) {
    return { paidAmount: 0, remainingPending: 0, isFullyPaid: true };
  }

  const nowIso = new Date().toISOString();

  // Caso 1: Pagamento total ou valor maior/igual ao total pendente
  if (amountToPay >= totalPending - 0.009) {
    await setCreditCardInvoicePaid(cardId, month, year, true);
    return { paidAmount: totalPending, remainingPending: 0, isFullyPaid: true };
  }

  // Caso 2: Pagamento parcial
  let remaining = amountToPay;

  for (const item of items) {
    if (remaining <= 0.001) break;

    const itemAmt = Number(item.amount);

    if (itemAmt <= remaining + 0.009) {
      // Quita o item inteiro
      await supabase
        .from('transactions')
        .update({
          is_paid: true,
          paid_at: nowIso,
        })
        .eq('id', item.id)
        .eq('user_id', user.id);

      remaining -= itemAmt;
    } else {
      // Abate parcialmente este item: divide em parcela paga e saldo pendente
      const paidPart = Math.round(remaining * 100) / 100;
      const unpaidPart = Math.round((itemAmt - remaining) * 100) / 100;

      // 1. Atualiza o item original para o valor restante não pago
      await supabase
        .from('transactions')
        .update({
          amount: unpaidPart,
        })
        .eq('id', item.id)
        .eq('user_id', user.id);

      // 2. Insere a parte quitada
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          description: `${item.description} (Parcial)`,
          amount: paidPart,
          type: item.type,
          payment_method: item.payment_method,
          transaction_date: item.transaction_date,
          due_date: item.due_date,
          category_id: item.category_id,
          credit_card_id: item.credit_card_id,
          installment_group_id: item.installment_group_id,
          current_installment: item.current_installment,
          total_installments: item.total_installments,
          notes: item.notes,
          is_paid: true,
          paid_at: nowIso,
        });

      remaining = 0;
      break;
    }
  }

  revalidatePath('/cartoes');
  revalidatePath('/transacoes');
  revalidatePath('/dashboard');

  return {
    paidAmount: amountToPay,
    remainingPending: Math.max(0, totalPending - amountToPay),
    isFullyPaid: false,
  };
}


