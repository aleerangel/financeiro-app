-- ==============================================================================
-- MIGRATION: Configurações de Mensagens de WhatsApp e Chave Pix da Barbearia
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.business_message_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pix_key_type VARCHAR(20) DEFAULT 'phone', -- 'phone', 'cpf', 'cnpj', 'email', 'random'
  pix_key VARCHAR(255),
  pix_holder_name VARCHAR(255),
  template_friendly TEXT,
  template_default TEXT,
  template_firm TEXT,
  template_sale_credit_receipt TEXT,
  include_pix_default BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativa RLS
ALTER TABLE public.business_message_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "business_message_settings_select" ON public.business_message_settings;
CREATE POLICY "business_message_settings_select"
  ON public.business_message_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "business_message_settings_insert" ON public.business_message_settings;
CREATE POLICY "business_message_settings_insert"
  ON public.business_message_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "business_message_settings_update" ON public.business_message_settings;
CREATE POLICY "business_message_settings_update"
  ON public.business_message_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "business_message_settings_delete" ON public.business_message_settings;
CREATE POLICY "business_message_settings_delete"
  ON public.business_message_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

