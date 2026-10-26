-- ==============================================================================
-- MIGRATION: Adiciona coluna cnpj na tabela business_profiles
-- ==============================================================================

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);

COMMENT ON COLUMN public.business_profiles.cnpj IS 'CNPJ da empresa/negócio formatado (XX.XXX.XXX/XXXX-XX)';
