export type NotificationCategory =
  | 'bill_due'
  | 'bill_overdue'
  | 'card_invoice'
  | 'credit_overdue'
  | 'client_return'
  | 'birthday'
  | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  action_url?: string | null;
  action_label?: string | null;
  idempotency_key?: string | null;
  metadata?: Record<string, unknown> | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface UserNotificationPreferences {
  user_id: string;
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  notify_bills: boolean;
  notify_credits: boolean;
  notify_client_returns: boolean;
  notify_birthdays: boolean;
  notify_days_before: number[]; // Dias de antecedência (ex: [0, 1, 3] = no dia, 1 dia antes, 3 dias antes)
  push_subscription?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys: PushSubscriptionKeys;
}

export interface StoredPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
}


