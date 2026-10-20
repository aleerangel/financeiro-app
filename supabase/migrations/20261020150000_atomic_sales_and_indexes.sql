-- ==============================================================================
-- VENDA ATÔMICA + ÍNDICES DE PERFORMANCE + BACKFILL DA CATEGORIA BARBEARIA
-- ==============================================================================

-- 1. Registra receita (transação), venda e itens em UMA única transação do banco.
--    SECURITY INVOKER: as policies de RLS continuam valendo (auth.uid() = user_id).
CREATE OR REPLACE FUNCTION public.create_sale_atomic(
    p_client_id UUID,
    p_client_name TEXT,
    p_payment_method TEXT,
    p_account_id UUID,
    p_category_id UUID,
    p_description TEXT,
    p_notes_transaction TEXT,
    p_notes_sale TEXT,
    p_sale_date TIMESTAMPTZ,
    p_date_only DATE,
    p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_total NUMERIC(12, 2);
    v_transaction_id UUID;
    v_sale_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Adicione ao menos um serviço ou produto ao atendimento.';
    END IF;

    SELECT COALESCE(SUM((i->>'quantity')::INT * (i->>'unit_price')::NUMERIC), 0)
      INTO v_total
      FROM jsonb_array_elements(p_items) AS i;

    IF v_total <= 0 THEN
        RAISE EXCEPTION 'O valor total do atendimento deve ser maior que zero.';
    END IF;

    INSERT INTO public.transactions (
        user_id, description, amount, type, payment_method,
        transaction_date, due_date, category_id, account_id,
        is_paid, paid_at, notes
    ) VALUES (
        v_user_id, p_description, v_total, 'income', p_payment_method,
        p_date_only, p_date_only, p_category_id, p_account_id,
        TRUE, p_sale_date, p_notes_transaction
    )
    RETURNING id INTO v_transaction_id;

    INSERT INTO public.sales (
        user_id, client_id, client_name, total_amount, payment_method,
        account_id, transaction_id, sale_date, notes
    ) VALUES (
        v_user_id, p_client_id, p_client_name, v_total, p_payment_method,
        p_account_id, v_transaction_id, p_sale_date, p_notes_sale
    )
    RETURNING id INTO v_sale_id;

    INSERT INTO public.sale_items (
        sale_id, product_id, product_name, quantity, unit_price, total_price
    )
    SELECT
        v_sale_id,
        NULLIF(i->>'product_id', '')::UUID,
        i->>'product_name',
        (i->>'quantity')::INT,
        (i->>'unit_price')::NUMERIC,
        (i->>'quantity')::INT * (i->>'unit_price')::NUMERIC
    FROM jsonb_array_elements(p_items) AS i;

    RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_sale_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sale_atomic TO authenticated;

-- 2. Backfill único (substitui a "auto-correção" que rodava a cada leitura de vendas):
--    associa receitas antigas de atendimentos sem categoria à categoria Barbearia do dono.
UPDATE public.transactions t
   SET category_id = c.id
  FROM public.categories c
 WHERE t.category_id IS NULL
   AND t.description ILIKE 'Atendimento:%'
   AND c.user_id = t.user_id
   AND c.name ILIKE 'barbearia%'
   AND c.id = (
       SELECT c2.id FROM public.categories c2
        WHERE c2.user_id = t.user_id AND c2.name ILIKE 'barbearia%'
        ORDER BY c2.created_at ASC LIMIT 1
   );

-- 3. Índices compostos para os filtros mais usados (dashboards, saldos e extratos)
CREATE INDEX IF NOT EXISTS idx_transactions_user_due_date
    ON public.transactions(user_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_due_date
    ON public.transactions(user_id, type, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id
    ON public.transactions(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card_id
    ON public.transactions(credit_card_id) WHERE credit_card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category_id
    ON public.transactions(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_account_id
    ON public.sales(account_id) WHERE account_id IS NOT NULL;

-- 4. Agregação de saldos por conta direto no banco (evita varrer todo o histórico no servidor Node).
--    Retorna a soma das transações pagas (receitas - despesas) e os rendimentos por conta.
CREATE OR REPLACE FUNCTION public.get_account_aggregates(p_month_prefix TEXT)
RETURNS TABLE (
    account_id UUID,
    transaction_sum NUMERIC,
    yield_all_time NUMERIC,
    yield_current_month NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    WITH paid AS (
        SELECT
            t.account_id,
            t.type,
            t.amount,
            COALESCE(t.due_date, t.transaction_date) AS ref_date,
            (
                t.type = 'income' AND (
                    COALESCE(t.notes, '') LIKE '%[Rendimento]%'
                    OR lower(btrim(COALESCE(t.description, ''))) LIKE 'rendimento:%'
                    OR lower(btrim(COALESCE(t.description, ''))) LIKE 'rendimento %'
                    OR lower(btrim(COALESCE(t.description, ''))) LIKE 'juros:%'
                )
            ) AS is_yield
        FROM public.transactions t
        WHERE t.user_id = auth.uid()
          AND t.is_paid = TRUE
          AND t.account_id IS NOT NULL
          AND t.type IN ('income', 'expense')
    )
    SELECT
        p.account_id,
        COALESCE(SUM(CASE WHEN p.type = 'income' THEN p.amount ELSE -p.amount END), 0),
        COALESCE(SUM(CASE WHEN p.is_yield THEN p.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN p.is_yield AND to_char(p.ref_date, 'YYYY-MM') = p_month_prefix THEN p.amount ELSE 0 END), 0)
    FROM paid p
    GROUP BY p.account_id;
$$;

REVOKE ALL ON FUNCTION public.get_account_aggregates FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_account_aggregates TO authenticated;

-- 5. Saldo acumulado das contas ANTES de uma data (base do gráfico de evolução de saldo),
--    evitando trafegar todo o histórico de transações para o servidor.
CREATE OR REPLACE FUNCTION public.get_account_prior_balance(p_before DATE)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        COALESCE((SELECT SUM(a.initial_balance) FROM public.accounts a WHERE a.user_id = auth.uid()), 0)
        + COALESCE((
            SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
              FROM public.transactions t
             WHERE t.user_id = auth.uid()
               AND t.is_paid = TRUE
               AND t.account_id IS NOT NULL
               AND t.type IN ('income', 'expense')
               AND t.due_date < p_before
        ), 0);
$$;

REVOKE ALL ON FUNCTION public.get_account_prior_balance FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_account_prior_balance TO authenticated;
