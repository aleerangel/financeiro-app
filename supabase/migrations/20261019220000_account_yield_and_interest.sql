-- ==============================================================================
-- RENDIMENTO DE CONTAS E JUROS (NUBANK / CDI / TAXA MENSAL)
-- ==============================================================================

-- 1. Adiciona colunas de configuração de rendimento na tabela accounts
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS yield_type TEXT NOT NULL DEFAULT 'none'
CHECK (yield_type IN ('none', 'cdi_percent', 'monthly_percent'));

ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS yield_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00;

-- 2. Configura automaticamente contas conhecidas como Nubank / Investimentos com 100% do CDI
UPDATE public.accounts
SET yield_type = 'cdi_percent',
    yield_rate = 100.00
WHERE yield_type = 'none'
  AND (
      type = 'investment'
      OR LOWER(name) LIKE '%nubank%'
      OR LOWER(name) LIKE '%mercado pago%'
      OR LOWER(name) LIKE '%picpay%'
      OR LOWER(name) LIKE '%caixinha%'
      OR LOWER(name) LIKE '%cdb%'
  );

-- 3. Configura contas do tipo Poupança com taxa média de 0.60% a.m. se ainda não configuradas
UPDATE public.accounts
SET yield_type = 'monthly_percent',
    yield_rate = 0.60
WHERE yield_type = 'none'
  AND type = 'savings';
