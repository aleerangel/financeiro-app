-- ==============================================================================
-- MIGRATION: Web Push Subscriptions & Antecedência Configurável de Notificações
-- ==============================================================================

-- 1. Criação da tabela push_subscriptions para suportar múltiplos dispositivos por usuário
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para buscas rápidas por usuário e endpoint
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
  ON public.push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint 
  ON public.push_subscriptions (endpoint);

-- Habilita RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "push_subscriptions_select" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_insert" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert"
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_update" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update"
  ON public.push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_delete" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete"
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Adiciona coluna de dias de antecedência nas preferências do usuário
ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS notify_days_before INTEGER[] DEFAULT '{0, 1, 3}';

-- 3. Segurança RLS no schema
REVOKE ALL ON TABLE public.push_subscriptions FROM anon;
GRANT ALL ON TABLE public.push_subscriptions TO authenticated;

