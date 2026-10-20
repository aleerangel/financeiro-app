-- ==============================================================================
-- ESCOPO DE GASTOS E CATEGORIAS: PESSOAL ('personal') VS BARBEARIA ('business')
-- ==============================================================================

-- 1. Adiciona coluna scope nas tabelas categories, recurrences e transactions
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'personal'
CHECK (scope IN ('personal', 'business'));

ALTER TABLE public.recurrences
ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'personal'
CHECK (scope IN ('personal', 'business'));

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'personal'
CHECK (scope IN ('personal', 'business'));

-- 2. Índices para filtragem rápida por escopo no Dashboard da Barbearia
CREATE INDEX IF NOT EXISTS idx_transactions_user_scope_dates
ON public.transactions(user_id, scope, due_date);

CREATE INDEX IF NOT EXISTS idx_categories_user_scope
ON public.categories(user_id, scope);

-- 3. Marca categorias e transações existentes da Barbearia como 'business'
UPDATE public.categories
SET scope = 'business'
WHERE LOWER(TRIM(name)) IN ('barbearia', 'insumos & barbearia', 'insumos barbearia');

UPDATE public.transactions t
SET scope = 'business'
WHERE t.description LIKE 'Atendimento:%'
   OR t.id IN (SELECT transaction_id FROM public.sales WHERE transaction_id IS NOT NULL)
   OR t.category_id IN (SELECT id FROM public.categories WHERE scope = 'business');

-- 4. Cria a categoria padrão de despesa "Insumos & Barbearia" para todos os usuários
INSERT INTO public.categories (user_id, name, type, icon, color, is_default, scope)
SELECT u.id, 'Insumos & Barbearia', 'expense', 'scissors', '#f59e0b', TRUE, 'business'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.user_id = u.id
      AND LOWER(TRIM(c.name)) = 'insumos & barbearia'
      AND c.type = 'expense'
);

-- 5. Atualiza trigger de novos usuários para já criar categorias com scope correto
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.accounts (user_id, name, type, initial_balance, color)
    VALUES (NEW.id, 'Conta Principal', 'checking', 0.00, '#3b82f6')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.categories (user_id, name, type, icon, color, is_default, scope) VALUES
        (NEW.id, 'Insumos & Barbearia', 'expense', 'scissors', '#f59e0b', TRUE, 'business'),
        (NEW.id, 'Alimentação', 'expense', 'utensils', '#ef4444', TRUE, 'personal'),
        (NEW.id, 'Moradia', 'expense', 'home', '#f97316', TRUE, 'personal'),
        (NEW.id, 'Transporte', 'expense', 'car', '#f59e0b', TRUE, 'personal'),
        (NEW.id, 'Lazer', 'expense', 'film', '#8b5cf6', TRUE, 'personal'),
        (NEW.id, 'Saúde', 'expense', 'activity', '#ec4899', TRUE, 'personal'),
        (NEW.id, 'Educação', 'expense', 'book-open', '#06b6d4', TRUE, 'personal'),
        (NEW.id, 'Outras Despesas', 'expense', 'more-horizontal', '#64748b', TRUE, 'personal')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.categories (user_id, name, type, icon, color, is_default, scope) VALUES
        (NEW.id, 'Barbearia', 'income', 'scissors', '#10b981', TRUE, 'business'),
        (NEW.id, 'Salário', 'income', 'briefcase', '#3b82f6', TRUE, 'personal'),
        (NEW.id, 'Investimentos', 'income', 'trending-up', '#059669', TRUE, 'personal'),
        (NEW.id, 'Outras Receitas', 'income', 'plus-circle', '#34d399', TRUE, 'personal')
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

