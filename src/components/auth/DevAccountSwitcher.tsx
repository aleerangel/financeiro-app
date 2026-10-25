'use client';

import React, { useState } from 'react';
import { TestTube, Sparkles, Database, RotateCcw, LogOut, ChevronUp } from 'lucide-react';
import { createSandboxAccount, loginOrCreateSandboxUser } from '@/lib/actions/dev-sandbox';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function DevAccountSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleAction = async (action: 'demo' | 'clean' | 'reset-demo') => {
    try {
      setLoading(action);
      if (action === 'demo') {
        await loginOrCreateSandboxUser('demo');
        toast.success('Alternado para a Conta Demo!');
      } else if (action === 'clean') {
        await createSandboxAccount({ mode: 'clean' });
        toast.success('Conta Zerada pronta! Abrindo Onboarding...');
      } else if (action === 'reset-demo') {
        await createSandboxAccount({ mode: 'demo' });
        toast.success('Dados da Conta Demo resetados com sucesso!');
      }
      window.location.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar ação de sandbox.';
      toast.error(msg);
      setLoading(null);
    }
  };

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 z-40 text-xs">
      {isOpen && (
        <div className="mb-2 p-3 bg-zinc-900/95 border border-amber-500/30 rounded-2xl shadow-2xl backdrop-blur-md w-64 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[11px] font-bold text-amber-400">
            <span className="flex items-center gap-1.5">
              <TestTube className="w-3.5 h-3.5" />
              Dev Sandbox (Localhost)
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleAction('demo')}
              className="w-full text-left px-2.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold flex items-center gap-2 transition disabled:opacity-50"
            >
              <Database className="w-4 h-4 shrink-0 text-amber-400" />
              <div className="flex-1 truncate">
                <span className="block text-xs">Acessar Conta Demo</span>
                <span className="block text-[10px] text-amber-400/70 font-normal">
                  Com clientes, vendas e gráficos
                </span>
              </div>
            </button>

            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleAction('clean')}
              className="w-full text-left px-2.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-semibold flex items-center gap-2 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
              <div className="flex-1 truncate">
                <span className="block text-xs">Alternar para Conta Zerada</span>
                <span className="block text-[10px] text-blue-400/70 font-normal">
                  Testar fluxo de Onboarding
                </span>
              </div>
            </button>

            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleAction('reset-demo')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 transition text-[11px] disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Resetar dados da Demo</span>
            </button>

            <button
              type="button"
              disabled={loading !== null}
              onClick={async () => {
                try {
                  setLoading('logout');
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.replace('/login?manual=true');
                } catch {
                  window.location.replace('/login?manual=true');
                }
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 flex items-center gap-2 transition text-[11px] disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Sair / Ir para Tela de Login</span>
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-900/90 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 rounded-full shadow-lg backdrop-blur-md transition active:scale-95 font-semibold text-[11px]"
        title="Menu de Contas de Desenvolvimento"
      >
        <TestTube className="w-3.5 h-3.5" />
        <span>Dev Sandbox</span>
        <ChevronUp className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
