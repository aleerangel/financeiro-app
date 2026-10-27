-- ==============================================================================
-- SANEAMENTO CONTÁBIL, ESTOQUE/CUSTO DE PRODUTOS, INSUMOS DE SERVIÇOS E SEGURANÇA
-- ==============================================================================

-- 1. Campos de Custo de Reposição e Estoque na tabela products (INC-16)
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
    ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 2 CHECK (min_stock >= 0);

-- 2. Tabela associativa de Peças/Produtos utilizados por Serviço (service_products)
CREATE TABLE IF NOT EXISTS public.service_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (service_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_service_products_service ON public.service_products(service_id);
CREATE INDEX IF NOT EXISTS idx_service_products_user ON public.service_products(user_id);

ALTER TABLE public.service_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own service products" ON public.service_products;
CREATE POLICY "Users can manage their own service products"
    ON public.service_products
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Campos de Custo Unitário e Flag de Peça Inclusa no Serviço em sale_items
ALTER TABLE public.sale_items
    ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    ADD COLUMN IF NOT EXISTS is_service_component BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS parent_service_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- 4. Backfill de scope = 'business' para transações de vendas, amortizações e assinaturas
UPDATE public.transactions t
SET scope = 'business'
WHERE t.scope = 'personal'
  AND (
      t.id IN (SELECT transaction_id FROM public.sales WHERE transaction_id IS NOT NULL)
      OR t.id IN (SELECT transaction_id FROM public.sale_amortizations WHERE transaction_id IS NOT NULL)
      OR t.id IN (SELECT transaction_id FROM public.subscription_invoices WHERE transaction_id IS NOT NULL)
      OR t.description ILIKE 'Atendimento:%'
      OR t.description ILIKE 'Entrada Atendimento:%'
      OR t.description ILIKE 'Amortização:%'
      OR t.description ILIKE 'Mensalidade:%'
  );

-- 5. Atualização de create_sale_atomic com:
--    - scope = 'business' explícito nas transações
--    - suporte a peças inclusas no serviço (is_service_component = true => unit_price = 0, total_price = 0)
--    - gravação do unit_cost (custo histórico do momento da venda)
--    - baixa automática de estoque (stock_quantity) para itens do tipo 'product'
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
    p_items JSONB,
    p_due_date DATE DEFAULT NULL,
    p_initial_payment NUMERIC DEFAULT 0,
    p_initial_payment_method TEXT DEFAULT 'cash'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_total NUMERIC(12, 2);
    v_initial NUMERIC(12, 2) := COALESCE(p_initial_payment, 0);
    v_paid NUMERIC(12, 2);
    v_remaining NUMERIC(12, 2);
    v_status TEXT;
    v_transaction_id UUID := NULL;
    v_sale_id UUID;
    v_tx_method TEXT;
    v_item JSONB;
    v_prod_id UUID;
    v_parent_service_id UUID;
    v_qty INT;
    v_is_component BOOLEAN;
    v_unit_price NUMERIC(12, 2);
    v_unit_cost NUMERIC(12, 2);
    v_prod_type TEXT;
    v_prod_cost NUMERIC(12, 2);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Adicione ao menos um serviço ou produto ao atendimento.';
    END IF;

    -- Peças inclusas no serviço (is_service_component = true) nunca somam no valor cobrado do cliente
    SELECT COALESCE(SUM(
        CASE
            WHEN COALESCE((i->>'is_service_component')::BOOLEAN, FALSE) THEN 0
            ELSE (i->>'quantity')::INT * (i->>'unit_price')::NUMERIC
        END
    ), 0)
      INTO v_total
      FROM jsonb_array_elements(p_items) AS i;

    IF v_total <= 0 THEN
        RAISE EXCEPTION 'O valor total do atendimento deve ser maior que zero.';
    END IF;

    IF p_payment_method = 'on_credit' THEN
        IF p_client_id IS NULL THEN
            RAISE EXCEPTION 'Vendas a prazo exigem a seleção de um cliente cadastrado.';
        END IF;

        IF v_initial < 0 OR v_initial > v_total THEN
            RAISE EXCEPTION 'O valor de entrada deve estar entre zero e o total do atendimento.';
        END IF;

        v_paid := v_initial;
        v_remaining := v_total - v_initial;

        IF v_remaining <= 0 THEN
            v_status := 'paid';
        ELSIF v_initial > 0 THEN
            v_status := 'partially_paid';
        ELSE
            v_status := 'pending';
        END IF;

        IF v_initial > 0 THEN
            v_tx_method := COALESCE(p_initial_payment_method, 'cash');
            INSERT INTO public.transactions (
                user_id, description, amount, type, payment_method,
                transaction_date, due_date, category_id, account_id,
                is_paid, paid_at, notes, scope
            ) VALUES (
                v_user_id, 'Entrada Atendimento: ' || p_client_name, v_initial, 'income', v_tx_method,
                p_date_only, p_date_only, p_category_id, p_account_id,
                TRUE, p_sale_date, 'Entrada inicial referente ao atendimento a prazo', 'business'
            )
            RETURNING id INTO v_transaction_id;
        END IF;

        INSERT INTO public.sales (
            user_id, client_id, client_name, total_amount, paid_amount, remaining_amount,
            status, payment_method, due_date, account_id, transaction_id, sale_date, notes
        ) VALUES (
            v_user_id, p_client_id, p_client_name, v_total, v_paid, v_remaining,
            v_status, p_payment_method, p_due_date, p_account_id, NULL, p_sale_date, p_notes_sale
        )
        RETURNING id INTO v_sale_id;

        IF v_initial > 0 AND v_transaction_id IS NOT NULL THEN
            INSERT INTO public.sale_amortizations (
                user_id, sale_id, client_id, amount, payment_method,
                account_id, transaction_id, amortized_at, notes
            ) VALUES (
                v_user_id, v_sale_id, p_client_id, v_initial, v_tx_method,
                p_account_id, v_transaction_id, p_sale_date, 'Entrada inicial no ato da venda'
            );
        END IF;

    ELSE
        v_paid := v_total;
        v_remaining := 0.00;
        v_status := 'paid';

        INSERT INTO public.transactions (
            user_id, description, amount, type, payment_method,
            transaction_date, due_date, category_id, account_id,
            is_paid, paid_at, notes, scope
        ) VALUES (
            v_user_id, p_description, v_total, 'income', p_payment_method,
            p_date_only, p_date_only, p_category_id, p_account_id,
            TRUE, p_sale_date, p_notes_transaction, 'business'
        )
        RETURNING id INTO v_transaction_id;

        INSERT INTO public.sales (
            user_id, client_id, client_name, total_amount, paid_amount, remaining_amount,
            status, payment_method, due_date, account_id, transaction_id, sale_date, notes
        ) VALUES (
            v_user_id, p_client_id, p_client_name, v_total, v_paid, v_remaining,
            v_status, p_payment_method, NULL, p_account_id, v_transaction_id, p_sale_date, p_notes_sale
        )
        RETURNING id INTO v_sale_id;
    END IF;

    -- Processa cada item, grava custo histórico e baixa estoque de produtos
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := NULLIF(v_item->>'product_id', '')::UUID;
        v_parent_service_id := NULLIF(v_item->>'parent_service_id', '')::UUID;
        v_qty := GREATEST(COALESCE((v_item->>'quantity')::INT, 1), 1);
        v_is_component := COALESCE((v_item->>'is_service_component')::BOOLEAN, FALSE);
        v_unit_price := CASE WHEN v_is_component THEN 0.00 ELSE COALESCE((v_item->>'unit_price')::NUMERIC, 0.00) END;
        v_unit_cost := COALESCE((v_item->>'unit_cost')::NUMERIC, 0.00);

        IF v_prod_id IS NOT NULL THEN
            SELECT p.type, p.cost_price
              INTO v_prod_type, v_prod_cost
              FROM public.products p
             WHERE p.id = v_prod_id AND p.user_id = v_user_id;

            IF FOUND THEN
                IF v_unit_cost <= 0 THEN
                    v_unit_cost := COALESCE(v_prod_cost, 0.00);
                END IF;

                -- Baixa automática de estoque para produtos físicos
                IF v_prod_type = 'product' THEN
                    UPDATE public.products
                       SET stock_quantity = stock_quantity - v_qty
                     WHERE id = v_prod_id AND user_id = v_user_id;
                END IF;
            END IF;
        END IF;

        INSERT INTO public.sale_items (
            sale_id, product_id, product_name, quantity,
            unit_price, total_price, unit_cost, is_service_component, parent_service_id
        ) VALUES (
            v_sale_id,
            v_prod_id,
            v_item->>'product_name',
            v_qty,
            v_unit_price,
            v_qty * v_unit_price,
            v_unit_cost,
            v_is_component,
            v_parent_service_id
        );
    END LOOP;

    RETURN v_sale_id;
END;
$$;

-- 6. Atualiza amortize_sale_atomic para garantir scope = 'business' na transação gerada
CREATE OR REPLACE FUNCTION public.amortize_sale_atomic(
    p_sale_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_account_id UUID,
    p_category_id UUID,
    p_description TEXT,
    p_notes TEXT,
    p_amortized_at TIMESTAMPTZ,
    p_date_only DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_sale RECORD;
    v_transaction_id UUID;
    v_amortization_id UUID;
    v_new_remaining NUMERIC(12, 2);
    v_new_paid NUMERIC(12, 2);
    v_new_status TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'O valor da amortização deve ser maior que zero.';
    END IF;

    SELECT * INTO v_sale
      FROM public.sales
     WHERE id = p_sale_id AND user_id = v_user_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comanda não encontrada.';
    END IF;

    IF p_amount > v_sale.remaining_amount THEN
        RAISE EXCEPTION 'O valor informado (R$ %) excede o saldo devedor restante (R$ %).',
            p_amount, v_sale.remaining_amount;
    END IF;

    INSERT INTO public.transactions (
        user_id, description, amount, type, payment_method,
        transaction_date, due_date, category_id, account_id,
        is_paid, paid_at, notes, scope
    ) VALUES (
        v_user_id,
        COALESCE(p_description, 'Amortização: ' || v_sale.client_name),
        p_amount,
        'income',
        p_payment_method,
        p_date_only,
        p_date_only,
        p_category_id,
        p_account_id,
        TRUE,
        p_amortized_at,
        p_notes,
        'business'
    )
    RETURNING id INTO v_transaction_id;

    INSERT INTO public.sale_amortizations (
        user_id, sale_id, client_id, amount, payment_method,
        account_id, transaction_id, amortized_at, notes
    ) VALUES (
        v_user_id, v_sale.id, v_sale.client_id, p_amount, p_payment_method,
        p_account_id, v_transaction_id, p_amortized_at, p_notes
    )
    RETURNING id INTO v_amortization_id;

    v_new_remaining := v_sale.remaining_amount - p_amount;
    v_new_paid := v_sale.paid_amount + p_amount;

    IF v_new_remaining <= 0.009 THEN
        v_new_status := 'paid';
        v_new_remaining := 0.00;
    ELSE
        v_new_status := 'partially_paid';
    END IF;

    UPDATE public.sales
       SET paid_amount = v_new_paid,
           remaining_amount = v_new_remaining,
           status = v_new_status
     WHERE id = v_sale.id;

    RETURN v_amortization_id;
END;
$$;

-- 7. Atualiza get_account_aggregates e get_account_prior_balance (INC-06 e INC-12):
--    - Usa a data efetiva do pagamento COALESCE((paid_at AT TIME ZONE 'America/Sao_Paulo')::date, due_date, transaction_date)
--    - Ignora lançamentos com data futura no saldo atual da conta
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
            COALESCE(
                (t.paid_at AT TIME ZONE 'America/Sao_Paulo')::date,
                t.due_date,
                t.transaction_date
            ) AS effective_date,
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
          AND COALESCE(
              (t.paid_at AT TIME ZONE 'America/Sao_Paulo')::date,
              t.due_date,
              t.transaction_date
          ) <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
    )
    SELECT
        p.account_id,
        COALESCE(SUM(CASE WHEN p.type = 'income' THEN p.amount ELSE -p.amount END), 0),
        COALESCE(SUM(CASE WHEN p.is_yield THEN p.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN p.is_yield AND to_char(p.effective_date, 'YYYY-MM') = p_month_prefix THEN p.amount ELSE 0 END), 0)
    FROM paid p
    GROUP BY p.account_id;
$$;

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
               AND COALESCE(
                   (t.paid_at AT TIME ZONE 'America/Sao_Paulo')::date,
                   t.due_date,
                   t.transaction_date
               ) < p_before
        ), 0);
$$;

-- 8. Hardening de Segurança: REVOKE ALL FROM anon nas tabelas restantes (INC-15)
REVOKE ALL ON TABLE public.sale_amortizations FROM anon;
REVOKE ALL ON TABLE public.subscription_plans FROM anon;
REVOKE ALL ON TABLE public.client_subscriptions FROM anon;
REVOKE ALL ON TABLE public.subscription_invoices FROM anon;
REVOKE ALL ON TABLE public.notifications FROM anon;
REVOKE ALL ON TABLE public.user_notification_preferences FROM anon;
REVOKE ALL ON TABLE public.business_profiles FROM anon;
REVOKE ALL ON TABLE public.business_message_settings FROM anon;
REVOKE ALL ON TABLE public.service_products FROM anon;

