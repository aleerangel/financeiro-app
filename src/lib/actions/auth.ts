'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * Encerra a sessão do usuário no servidor e remove todos os cookies de autenticação
 * do Supabase para impedir qualquer reaproveitamento de sessão entre contas.
 */
export async function signOutServerAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  for (const cookie of allCookies) {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('auth-token')) {
      cookieStore.delete(cookie.name);
    }
  }
}
