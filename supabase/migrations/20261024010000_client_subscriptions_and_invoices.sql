-- ==============================================================================
-- MIGRATION: Assinaturas e Mensalidades Recorrentes de Clientes da Barbearia
-- ==============================================================================

-- 1. Planos de Assinatura
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_user ON public.subscription_plans(user_id, active);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_plans_select" ON public.subscription_plans;
CREATE POLICY "sub_plans_select" ON public.subscription_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sub_plans_insert" ON public.subscription_plans;
CREATE POLICY "sub_plans_insert" ON public.subscription_plans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sub_plans_update" ON public.subscription_plans;
CREATE POLICY "sub_plans_update" ON public.subscription_plans
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sub_plans_delete" ON public.subscription_plans;
CREATE POLICY "sub_plans_delete" ON public.subscription_plans
  FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- 2. Assinaturas vinculadas a Clientes
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  custom_plan_name VARCHAR(150),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'canceled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_user ON public.client_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_client ON public.client_subscriptions(client_id);

ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_subs_select" ON public.client_subscriptions;
CREATE POLICY "client_subs_select" ON public.client_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_subs_insert" ON public.client_subscriptions;
CREATE POLICY "client_subs_insert" ON public.client_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_subs_update" ON public.client_subscriptions;
CREATE POLICY "client_subs_update" ON public.client_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_subs_delete" ON public.client_subscriptions;
CREATE POLICY "client_subs_delete" ON public.client_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- 3. Faturas / Mensalidades Geradas
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.client_subscriptions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'canceled')),
  paid_at DATE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_invoices_period ON public.subscription_invoices (subscription_id, period_start);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_user_status ON public.subscription_invoices (user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_client ON public.subscription_invoices (client_id);

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_invoices_select" ON public.subscription_invoices;
CREATE POLICY "sub_invoices_select" ON public.subscription_invoices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sub_invoices_insert" ON public.subscription_invoices;
CREATE POLICY "sub_invoices_insert" ON public.subscription_invoices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sub_invoices_update" ON public.subscription_invoices;
CREATE POLICY "sub_invoices_update" ON public.subscription_invoices
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sub_invoices_delete" ON public.subscription_invoices;
CREATE POLICY "sub_invoices_delete" ON public.subscription_invoices
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
