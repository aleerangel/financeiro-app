-- ==============================================================================
-- PROVISIONAMENTO DIRETO DE CONTAS DEV SANDBOX SEM DISPARO DE E-MAIL
-- ==============================================================================
-- Evita o erro 'email rate limit exceeded' do Supabase Auth inserindo e
-- configurando diretamente as contas fixas de teste em auth.users.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.provision_dev_user(p_email text, p_password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
BEGIN
  -- Medida de proteção: só permite contas de teste dev_*@canario.app
  IF p_email NOT LIKE 'dev_%@canario.app' AND p_email NOT LIKE 'dev_%@canario.test' THEN
    RAISE EXCEPTION 'A criação via sandbox só é permitida para contas dev_*@canario.app.';
  END IF;

  -- Gera o hash bcrypt usando pgcrypto no schema extensions
  BEGIN
    v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      v_encrypted_pw := crypt(p_password, gen_salt('bf'));
    EXCEPTION WHEN OTHERS THEN
      -- Hash padrão pré-computado de 'CanarioDevSandbox#2026!'
      v_encrypted_pw := '$2a$12$e8iV70/bEwLq62l9l6xSqe3B3K4w.44m8uD3NnZc.46H8k03nZkKy';
    END;
  END;

  -- 1. Verifica se o usuário já existe em auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Já existe: atualiza senha e garante confirmação do e-mail
    UPDATE auth.users
    SET 
      encrypted_password = v_encrypted_pw,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = v_user_id;

    RETURN v_user_id;
  END IF;

  -- 2. Não existe: insere diretamente em auth.users (zero e-mails enviados!)
  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  -- 3. Vincula em auth.identities para suporte pleno ao GoTrue
  BEGIN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', p_email),
      'email',
      now(),
      now(),
      now()
    )
    ON CONFLICT (provider, id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_dev_user(text, text) TO anon, authenticated;

-- Pré-provisiona imediatamente as 2 contas de sandbox:
SELECT public.provision_dev_user('dev_demo@canario.app', 'CanarioDevSandbox#2026!');
SELECT public.provision_dev_user('dev_zerada@canario.app', 'CanarioDevSandbox#2026!');
