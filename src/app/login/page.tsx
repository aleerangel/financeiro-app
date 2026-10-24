'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TestTube } from 'lucide-react';
import dynamic from 'next/dynamic';

const DevSandboxModal = dynamic(
  () => import('@/components/auth/DevSandboxModal').then((m) => m.DevSandboxModal),
  { ssr: false }
);

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const isDevParam = searchParams.get('dev') === 'true';

  const isDevelopment = process.env.NODE_ENV === 'development';
  const showDevSandbox = isDevelopment || isDevParam;

  const [sandboxModalOpen, setSandboxModalOpen] = useState(() => isDevParam && showDevSandbox);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const supabase = createClient();
      // Garante limpeza de qualquer resquício de sessão local antes de iniciar novo OAuth
      await supabase.auth.signOut({ scope: 'local' });

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          },
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
    <>
      <div className="w-full max-w-sm p-6 sm:p-7 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl text-center space-y-5">
        {/* Identidade Canário */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 font-bold text-2xl shadow-lg shadow-amber-500/10">
            <span role="img" aria-label="Canário">
              🐤
            </span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-100 flex items-center justify-center gap-1.5">
              Canário
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                PRO
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Gestão Financeira & Negócios Autônomos
            </p>
          </div>
        </div>

        {(authError || errorMessage) && (
          <div className="p-3 text-xs bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-left">
            {authError === 'auth-failed'
              ? 'Falha na autenticação com o provedor. Tente novamente.'
              : (errorMessage || 'Erro ao realizar login.')}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 px-4 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition font-bold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
        >
          {loading ? 'Redirecionando...' : 'Entrar com Google'}
        </button>

        {/* Atalho Secreto Dev Sandbox (Apenas em localhost) */}
        {showDevSandbox && (
          <div className="pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => setSandboxModalOpen(true)}
              className="w-full py-2.5 px-3 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <TestTube className="w-3.5 h-3.5" />
              <span>Simular Nova Conta (Dev Sandbox)</span>
            </button>
          </div>
        )}
      </div>

      {showDevSandbox && (
        <DevSandboxModal
          isOpen={sandboxModalOpen}
          onClose={() => setSandboxModalOpen(false)}
        />
      )}
    </>
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
