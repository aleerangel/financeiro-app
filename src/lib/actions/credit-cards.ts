'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { CreditCard, Transaction } from '@/types/database';
import { getZonedParts } from '@/lib/date-utils';
import {
  CardInvoiceStatus,
  getCardCycleInfo,
  getCardInvoiceStatus,
} from '@/lib/credit-card-utils';

export interface CreditCardWithUsage extends CreditCard {
  used_limit: number;
  available_limit: number;
  current_invoice: number;
  invoice_status?: CardInvoiceStatus;
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
    .select('id, user_id, name, credit_limit, closing_day, due_day, color, created_at, updated_at')
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
  const txsByCard = new Map<string, { amount: number; due_date: string | null }[]>();

  const { month: defaultM, year: defaultY } = getZonedParts();
  const isHistorical =
    (referenceMonth !== undefined && referenceMonth !== defaultM) ||
    (referenceYear !== undefined && referenceYear !== defaultY);
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

      const list = txsByCard.get(t.credit_card_id) || [];
      list.push({ amount: amt, due_date: t.due_date });
      txsByCard.set(t.credit_card_id, list);
    }
  }

  const now = new Date();

  return cards.map((card) => {
    const limit = Number(card.credit_limit) || 0;
    const used = usageByCard.get(card.id) || 0;
    const cardTxs = txsByCard.get(card.id) || [];

    let currentInvoice = 0;
    let invoiceStatus: CardInvoiceStatus;

    if (isHistorical) {
      // Consulta para mês histórico fixo (ex: tela de resumo anual/mensal)
      currentInvoice = cardTxs
        .filter((t) => t.due_date && t.due_date >= targetStartDate && t.due_date <= targetEndDate)
        .reduce((sum, t) => sum + t.amount, 0);

      invoiceStatus = getCardInvoiceStatus(card, targetM, targetY, now);
    } else {
      // Ciclo ativo no tempo presente
      const cycle = getCardCycleInfo(card, now);

      // 1. Verifica se há saldo pendente na fatura fechada do ciclo anterior
      const prevPending = cardTxs
        .filter((t) => t.due_date === cycle.prevDueDateStr)
        .reduce((sum, t) => sum + t.amount, 0);

      // 2. Saldo pendente na fatura aberta atual
      const openPending = cardTxs
        .filter((t) => t.due_date === cycle.openDueDateStr)
        .reduce((sum, t) => sum + t.amount, 0);

      if (prevPending > 0) {
        // A fatura fechada mais recente ainda não foi paga!
        currentInvoice = prevPending;
        invoiceStatus = getCardInvoiceStatus(card, undefined, undefined, now, {
          hasPendingClosedInvoice: true,
        });
      } else {
        // A fatura fechada anterior já foi quitada (ou não teve despesas).
        // A fatura atual ativa passa a ser a do próximo ciclo (Fatura Aberta).
        currentInvoice = openPending;
        invoiceStatus = getCardInvoiceStatus(card, undefined, undefined, now, {
          hasPendingClosedInvoice: false,
        });
      }
    }

    return {
      ...card,
      used_limit: used,
      available_limit: Math.max(0, limit - used),
      current_invoice: currentInvoice,
      invoice_status: invoiceStatus,
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
  isPaid: boolean,
  accountId?: string | null
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const updatePayload: Record<string, unknown> = {
    is_paid: isPaid,
    paid_at: isPaid ? new Date().toISOString() : null,
  };

  if (!isPaid) {
    updatePayload.account_id = null;
  } else if (accountId !== undefined) {
    updatePayload.account_id = accountId || null;
  }

  const { error } = await supabase
    .from('transactions')
    .update(updatePayload)
    .eq('user_id', user.id)
    .eq('credit_card_id', cardId)
    .gte('due_date', startDate)
    .lte('due_date', endDate);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/cartoes');
  revalidatePath('/contas');
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
  amountToPay: number,
  accountId?: string | null
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
  const totalPending = Math.round(items.reduce((sum, item) => sum + Number(item.amount), 0) * 100) / 100;

  if (items.length === 0 || totalPending <= 0) {
    return { paidAmount: 0, remainingPending: 0, isFullyPaid: true };
  }

  const nowIso = new Date().toISOString();
  const resolvedAccountId = accountId || null;

  // Caso 1: Pagamento total ou valor maior/igual ao total pendente
  if (amountToPay >= totalPending - 0.009) {
    await setCreditCardInvoicePaid(cardId, month, year, true, resolvedAccountId);
    return { paidAmount: totalPending, remainingPending: 0, isFullyPaid: true };
  }

  // Caso 2: Pagamento parcial
  let remaining = Math.round(amountToPay * 100) / 100;

  for (const item of items) {
    if (remaining <= 0.001) break;

    const itemAmt = Math.round(Number(item.amount) * 100) / 100;

    if (itemAmt <= remaining + 0.009) {
      // Quita o item inteiro e vincula à conta bancária pagadora (se informada)
      await supabase
        .from('transactions')
        .update({
          is_paid: true,
          paid_at: nowIso,
          account_id: resolvedAccountId,
        })
        .eq('id', item.id)
        .eq('user_id', user.id);

      remaining = Math.round((remaining - itemAmt) * 100) / 100;
    } else {
      // Abate parcialmente este item: divide em parcela paga e saldo pendente
      const paidPart = Math.round(remaining * 100) / 100;
      const unpaidPart = Math.round((itemAmt - paidPart) * 100) / 100;

      // 1. Atualiza o item original para o valor restante não pago
      await supabase
        .from('transactions')
        .update({
          amount: unpaidPart,
        })
        .eq('id', item.id)
        .eq('user_id', user.id);

      // 2. Insere a parte quitada vinculada à conta pagadora
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
          account_id: resolvedAccountId,
          credit_card_id: item.credit_card_id,
          installment_group_id: item.installment_group_id,
          current_installment: item.current_installment,
          total_installments: item.total_installments,
          notes: item.notes,
          scope: item.scope || 'personal',
          is_paid: true,
          paid_at: nowIso,
        });

      remaining = 0;
      break;
    }
  }

  revalidatePath('/cartoes');
  revalidatePath('/contas');
  revalidatePath('/transacoes');
  revalidatePath('/dashboard');

  return {
    paidAmount: Math.round(amountToPay * 100) / 100,
    remainingPending: Math.round(Math.max(0, totalPending - amountToPay) * 100) / 100,
    isFullyPaid: false,
  };
}


