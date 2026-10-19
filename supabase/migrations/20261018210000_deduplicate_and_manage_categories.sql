-- ==============================================================================
-- DEDUPLICAÇÃO E GESTÃO DE CATEGORIAS
-- ==============================================================================

-- 1. Deduplica categorias existentes mantendo a primeira criada e re-apontando transações/recorrências
DO $$
DECLARE
    dup RECORD;
BEGIN
    FOR dup IN
        WITH ranked AS (
            SELECT
                id,
                user_id,
                FIRST_VALUE(id) OVER (
                    PARTITION BY user_id, LOWER(TRIM(name)), type 
                    ORDER BY created_at ASC, id ASC
                ) AS canonical_id,
                ROW_NUMBER() OVER (
                    PARTITION BY user_id, LOWER(TRIM(name)), type 
                    ORDER BY created_at ASC, id ASC
                ) AS rn
            FROM public.categories
        )
        SELECT id AS duplicate_id, canonical_id
        FROM ranked
        WHERE rn > 1
    LOOP
        -- Re-aponta transações para a categoria canônica
        UPDATE public.transactions
        SET category_id = dup.canonical_id
        WHERE category_id = dup.duplicate_id;

        -- Re-aponta recorrências para a categoria canônica
        UPDATE public.recurrences
        SET category_id = dup.canonical_id
        WHERE category_id = dup.duplicate_id;

        -- Deleta a categoria duplicada
        DELETE FROM public.categories
        WHERE id = dup.duplicate_id;
    END LOOP;
END $$;

-- 2. Cria índice único para impedir duplicidade de categorias para o mesmo usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_user_name_type
ON public.categories (user_id, LOWER(TRIM(name)), type);

-- 3. Atualiza o trigger de cadastro de novos usuários com ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    -- Cria uma conta inicial padrão
    INSERT INTO public.accounts (user_id, name, type, initial_balance, color)
    VALUES (NEW.id, 'Conta Principal', 'checking', 0.00, '#3b82f6')
    ON CONFLICT DO NOTHING;

    -- Cria categorias padrão para despesas
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'Alimentação', 'expense', 'utensils', '#ef4444', TRUE),
        (NEW.id, 'Moradia', 'expense', 'home', '#f97316', TRUE),
        (NEW.id, 'Transporte', 'expense', 'car', '#f59e0b', TRUE),
        (NEW.id, 'Lazer', 'expense', 'film', '#8b5cf6', TRUE),
        (NEW.id, 'Saúde', 'expense', 'activity', '#ec4899', TRUE),
        (NEW.id, 'Educação', 'expense', 'book-open', '#06b6d4', TRUE),
        (NEW.id, 'Outras Despesas', 'expense', 'more-horizontal', '#64748b', TRUE)
    ON CONFLICT DO NOTHING;

    -- Cria categorias padrão para receitas
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'Salário', 'income', 'briefcase', '#10b981', TRUE),
        (NEW.id, 'Rendimentos / Investimentos', 'income', 'trending-up', '#059669', TRUE),
        (NEW.id, 'Outras Receitas', 'income', 'plus-circle', '#34d399', TRUE)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
