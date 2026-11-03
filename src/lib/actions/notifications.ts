'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  AppNotification,
  UserNotificationPreferences,
  PushSubscriptionJSON,
} from '@/types/notifications';
import { getTodayYMD, addDaysToYMD, formatDateBR } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import { dispatchWebPushToUser } from '@/lib/web-push';

export async function getNotificationPreferences(targetUserId?: string): Promise<UserNotificationPreferences> {
  const supabase = await createClient();
  const user = targetUserId ? { id: targetUserId } : await getAuthenticatedUser();

  const defaultPreferences: UserNotificationPreferences = {
    user_id: user?.id || '',
    email_notifications_enabled: false,
    push_notifications_enabled: false,
    notify_bills: true,
    notify_credits: true,
    notify_client_returns: true,
    notify_birthdays: true,
    notify_days_before: [0, 1, 3],
    push_subscription: null,
  };

  if (!user) return defaultPreferences;

  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      return defaultPreferences;
    }

    return {
      user_id: user.id,
      email_notifications_enabled: Boolean(data.email_notifications_enabled),
      push_notifications_enabled: Boolean(data.push_notifications_enabled),
      notify_bills: data.notify_bills ?? true,
      notify_credits: data.notify_credits ?? true,
      notify_client_returns: data.notify_client_returns ?? true,
      notify_birthdays: data.notify_birthdays ?? true,
      notify_days_before: Array.isArray(data.notify_days_before) && data.notify_days_before.length > 0
        ? data.notify_days_before
        : [0, 1, 3],
      push_subscription: data.push_subscription || null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch {
    return defaultPreferences;
  }
}

export async function saveNotificationPreferences(
  input: Partial<Omit<UserNotificationPreferences, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserNotificationPreferences> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  const current = await getNotificationPreferences();
  const payload = {
    user_id: user.id,
    email_notifications_enabled: input.email_notifications_enabled ?? current.email_notifications_enabled,
    push_notifications_enabled: input.push_notifications_enabled ?? current.push_notifications_enabled,
    notify_bills: input.notify_bills ?? current.notify_bills,
    notify_credits: input.notify_credits ?? current.notify_credits,
    notify_client_returns: input.notify_client_returns ?? current.notify_client_returns,
    notify_birthdays: input.notify_birthdays ?? current.notify_birthdays,
    notify_days_before: input.notify_days_before ?? current.notify_days_before,
    push_subscription: input.push_subscription !== undefined ? input.push_subscription : current.push_subscription,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('user_notification_preferences')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message || 'Erro ao salvar preferências de notificações.');
  }

  revalidatePath('/dashboard');
  return payload;
}

/**
 * Salva a inscrição do dispositivo atual no banco para suporte a múltiplos aparelhos
 */
export async function savePushSubscription(
  subscriptionJSON: PushSubscriptionJSON,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return { success: false, error: 'Não autenticado' };
  if (!subscriptionJSON.endpoint || !subscriptionJSON.keys?.p256dh || !subscriptionJSON.keys?.auth) {
    return { success: false, error: 'Dados de inscrição Web Push inválidos.' };
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: subscriptionJSON.endpoint,
      p256dh: subscriptionJSON.keys.p256dh,
      auth: subscriptionJSON.keys.auth,
      user_agent: userAgent || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove a inscrição de um aparelho ao desativar o Web Push
 */
export async function removePushSubscription(
  endpoint: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return { success: false, error: 'Não autenticado' };

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getNotifications(limit: number = 30): Promise<AppNotification[]> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as AppNotification[];
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error || count === null) return 0;
  return count;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/dashboard');
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false);

  revalidatePath('/dashboard');
}

export async function deleteNotification(id: string): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) throw new Error('Não autenticado');

  await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/dashboard');
}

/**
 * Motor gerador de alertas inteligentes com antecedência configurável e disparo Web Push
 */
export async function syncAndGenerateNotifications(targetUserId?: string): Promise<{ createdCount: number }> {
  const supabase = await createClient();
  const user = targetUserId ? { id: targetUserId } : await getAuthenticatedUser();

  if (!user) return { createdCount: 0 };

  const prefs = await getNotificationPreferences(user.id);
  const today = getTodayYMD();
  const daysBeforeList = Array.isArray(prefs.notify_days_before) && prefs.notify_days_before.length > 0
    ? Array.from(new Set(prefs.notify_days_before)).sort((a, b) => a - b)
    : [0, 1, 3];

  const rowsToInsert: Array<{
    user_id: string;
    category: AppNotification['category'];
    title: string;
    message: string;
    action_url: string;
    action_label: string;
    idempotency_key: string;
    metadata?: Record<string, unknown>;
  }> = [];

  // 1. Contas a Pagar (Despesas) com Antecedência e em Atraso
  if (prefs.notify_bills) {
    // A. Contas em Atraso (sempre verificadas no dia atual)
    const { data: overdueBills } = await supabase
      .from('transactions')
      .select('id, description, amount, due_date, type')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .eq('is_paid', false)
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(10);

    if (overdueBills && overdueBills.length > 0) {
      for (const bill of overdueBills) {
        rowsToInsert.push({
          user_id: user.id,
          category: 'bill_overdue',
          title: 'Conta em Atraso',
          message: `A despesa "${bill.description}" de ${formatCurrency(bill.amount)} venceu em ${formatDateBR(bill.due_date)}.`,
          action_url: '/transacoes',
          action_label: 'Ver no Extrato',
          idempotency_key: `bill_overdue:${bill.id}:${today}`,
          metadata: { transaction_id: bill.id, amount: bill.amount, due_date: bill.due_date },
        });
      }
    }

    // B. Contas no dia e com Antecedência configurada
    for (const daysBefore of daysBeforeList) {
      const targetDate = addDaysToYMD(today, daysBefore);
      const { data: advanceBills } = await supabase
        .from('transactions')
        .select('id, description, amount, due_date, type')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('is_paid', false)
        .eq('due_date', targetDate)
        .limit(10);

      if (advanceBills && advanceBills.length > 0) {
        for (const bill of advanceBills) {
          let title = 'Conta Vence Hoje';
          let message = `A despesa "${bill.description}" de ${formatCurrency(bill.amount)} vence hoje.`;

          if (daysBefore === 1) {
            title = 'Conta Vence Amanhã';
            message = `A despesa "${bill.description}" de ${formatCurrency(bill.amount)} vence amanhã (${formatDateBR(bill.due_date)}).`;
          } else if (daysBefore > 1) {
            title = 'Conta a Vencer';
            message = `A despesa "${bill.description}" de ${formatCurrency(bill.amount)} vence em ${daysBefore} dias (${formatDateBR(bill.due_date)}).`;
          }

          rowsToInsert.push({
            user_id: user.id,
            category: 'bill_due',
            title,
            message,
            action_url: '/transacoes',
            action_label: 'Ver no Extrato',
            idempotency_key: `bill_due:${bill.id}:${targetDate}:day_${daysBefore}`,
            metadata: { transaction_id: bill.id, amount: bill.amount, due_date: bill.due_date, days_before: daysBefore },
          });
        }
      }
    }
  }

  // 2. Fiados / Vendas a Prazo
  if (prefs.notify_credits) {
    // A. Fiados em atraso
    const { data: overdueDebts } = await supabase
      .from('sales')
      .select('id, client_name, total_amount, remaining_amount, due_date, status')
      .eq('user_id', user.id)
      .eq('payment_method', 'on_credit')
      .neq('status', 'paid')
      .not('due_date', 'is', null)
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(10);

    if (overdueDebts && overdueDebts.length > 0) {
      for (const debt of overdueDebts) {
        rowsToInsert.push({
          user_id: user.id,
          category: 'credit_overdue',
          title: 'Fiado em Atraso',
          message: `${debt.client_name} tem pagamento de ${formatCurrency(debt.remaining_amount || debt.total_amount)} vencido em ${formatDateBR(debt.due_date)}.`,
          action_url: '/fiados',
          action_label: 'Cobrar no WhatsApp',
          idempotency_key: `credit_overdue:${debt.id}:${today}`,
          metadata: { sale_id: debt.id, client_name: debt.client_name, remaining_amount: debt.remaining_amount },
        });
      }
    }

    // B. Fiados vencendo no dia ou com antecedência
    for (const daysBefore of daysBeforeList) {
      const targetDate = addDaysToYMD(today, daysBefore);
      const { data: advanceDebts } = await supabase
        .from('sales')
        .select('id, client_name, total_amount, remaining_amount, due_date, status')
        .eq('user_id', user.id)
        .eq('payment_method', 'on_credit')
        .neq('status', 'paid')
        .eq('due_date', targetDate)
        .limit(10);

      if (advanceDebts && advanceDebts.length > 0) {
        for (const debt of advanceDebts) {
          let title = 'Fiado Vence Hoje';
          let message = `O pagamento de ${debt.client_name} (${formatCurrency(debt.remaining_amount || debt.total_amount)}) vence hoje.`;

          if (daysBefore === 1) {
            title = 'Fiado Vence Amanhã';
            message = `O pagamento de ${debt.client_name} (${formatCurrency(debt.remaining_amount || debt.total_amount)}) vence amanhã.`;
          } else if (daysBefore > 1) {
            title = 'Fiado a Vencer';
            message = `O pagamento de ${debt.client_name} (${formatCurrency(debt.remaining_amount || debt.total_amount)}) vence em ${daysBefore} dias.`;
          }

          rowsToInsert.push({
            user_id: user.id,
            category: 'bill_due',
            title,
            message,
            action_url: '/fiados',
            action_label: 'Ver Fiados',
            idempotency_key: `credit_due:${debt.id}:${targetDate}:day_${daysBefore}`,
            metadata: { sale_id: debt.id, client_name: debt.client_name, days_before: daysBefore },
          });
        }
      }
    }
  }

  // 3. Aniversariantes do Dia
  if (prefs.notify_birthdays) {
    const todayParts = today.split('-');
    const todayMonthDay = `${todayParts[1]}-${todayParts[2]}`;

    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, phone, birth_date')
      .eq('user_id', user.id)
      .not('birth_date', 'is', null)
      .limit(100);

    if (clients) {
      for (const client of clients) {
        if (!client.birth_date) continue;
        const parts = client.birth_date.split('-');
        if (parts.length >= 3 && `${parts[1]}-${parts[2]}` === todayMonthDay) {
          rowsToInsert.push({
            user_id: user.id,
            category: 'birthday',
            title: '🎂 Aniversariante do Dia',
            message: `Hoje é aniversário de ${client.name}! Envie uma mensagem e fidelize seu cliente.`,
            action_url: '/clientes',
            action_label: 'Enviar Parabéns',
            idempotency_key: `birthday:${client.id}:${today}`,
            metadata: { client_id: client.id, name: client.name, phone: client.phone },
          });
        }
      }
    }
  }

  // 4. Inserção com idempotência no banco de dados
  if (rowsToInsert.length === 0) {
    return { createdCount: 0 };
  }

  // Descobre quais dessas chaves já foram inseridas anteriormente
  const keysToCheck = rowsToInsert.map((r) => r.idempotency_key);
  const { data: existingRows } = await supabase
    .from('notifications')
    .select('idempotency_key')
    .eq('user_id', user.id)
    .in('idempotency_key', keysToCheck);

  const existingKeySet = new Set((existingRows || []).map((x) => x.idempotency_key));
  const trulyNewRows = rowsToInsert.filter((r) => !existingKeySet.has(r.idempotency_key));

  if (trulyNewRows.length > 0) {
    try {
      await supabase.from('notifications').upsert(trulyNewRows, {
        onConflict: 'user_id,idempotency_key',
        ignoreDuplicates: true,
      });
    } catch (err) {
      console.warn('Erro ao inserir notificações idempotentes:', err);
    }

    // 5. Disparo de Web Push para todos os aparelhos ativos caso o push esteja ativado
    if (prefs.push_notifications_enabled) {
      try {
        if (trulyNewRows.length === 1) {
          const first = trulyNewRows[0];
          await dispatchWebPushToUser(user.id, {
            title: first.title,
            body: first.message,
            url: first.action_url,
          });
        } else {
          const first = trulyNewRows[0];
          await dispatchWebPushToUser(user.id, {
            title: `Alertas Financeiros: ${trulyNewRows.length} novidades`,
            body: `${first.title}: ${first.message} (+${trulyNewRows.length - 1} outros)`,
            url: '/transacoes',
          });
        }
      } catch (err) {
        console.warn('Erro ao despachar Web Push em segundo plano:', err);
      }
    }
  }

  return { createdCount: trulyNewRows.length };
}
