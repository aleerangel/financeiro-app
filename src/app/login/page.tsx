'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TestTube, Database, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { loginOrCreateSandboxUser, createSandboxAccount } from '@/lib/actions/dev-sandbox';
import dynamic from 'next/dynamic';

const DevSandboxModal = dynamic(
  () => import('@/components/auth/DevSandboxModal').then((m) => m.DevSandboxModal),
  { ssr: false }
);

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [devActionLoading, setDevActionLoading] = useState<'demo' | 'clean' | null>(null);
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

  const handleDevQuickAccess = async (mode: 'demo' | 'clean') => {
    try {
      setDevActionLoading(mode);
      setErrorMessage(null);
      if (mode === 'demo') {
        await loginOrCreateSandboxUser('demo');
      } else {
        await createSandboxAccount({ mode: 'clean' });
      }
      window.location.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao acessar conta de sandbox.';
      setErrorMessage(msg);
      setDevActionLoading(null);
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

        {/* Em desenvolvimento: Botões diretos de 1 clique para entrar sem login */}
        {showDevSandbox && (
          <div className="space-y-2.5 p-3.5 bg-zinc-950/70 border border-amber-500/25 rounded-2xl text-left">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <TestTube className="w-3.5 h-3.5" />
                Acesso Dev Local (1 Clique)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 uppercase font-mono">
                Sem Senha
              </span>
            </div>

            <button
              type="button"
              disabled={loading || devActionLoading !== null}
              onClick={() => handleDevQuickAccess('demo')}
              className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-between shadow-md shadow-amber-500/20 transition active:scale-[0.98] disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5" />
                <span>Entrar como Conta Demo</span>
              </span>
              {devActionLoading === 'demo' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              disabled={loading || devActionLoading !== null}
              onClick={() => handleDevQuickAccess('clean')}
              className="w-full py-2 px-3 bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 font-semibold rounded-xl text-xs flex items-center justify-between transition active:scale-[0.98] disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Entrar como Conta Zerada</span>
              </span>
              {devActionLoading === 'clean' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSandboxModalOpen(true)}
              disabled={loading || devActionLoading !== null}
              className="w-full text-center text-[10px] text-zinc-400 hover:text-zinc-200 pt-1 block"
            >
              Opções avançadas de simulação & segmentos ▾
            </button>
          </div>
        )}

        {showDevSandbox && (
          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-zinc-900 px-2 text-[10px] text-zinc-500 uppercase tracking-wider">
              ou autenticar com
            </span>
            <div className="border-t border-zinc-800 w-full" />
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || devActionLoading !== null}
          className="w-full py-3 px-4 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition font-bold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
        >
          {loading ? 'Redirecionando...' : 'Entrar com Google'}
        </button>
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
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
