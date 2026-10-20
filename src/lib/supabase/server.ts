import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamadas a partir de Server Components podem ignorar isto se houver middleware
          }
        },
      },
    }
  );
}

/**
 * Obtém o usuário autenticado com cache na mesma requisição de renderização (React cache).
 * Evita múltiplas chamadas repetidas de rede ao endpoint de Auth do Supabase quando várias
 * Server Actions rodam em paralelo (ex: Promise.all nas páginas).
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});
