'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TestTube, Database, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { loginOrCreateSandboxUser, createSandboxAccount } from '@/lib/actions/dev-sandbox';
import { CanaryLogo } from '@/components/ui/CanaryLogo';
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
      <div className="w-full max-w-sm p-6 sm:p-7 bg-[#0D121F] border border-[#1E293B] rounded-3xl shadow-2xl text-center space-y-6">
        {/* Identidade Canário Oficial */}
        <div className="flex flex-col items-center gap-3">
          <CanaryLogo size="lg" />
          <p className="text-xs text-[#94A3B8]">
            Gestão Financeira &amp; Negócios Autônomos
          </p>
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
          <div className="space-y-2.5 p-3.5 bg-[#080B11]/80 border border-[#FACC15]/25 rounded-2xl text-left">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#FACC15]">
              <span className="flex items-center gap-1.5">
                <TestTube className="w-3.5 h-3.5" />
                Acesso Dev Local (1 Clique)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FACC15]/15 border border-[#FACC15]/30 uppercase font-mono text-[#FACC15]">
                Sem Senha
              </span>
            </div>

            <button
              type="button"
              disabled={loading || devActionLoading !== null}
              onClick={() => handleDevQuickAccess('demo')}
              className="w-full py-2.5 px-3 bg-[#FACC15] hover:bg-[#FDE047] text-[#080B11] font-bold rounded-xl text-xs flex items-center justify-between shadow-md shadow-[#FACC15]/20 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
              className="w-full py-2 px-3 bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 font-semibold rounded-xl text-xs flex items-center justify-between transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
              className="w-full text-center text-[10px] text-[#94A3B8] hover:text-[#F8FAFC] pt-1 block cursor-pointer transition-colors"
            >
              Opções avançadas de simulação &amp; segmentos ▾
            </button>
          </div>
        )}

        {showDevSandbox && (
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#1E293B] w-full" />
            <span className="bg-[#0D121F] px-2 text-[10px] text-[#64748B] uppercase tracking-wider">
              ou autenticar com
            </span>
            <div className="border-t border-[#1E293B] w-full" />
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || devActionLoading !== null}
          className="w-full py-3 px-4 bg-[#F8FAFC] text-[#080B11] hover:bg-white transition font-bold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] cursor-pointer"
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
    <main className="min-h-screen flex items-center justify-center bg-[#080B11] text-[#F8FAFC] p-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
