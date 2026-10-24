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
  push_subscription?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}
