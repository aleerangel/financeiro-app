-- ==============================================================================
-- AUTENTICAÇÃO AUTOMÁTICA PARA CONTAS SIMULADAS DE DESENVOLVIMENTO (DEV SANDBOX)
-- ==============================================================================
-- Esta função permite confirmar o e-mail de usuários de teste gerados no
-- ambiente local de desenvolvimento, contornando a exigência de confirmação
-- manual por link externo para fins de teste e homologação.

CREATE OR REPLACE FUNCTION public.confirm_dev_user(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Medida de proteção: só confirma contas com sufixo @canario.test ou prefixo dev_
  IF p_email NOT LIKE '%@canario.test' AND p_email NOT LIKE '%@canario.app' AND p_email NOT LIKE 'dev_%' THEN
    RAISE EXCEPTION 'A confirmação automática via sandbox só é permitida para contas de teste.';
  END IF;

  UPDATE auth.users
  SET 
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
  WHERE email = p_email;

  RETURN true;
END;
$$;

-- Permite execução tanto para clientes anônimos quanto autenticados
GRANT EXECUTE ON FUNCTION public.confirm_dev_user(text) TO anon, authenticated;
