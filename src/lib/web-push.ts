import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';
import { StoredPushSubscription } from '@/types/notifications';

// Configuração padrão das chaves VAPID
const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BCXW6RXG8oJqugvGFiwBMuTlao59blJtkwPrEGonTjYNYTvAPRl2pJCLg8V2lTqkYcjCaNWTTpOcQdM8eQOa8SA';
const vapidPrivateKey =
  process.env.VAPID_PRIVATE_KEY || 'gDEniivghaxzv-4lvEFjfltUUMnoQ-Ho9zmC_lGXP7w';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@financeiroapp.com';

try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} catch (err) {
  console.warn('Erro ao configurar VAPID para Web Push:', err);
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Envia notificação Web Push para todos os aparelhos cadastrados de um usuário
 */
export async function dispatchWebPushToUser(
  userId: string,
  payload: WebPushPayload
): Promise<{ successCount: number; failureCount: number }> {
  const supabase = await createClient();

  // Busca todos os endpoints cadastrados do usuário
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error || !subs || subs.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-72x72.png',
    url: payload.url || '/transacoes',
    tag: payload.tag || 'general-alert',
    data: {
      url: payload.url || '/transacoes',
      ...payload.data,
    },
  });

  let successCount = 0;
  let failureCount = 0;
  const expiredEndpoints: string[] = [];

  const promises = (subs as StoredPushSubscription[]).map(async (sub) => {
    try {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      await webpush.sendNotification(pushConfig, payloadString);
      successCount++;
    } catch (err: unknown) {
      failureCount++;
      const statusCode = (err as { statusCode?: number })?.statusCode;
      // 404 (Not Found) ou 410 (Gone) significam que a permissão foi revogada ou expirou
      if (statusCode === 404 || statusCode === 410) {
        expiredEndpoints.push(sub.endpoint);
      }
    }
  });

  await Promise.allSettled(promises);

  // Expulga automaticamente aparelhos que revogaram o push
  if (expiredEndpoints.length > 0) {
    try {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    } catch {
      // Ignora erro de limpeza silenciosa
    }
  }

  return { successCount, failureCount };
}

