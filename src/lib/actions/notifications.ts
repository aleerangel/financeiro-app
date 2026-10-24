'use server';

import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { AppNotification, UserNotificationPreferences } from '@/types/notifications';
import { getTodayYMD } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';

export async function getNotificationPreferences(): Promise<UserNotificationPreferences> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  const defaultPreferences: UserNotificationPreferences = {
    user_id: user?.id || '',
    email_notifications_enabled: false,
    push_notifications_enabled: false,
    notify_bills: true,
    notify_credits: true,
    notify_client_returns: true,
    notify_birthdays: true,
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
 * Motor gerador de alertas inteligentes com idempotência por data
 */
export async function syncAndGenerateNotifications(): Promise<void> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) return;

  const prefs = await getNotificationPreferences();
  const today = getTodayYMD();
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

  // 1. Contas a pagar (vencendo hoje ou atrasadas)
  if (prefs.notify_bills) {
    const { data: bills } = await supabase
      .from('transactions')
      .select('id, description, amount, due_date, type')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .eq('is_paid', false)
      .lte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(10);

    if (bills && bills.length > 0) {
      for (const bill of bills) {
        const isOverdue = bill.due_date < today;
        const category = isOverdue ? 'bill_overdue' : 'bill_due';
        const title = isOverdue ? 'Conta em Atraso' : 'Conta Vence Hoje';
        const message = isOverdue
          ? `A despesa "${bill.description}" de ${formatCurrency(bill.amount)} venceu em ${bill.due_date}.`
          : `A despesa "${bill.description}" de ${formatCurrency(bill.amount)} vence hoje.`;

        rowsToInsert.push({
          user_id: user.id,
          category,
          title,
          message,
          action_url: '/transacoes',
          action_label: 'Ver no Extrato',
          idempotency_key: `${category}:${bill.id}:${today}`,
          metadata: { transaction_id: bill.id, amount: bill.amount },
        });
      }
    }
  }

  // 2. Fiados / Vendas a prazo vencidas
  if (prefs.notify_credits) {
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
          message: `${debt.client_name} tem pagamento de ${formatCurrency(debt.remaining_amount || debt.total_amount)} vencido em ${debt.due_date}.`,
          action_url: '/fiados',
          action_label: 'Cobrar no WhatsApp',
          idempotency_key: `credit_overdue:${debt.id}:${today}`,
          metadata: { sale_id: debt.id, client_name: debt.client_name, remaining_amount: debt.remaining_amount },
        });
      }
    }
  }

  // 3. Aniversariantes do dia
  if (prefs.notify_birthdays) {
    // Clientes com birth_date no formato YYYY-MM-DD
    const todayParts = today.split('-'); // [YYYY, MM, DD]
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

  // 4. Inserção com idempotência (ignora se já gerado para aquele evento hoje)
  if (rowsToInsert.length > 0) {
    try {
      await supabase.from('notifications').upsert(rowsToInsert, {
        onConflict: 'user_id,idempotency_key',
        ignoreDuplicates: true,
      });
    } catch {
      // Ignora erro caso chave já exista
    }
  }
}
