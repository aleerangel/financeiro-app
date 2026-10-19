-- ==============================================================================
-- ROBUSTEZ DAS RECORRÊNCIAS
-- 1. Limpeza única de lançamentos automáticos indevidos (meses anteriores à
--    criação da recorrência) -- substitui a limpeza que rodava a cada carregamento.
-- 2. Remove duplicatas (mesma recorrência no mesmo vencimento), preservando o
--    lançamento já pago / mais antigo.
-- 3. Índice único (recurrence_id, due_date): torna a sincronização idempotente
--    mesmo com várias abas/dispositivos sincronizando ao mesmo tempo.
--    (recurrence_id NULL não conflita: NULLs são distintos em índices únicos.)
-- ==============================================================================

-- 1. Pendentes gerados antes do mês de criação da recorrência (fuso do app)
DELETE FROM public.transactions t
USING public.recurrences r
WHERE t.recurrence_id = r.id
  AND t.is_paid = FALSE
  AND t.due_date < date_trunc('month', r.created_at AT TIME ZONE 'America/Sao_Paulo')::date;

-- 2. Duplicatas
DELETE FROM public.transactions
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY recurrence_id, due_date
                   ORDER BY is_paid DESC, created_at ASC, id ASC
               ) AS rn
        FROM public.transactions
        WHERE recurrence_id IS NOT NULL
    ) ranked
    WHERE ranked.rn > 1
);

-- 3. Unicidade
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_recurrence_due
    ON public.transactions (recurrence_id, due_date);

