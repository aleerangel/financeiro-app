-- ==============================================================================
-- MIGRATION: Módulo de Notificações Unificado e Preferências de Alertas
-- ==============================================================================

-- 1. Tabela de Notificações Persistente
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'bill_due', 'bill_overdue', 'card_invoice', 'credit_overdue', 'client_return', 'birthday', 'system'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label VARCHAR(100),
  idempotency_key VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice único condicional para evitar notificações duplicadas do mesmo evento no mesmo dia
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency 
  ON public.notifications (user_id, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON public.notifications (user_id, is_read, created_at DESC);

-- Ativa RLS para notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- 2. Tabela de Preferências de Notificação por Usuário
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications_enabled BOOLEAN DEFAULT FALSE,
  push_notifications_enabled BOOLEAN DEFAULT FALSE,
  notify_bills BOOLEAN DEFAULT TRUE,
  notify_credits BOOLEAN DEFAULT TRUE,
  notify_client_returns BOOLEAN DEFAULT TRUE,
  notify_birthdays BOOLEAN DEFAULT TRUE,
  push_subscription JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativa RLS para user_notification_preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_notification_preferences_select" ON public.user_notification_preferences;
CREATE POLICY "user_notification_preferences_select"
  ON public.user_notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_notification_preferences_insert" ON public.user_notification_preferences;
CREATE POLICY "user_notification_preferences_insert"
  ON public.user_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_notification_preferences_update" ON public.user_notification_preferences;
CREATE POLICY "user_notification_preferences_update"
  ON public.user_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_notification_preferences_delete" ON public.user_notification_preferences;
CREATE POLICY "user_notification_preferences_delete"
  ON public.user_notification_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
