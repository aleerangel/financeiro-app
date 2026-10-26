-- ==============================================================================
-- REMOÇÃO DE FUNÇÕES DE DEV SANDBOX EXPOSTAS PUBLICAMENTE (HARDENING DE SEGURANÇA)
-- ==============================================================================
-- As funções provision_dev_user e confirm_dev_user foram criadas com SECURITY DEFINER
-- e privilégio de EXECUTE concedido a 'anon'. Em produção ou projetos compartilhados,
-- isso permitia chamada direta via RPC por clientes anônimos contornando fluxo de autenticação.
--
-- O provisionamento de teste em ambiente local agora opera estritamente via
-- createAdminClient() (Service Role Key server-side) sem expor funções públicas de sistema.

REVOKE ALL ON FUNCTION public.provision_dev_user(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_dev_user(text) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.provision_dev_user(text, text);
DROP FUNCTION IF EXISTS public.confirm_dev_user(text);
