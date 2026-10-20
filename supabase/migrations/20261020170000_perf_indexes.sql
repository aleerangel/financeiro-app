-- ==============================================================================
-- ÍNDICES ADICIONAIS DE ALTA PERFORMANCE (FILTROS FREQUENTES & ALERTAS)
-- ==============================================================================

-- 1. Acelera consultas de histórico de vendas por cliente (CRM / Clientes)
CREATE INDEX IF NOT EXISTS idx_sales_user_client
    ON public.sales(user_id, client_id)
    WHERE client_id IS NOT NULL;

-- 2. Índice parcial para alertas de contas a vencer e cobranças pendentes
--    Filtra rapidamente apenas transações não pagas sem varrer as quitadas
CREATE INDEX IF NOT EXISTS idx_transactions_pending_due
    ON public.transactions(user_id, type, due_date)
    WHERE is_paid = FALSE;

-- 3. Acelera agregações de itens de venda por produto no dashboard
CREATE INDEX IF NOT EXISTS idx_sale_items_product_perf
    ON public.sale_items(sale_id, product_name);
