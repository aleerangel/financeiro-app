'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');

  const handleLogin = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
      }
    } catch {
      setErrorMessage('Ocorreu um erro inesperado ao conectar com o Google.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl text-center space-y-5">
      <h1 className="text-xl font-bold tracking-tight">Finanças Pessoais</h1>
      <p className="text-sm text-zinc-400">Acesse com a sua conta Google autorizada</p>

      {(authError || errorMessage) && (
        <div className="p-3 text-xs bg-red-950/60 border border-red-800/80 text-red-300 rounded-lg text-left">
          {authError === 'auth-failed'
            ? 'Falha na autenticação com o provedor. Tente novamente.'
            : (errorMessage || 'Erro ao realizar login.')}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition font-semibold rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? 'Redirecionando...' : 'Entrar com Google'}
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
      <Suspense fallback={<div className="text-zinc-500 text-sm">Carregando...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
