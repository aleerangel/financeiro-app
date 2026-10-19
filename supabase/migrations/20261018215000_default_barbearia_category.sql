-- ==============================================================================
-- CATEGORIA PADRÃO "BARBEARIA" PARA ATENDIMENTOS E VENDAS
-- ==============================================================================

-- 1. Cria a categoria Barbearia para todos os usuários que ainda não possuem
INSERT INTO public.categories (user_id, name, type, icon, color, is_default)
SELECT u.id, 'Barbearia', 'income', 'scissors', '#10b981', TRUE
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.user_id = u.id
      AND LOWER(TRIM(c.name)) = 'barbearia'
      AND c.type = 'income'
);

-- 2. Atualiza transações de atendimentos existentes que ficaram sem categoria
UPDATE public.transactions t
SET category_id = c.id
FROM public.categories c
WHERE t.user_id = c.user_id
  AND LOWER(TRIM(c.name)) = 'barbearia'
  AND c.type = 'income'
  AND (t.category_id IS NULL OR t.category_id <> c.id)
  AND (
      t.id IN (SELECT transaction_id FROM public.sales WHERE transaction_id IS NOT NULL)
      OR t.description LIKE 'Atendimento:%'
  );

-- 3. Atualiza o trigger de cadastro para novos usuários com a categoria Barbearia
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.accounts (user_id, name, type, initial_balance, color)
    VALUES (NEW.id, 'Conta Principal', 'checking', 0.00, '#3b82f6')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'Alimentação', 'expense', 'utensils', '#ef4444', TRUE),
        (NEW.id, 'Moradia', 'expense', 'home', '#f97316', TRUE),
        (NEW.id, 'Transporte', 'expense', 'car', '#f59e0b', TRUE),
        (NEW.id, 'Lazer', 'expense', 'film', '#8b5cf6', TRUE),
        (NEW.id, 'Saúde', 'expense', 'activity', '#ec4899', TRUE),
        (NEW.id, 'Educação', 'expense', 'book-open', '#06b6d4', TRUE),
        (NEW.id, 'Outras Despesas', 'expense', 'more-horizontal', '#64748b', TRUE)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
        (NEW.id, 'Barbearia', 'income', 'scissors', '#10b981', TRUE),
        (NEW.id, 'Salário', 'income', 'briefcase', '#3b82f6', TRUE),
        (NEW.id, 'Investimentos', 'income', 'trending-up', '#059669', TRUE),
        (NEW.id, 'Outras Receitas', 'income', 'plus-circle', '#34d399', TRUE)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

