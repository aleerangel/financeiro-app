-- ==============================================================================
-- MIGRATION: Adiciona coluna payment_method em subscription_invoices
-- ==============================================================================

ALTER TABLE public.subscription_invoices 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'pix';
