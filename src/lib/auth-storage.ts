/**
 * Limpa com segurança apenas os dados e tokens pertencentes à aplicação e ao Supabase,
 * preservando outras entradas do localStorage de extensões ou outros contextos.
 */
export function clearAppClientStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (
        key &&
        (key.startsWith('financeiro_') ||
          key.startsWith('sb-') ||
          key.includes('supabase'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    window.sessionStorage.clear();
  } catch {
    // Ignora erros em ambientes com storage restrito ou modo anônimo
  }
}

