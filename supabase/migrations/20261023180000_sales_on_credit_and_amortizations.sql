-- ==============================================================================
-- MÓDULO DE VENDAS A PRAZO (FIADO) E AMORTIZAÇÕES
-- ==============================================================================

-- 1. Ampliar o CHECK de payment_method na tabela sales
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_payment_method_check 
    CHECK (payment_method IN ('pix', 'cash', 'debit', 'credit', 'transfer', 'on_credit'));

-- 2. Adicionar campos de controle de débito na tabela sales
ALTER TABLE public.sales 
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'paid' 
        CHECK (status IN ('paid', 'pending', 'partially_paid')),
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 
        CHECK (paid_amount >= 0),
    ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 
        CHECK (remaining_amount >= 0);

-- 3. Backfill das vendas existentes
UPDATE public.sales
SET 
    status = 'paid',
    paid_amount = total_amount,
    remaining_amount = 0.00
WHERE remaining_amount = 0.00 AND status = 'paid';

-- 4. Criar tabela de amortizações
CREATE TABLE IF NOT EXISTS public.sale_amortizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'cash', 'debit', 'credit', 'transfer')),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    amortized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas ágeis
CREATE INDEX IF NOT EXISTS idx_amortizations_user_id ON public.sale_amortizations(user_id);
CREATE INDEX IF NOT EXISTS idx_amortizations_sale_id ON public.sale_amortizations(sale_id);
CREATE INDEX IF NOT EXISTS idx_amortizations_client_id ON public.sale_amortizations(client_id);
CREATE INDEX IF NOT EXISTS idx_amortizations_date ON public.sale_amortizations(user_id, amortized_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_status ON public.sales(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON public.sales(client_id) WHERE client_id IS NOT NULL;

-- RLS
ALTER TABLE public.sale_amortizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own sale amortizations" ON public.sale_amortizations;
CREATE POLICY "Users can manage their own sale amortizations"
    ON public.sale_amortizations
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Remove versões antigas de create_sale_atomic para evitar erro 42725 (function not unique)
DROP FUNCTION IF EXISTS public.create_sale_atomic(
    UUID, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, DATE, JSONB
);
DROP FUNCTION IF EXISTS public.create_sale_atomic(
    UUID, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, DATE, JSONB, DATE, NUMERIC, TEXT
);

-- 6. Cria a nova versão de create_sale_atomic
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

        -- Se houver entrada imediata, registra a receita dela
        IF v_initial > 0 THEN
            v_tx_method := COALESCE(p_initial_payment_method, 'cash');
            INSERT INTO public.transactions (
                user_id, description, amount, type, payment_method,
                transaction_date, due_date, category_id, account_id,
                is_paid, paid_at, notes
            ) VALUES (
                v_user_id, 'Entrada Atendimento: ' || p_client_name, v_initial, 'income', v_tx_method,
                p_date_only, p_date_only, p_category_id, p_account_id,
                TRUE, p_sale_date, 'Entrada inicial referente ao atendimento a prazo'
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

        -- Se gerou entrada, salva como primeira amortização vinculada
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
        -- Venda à vista tradicional
        v_paid := v_total;
        v_remaining := 0.00;
        v_status := 'paid';

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
            user_id, client_id, client_name, total_amount, paid_amount, remaining_amount,
            status, payment_method, due_date, account_id, transaction_id, sale_date, notes
        ) VALUES (
            v_user_id, p_client_id, p_client_name, v_total, v_paid, v_remaining,
            v_status, p_payment_method, NULL, p_account_id, v_transaction_id, p_sale_date, p_notes_sale
        )
        RETURNING id INTO v_sale_id;
    END IF;

    -- Itens do atendimento
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

-- 7. Função para amortização de uma comanda específica
DROP FUNCTION IF EXISTS public.amortize_sale_atomic(UUID, NUMERIC, TEXT, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, DATE);

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

    -- Cria o lançamento financeiro de receita realizada
    INSERT INTO public.transactions (
        user_id, description, amount, type, payment_method,
        transaction_date, due_date, category_id, account_id,
        is_paid, paid_at, notes
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
        p_notes
    )
    RETURNING id INTO v_transaction_id;

    -- Registra na tabela de amortizações
    INSERT INTO public.sale_amortizations (
        user_id, sale_id, client_id, amount, payment_method,
        account_id, transaction_id, amortized_at, notes
    ) VALUES (
        v_user_id, v_sale.id, v_sale.client_id, p_amount, p_payment_method,
        p_account_id, v_transaction_id, p_amortized_at, p_notes
    )
    RETURNING id INTO v_amortization_id;

    -- Atualiza os saldos da venda
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

-- 8. Função para amortização consolidada no cliente (FIFO nas comandas em aberto)
DROP FUNCTION IF EXISTS public.amortize_client_debt_atomic(UUID, NUMERIC, TEXT, UUID, UUID, TEXT, TIMESTAMPTZ, DATE);

CREATE OR REPLACE FUNCTION public.amortize_client_debt_atomic(
    p_client_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_account_id UUID,
    p_category_id UUID,
    p_notes TEXT,
    p_amortized_at TIMESTAMPTZ,
    p_date_only DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_client_name TEXT;
    v_total_debt NUMERIC(12, 2);
    v_remaining_to_amortize NUMERIC(12, 2) := p_amount;
    v_sale RECORD;
    v_this_amount NUMERIC(12, 2);
    v_amortized_count INT := 0;
    v_dummy_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'O valor da amortização deve ser maior que zero.';
    END IF;

    SELECT name INTO v_client_name
      FROM public.clients
     WHERE id = p_client_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente não encontrado.';
    END IF;

    SELECT COALESCE(SUM(remaining_amount), 0)
      INTO v_total_debt
      FROM public.sales
     WHERE user_id = v_user_id
       AND client_id = p_client_id
       AND status IN ('pending', 'partially_paid');

    IF v_total_debt <= 0 THEN
        RAISE EXCEPTION 'Este cliente não possui débitos em aberto.';
    END IF;

    IF p_amount > v_total_debt THEN
        RAISE EXCEPTION 'O valor informado (R$ %) excede o débito total em aberto (R$ %).',
            p_amount, v_total_debt;
    END IF;

    FOR v_sale IN
        SELECT id, remaining_amount, sale_date
          FROM public.sales
         WHERE user_id = v_user_id
           AND client_id = p_client_id
           AND status IN ('pending', 'partially_paid')
         ORDER BY sale_date ASC, created_at ASC
         FOR UPDATE
    LOOP
        EXIT WHEN v_remaining_to_amortize <= 0;

        v_this_amount := LEAST(v_remaining_to_amortize, v_sale.remaining_amount);

        IF v_this_amount > 0 THEN
            v_dummy_id := public.amortize_sale_atomic(
                v_sale.id,
                v_this_amount,
                p_payment_method,
                p_account_id,
                p_category_id,
                'Amortização: ' || v_client_name,
                p_notes,
                p_amortized_at,
                p_date_only
            );
            v_remaining_to_amortize := v_remaining_to_amortize - v_this_amount;
            v_amortized_count := v_amortized_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', TRUE,
        'amortized_amount', p_amount,
        'sales_affected', v_amortized_count,
        'remaining_debt', v_total_debt - p_amount
    );
END;
$$;

-- 9. Permissões explícitas com a lista exata de argumentos
REVOKE ALL ON FUNCTION public.create_sale_atomic(
    UUID, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, DATE, JSONB, DATE, NUMERIC, TEXT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_sale_atomic(
    UUID, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, DATE, JSONB, DATE, NUMERIC, TEXT
) TO authenticated;

REVOKE ALL ON FUNCTION public.amortize_sale_atomic(
    UUID, NUMERIC, TEXT, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, DATE
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.amortize_sale_atomic(
    UUID, NUMERIC, TEXT, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, DATE
) TO authenticated;

REVOKE ALL ON FUNCTION public.amortize_client_debt_atomic(
    UUID, NUMERIC, TEXT, UUID, UUID, TEXT, TIMESTAMPTZ, DATE
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.amortize_client_debt_atomic(
    UUID, NUMERIC, TEXT, UUID, UUID, TEXT, TIMESTAMPTZ, DATE
) TO authenticated;

REVOKE ALL ON FUNCTION public.amortize_client_debt_atomic(
    UUID, NUMERIC, TEXT, UUID, UUID, TEXT, TIMESTAMPTZ, DATE
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.amortize_client_debt_atomic(
    UUID, NUMERIC, TEXT, UUID, UUID, TEXT, TIMESTAMPTZ, DATE
) TO authenticated;

