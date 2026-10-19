-- ==============================================================================
-- ISOLAMENTO TOTAL POR USUÁRIO (HARDENING DE ROW LEVEL SECURITY E PERMISSÕES)
-- ==============================================================================
-- Esta migração garante que NENHUM usuário autenticado (ou anônimo) consiga
-- visualizar, inserir, alterar ou deletar dados pertencentes a outro user_id.

-- 1. Ativa e FORÇA Row Level Security em todas as tabelas do esquema public
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards FORCE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;

ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrences FORCE ROW LEVEL SECURITY;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

-- 2. Revoga qualquer permissão da role 'anon' (não autenticada) sobre as tabelas
REVOKE ALL ON TABLE
    public.accounts,
    public.credit_cards,
    public.categories,
    public.recurrences,
    public.transactions,
    public.products,
    public.sales,
    public.sale_items,
    public.clients
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.accounts,
    public.credit_cards,
    public.categories,
    public.recurrences,
    public.transactions,
    public.products,
    public.sales,
    public.sale_items,
    public.clients
TO authenticated;

-- 3. Remove políticas antigas (para recriá-las de forma estrita e padronizada)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'accounts',
              'credit_cards',
              'categories',
              'recurrences',
              'transactions',
              'products',
              'sales',
              'sale_items',
              'clients'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 4. Recria políticas estritas baseadas em auth.uid() = user_id

-- ACCOUNTS
CREATE POLICY "strict_isolation_accounts"
    ON public.accounts
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- CREDIT_CARDS
CREATE POLICY "strict_isolation_credit_cards"
    ON public.credit_cards
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- CATEGORIES
CREATE POLICY "strict_isolation_categories"
    ON public.categories
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RECURRENCES
CREATE POLICY "strict_isolation_recurrences"
    ON public.recurrences
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- TRANSACTIONS
CREATE POLICY "strict_isolation_transactions"
    ON public.transactions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- PRODUCTS
CREATE POLICY "strict_isolation_products"
    ON public.products
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- SALES
CREATE POLICY "strict_isolation_sales"
    ON public.sales
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- SALE_ITEMS (isolado pelo user_id da venda pai em public.sales)
CREATE POLICY "strict_isolation_sale_items"
    ON public.sale_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = public.sale_items.sale_id
              AND s.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = public.sale_items.sale_id
              AND s.user_id = auth.uid()
        )
    );

-- CLIENTS
CREATE POLICY "strict_isolation_clients"
    ON public.clients
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

