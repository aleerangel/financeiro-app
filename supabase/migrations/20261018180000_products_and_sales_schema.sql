-- ==============================================================================
-- MÓDULO DE PRODUTOS, SERVIÇOS E VENDAS (BARBEARIA / AUTÔNOMO)
-- ==============================================================================

-- 1. TABELA: PRODUCTS (Catálogo de Serviços e Produtos)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'service' CHECK (type IN ('service', 'product')),
    default_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (default_price >= 0),
    icon TEXT DEFAULT 'scissors',
    color TEXT DEFAULT '#3b82f6',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABELA: SALES (Atendimentos / Vendas)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'cash', 'debit', 'credit')),
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABELA: SALE_ITEMS (Itens da Comanda / Venda)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TRIGGERS DE UPDATED_AT
-- ==============================================================================
CREATE OR REPLACE TRIGGER tr_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(user_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Políticas para PRODUCTS
CREATE POLICY "Users can manage their own products"
    ON public.products
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para SALES
CREATE POLICY "Users can manage their own sales"
    ON public.sales
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para SALE_ITEMS
CREATE POLICY "Users can manage items of their own sales"
    ON public.sale_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.sales
            WHERE public.sales.id = public.sale_items.sale_id
            AND public.sales.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sales
            WHERE public.sales.id = public.sale_items.sale_id
            AND public.sales.user_id = auth.uid()
        )
    );
