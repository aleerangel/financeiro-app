-- ==============================================================================
-- MIGRATION: Expansão de Tons e Variações de Mensagens WhatsApp
-- ==============================================================================

ALTER TABLE public.business_message_settings
ADD COLUMN IF NOT EXISTS template_sale_receipt_friendly TEXT,
ADD COLUMN IF NOT EXISTS template_return_window_vip TEXT,
ADD COLUMN IF NOT EXISTS template_inactive_recovery_promo TEXT,
ADD COLUMN IF NOT EXISTS template_birthday_gift TEXT,
ADD COLUMN IF NOT EXISTS template_subscription_invoice TEXT,
ADD COLUMN IF NOT EXISTS template_subscription_receipt TEXT;

