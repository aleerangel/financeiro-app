-- ==============================================================================
-- MIGRATION: Expansão do WhatsApp para Retorno, Inativos e Aniversários (CRM)
-- ==============================================================================

-- 1. Colunas adicionais na tabela de clientes
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- Índices para consultas otimizadas
CREATE INDEX IF NOT EXISTS idx_clients_birth_date ON public.clients(user_id, birth_date);
CREATE INDEX IF NOT EXISTS idx_clients_last_contacted ON public.clients(user_id, last_contacted_at);

-- 2. Colunas de templates adicionais nas configurações de mensagens
ALTER TABLE public.business_message_settings
ADD COLUMN IF NOT EXISTS template_return_window TEXT,
ADD COLUMN IF NOT EXISTS template_inactive_recovery TEXT,
ADD COLUMN IF NOT EXISTS template_birthday TEXT;
