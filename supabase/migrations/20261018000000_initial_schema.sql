-- ==============================================================================
-- SCHEMA INICIAL: APLICATIVO FINANCEIRO
-- ==============================================================================

-- 1. Função auxiliar para atualização de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Limpa tabelas antigas se existirem (para evitar conflito com schemas anteriores)
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.recurrences CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.credit_cards CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;

-- 2. TABELA: ACCOUNTS (Contas e Carteiras)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'checking', -- 'checking' (corrente), 'wallet' (carteira/dinheiro), 'savings' (poupança), 'investment' (investimento)
    initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABELA: CREDIT_CARDS (Cartões de Crédito)
CREATE TABLE IF NOT EXISTS public.credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    closing_day INT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
    due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    color TEXT DEFAULT '#8b5cf6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABELA: CATEGORIES (Categorias de Transações)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'both')),
    icon TEXT DEFAULT 'tag',
    color TEXT DEFAULT '#64748b',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABELA: RECURRENCES (Despesas e Receitas Fixas / Recorrentes)
CREATE TABLE IF NOT EXISTS public.recurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    frequency TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABELA: TRANSACTIONS (Lançamentos Financeiros)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'debit', 'credit', 'pix', 'transfer')),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    recurrence_id UUID REFERENCES public.recurrences(id) ON DELETE SET NULL,
    installment_group_id UUID, -- Agrupa parcelas da mesma compra (ex: 1/10, 2/10)
    current_installment INT DEFAULT 1,
    total_installments INT DEFAULT 1,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TRIGGERS DE UPDATED_AT
-- ==============================================================================
CREATE OR REPLACE TRIGGER tr_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER tr_credit_cards_updated_at
    BEFORE UPDATE ON public.credit_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER tr_recurrences_updated_at
    BEFORE UPDATE ON public.recurrences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER tr_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON public.credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_recurrences_user_id ON public.recurrences(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dates ON public.transactions(user_id, transaction_date, due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card ON public.transactions(credit_card_id, due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_installment_group ON public.transactions(installment_group_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para ACCOUNTS
CREATE POLICY "Users can manage their own accounts"
    ON public.accounts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para CREDIT_CARDS
CREATE POLICY "Users can manage their own credit cards"
    ON public.credit_cards
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para CATEGORIES
CREATE POLICY "Users can manage their own categories"
    ON public.categories
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para RECURRENCES
CREATE POLICY "Users can manage their own recurrences"
    ON public.recurrences
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para TRANSACTIONS
CREATE POLICY "Users can manage their own transactions"
    ON public.transactions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- TRIGGER PARA CRIAR DADOS PADRÃO AO NOVO USUÁRIO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    -- Cria uma conta inicial padrão
    INSERT INTO public.accounts (user_id, name, type, initial_balance, color)
    VALUES (NEW.id, 'Conta Principal', 'checking', 0.00, '#3b82f6');

    -- Cria categorias padrão para despesas
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'Alimentação', 'expense', 'utensils', '#ef4444', TRUE),
        (NEW.id, 'Moradia', 'expense', 'home', '#f97316', TRUE),
        (NEW.id, 'Transporte', 'expense', 'car', '#f59e0b', TRUE),
        (NEW.id, 'Lazer', 'expense', 'film', '#8b5cf6', TRUE),
        (NEW.id, 'Saúde', 'expense', 'activity', '#ec4899', TRUE),
        (NEW.id, 'Educação', 'expense', 'book-open', '#06b6d4', TRUE),
        (NEW.id, 'Outras Despesas', 'expense', 'more-horizontal', '#64748b', TRUE);

    -- Cria categorias padrão para receitas
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'Salário', 'income', 'briefcase', '#10b981', TRUE),
        (NEW.id, 'Rendimentos / Investimentos', 'income', 'trending-up', '#059669', TRUE),
        (NEW.id, 'Outras Receitas', 'income', 'plus-circle', '#34d399', TRUE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparado após a inserção na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

