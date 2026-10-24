-- ==============================================================================
-- MIGRATION: Perfil do Negócio e Plataforma Multi-Segmento (Canário)
-- ==============================================================================

-- 1. TABELA: BUSINESS_PROFILES
CREATE TABLE IF NOT EXISTS public.business_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name VARCHAR(150),
  segment VARCHAR(50) NOT NULL DEFAULT 'barbearia', 
  -- Segmentos suportados: 'barbearia', 'beleza_estetica', 'servicos_manutencao', 'saude_consultorio', 'aulas_treinamento', 'comercio_geral', 'outro'
  has_business BOOLEAN NOT NULL DEFAULT TRUE,
  sales_label VARCHAR(50) DEFAULT 'Atendimentos', -- 'Atendimentos', 'Ordens de Serviço', 'Consultas', 'Aulas', 'Vendas'
  default_cycle_days INTEGER NOT NULL DEFAULT 21,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  legacy_migrated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger de updated_at
CREATE OR REPLACE TRIGGER tr_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_business_profiles_segment ON public.business_profiles(segment);

-- 2. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_profiles_select" ON public.business_profiles;
CREATE POLICY "business_profiles_select"
  ON public.business_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "business_profiles_insert" ON public.business_profiles;
CREATE POLICY "business_profiles_insert"
  ON public.business_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "business_profiles_update" ON public.business_profiles;
CREATE POLICY "business_profiles_update"
  ON public.business_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "business_profiles_delete" ON public.business_profiles;
CREATE POLICY "business_profiles_delete"
  ON public.business_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Permissões de role
REVOKE ALL ON public.business_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_profiles TO authenticated;

-- 3. INICIALIZAÇÃO SEGURA PARA USUÁRIOS EXISTENTES
-- Garante que nenhum usuário legado tenha comportamento quebrado
INSERT INTO public.business_profiles (
  user_id,
  business_name,
  segment,
  has_business,
  sales_label,
  default_cycle_days,
  onboarding_completed,
  legacy_migrated
)
SELECT 
  u.id, 
  COALESCE(
    (SELECT pix_holder_name FROM public.business_message_settings WHERE user_id = u.id AND pix_holder_name IS NOT NULL AND pix_holder_name <> ''),
    'Minha Barbearia'
  ),
  'barbearia',
  TRUE,
  'Atendimentos',
  21,
  TRUE, -- Não bloqueia usuários existentes com assistente compulsório
  FALSE -- Permite exibir o banner de boas-vindas ao Canário
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- 4. ATUALIZAÇÃO DO TRIGGER DE CRIAÇÃO DE NOVOS USUÁRIOS
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    -- Cria Conta Principal padrão
    INSERT INTO public.accounts (user_id, name, type, initial_balance, color)
    VALUES (NEW.id, 'Conta Principal', 'checking', 0.00, '#3b82f6')
    ON CONFLICT DO NOTHING;

    -- Cria Categorias Pessoais universais padrão
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default, scope) VALUES
        (NEW.id, 'Alimentação', 'expense', 'utensils', '#ef4444', TRUE, 'personal'),
        (NEW.id, 'Moradia', 'expense', 'home', '#f97316', TRUE, 'personal'),
        (NEW.id, 'Transporte', 'expense', 'car', '#f59e0b', TRUE, 'personal'),
        (NEW.id, 'Lazer', 'expense', 'film', '#8b5cf6', TRUE, 'personal'),
        (NEW.id, 'Saúde', 'expense', 'activity', '#ec4899', TRUE, 'personal'),
        (NEW.id, 'Educação', 'expense', 'book-open', '#06b6d4', TRUE, 'personal'),
        (NEW.id, 'Outras Despesas', 'expense', 'more-horizontal', '#64748b', TRUE, 'personal'),
        (NEW.id, 'Salário', 'income', 'briefcase', '#3b82f6', TRUE, 'personal'),
        (NEW.id, 'Investimentos', 'income', 'trending-up', '#059669', TRUE, 'personal'),
        (NEW.id, 'Outras Receitas', 'income', 'plus-circle', '#34d399', TRUE, 'personal')
    ON CONFLICT DO NOTHING;

    -- Cria perfil inicial do Canário para novos usuários (com onboarding pendente)
    INSERT INTO public.business_profiles (
      user_id,
      business_name,
      segment,
      has_business,
      sales_label,
      default_cycle_days,
      onboarding_completed,
      legacy_migrated
    ) VALUES (
      NEW.id,
      'Meu Negócio',
      'outro',
      TRUE,
      'Atendimentos',
      30,
      FALSE, -- Novo usuário passará pelo onboarding rápido
      TRUE   -- Novo usuário já nasce na versão Canário
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

