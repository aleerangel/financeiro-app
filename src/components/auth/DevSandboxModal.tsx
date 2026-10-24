'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Database,
  ArrowRight,
  Loader2,
  TestTube,
} from 'lucide-react';
import { BusinessSegment } from '@/types/database';
import { createSandboxAccount } from '@/lib/actions/dev-sandbox';
import { toast } from 'sonner';

interface DevSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SEGMENT_OPTIONS: { value: BusinessSegment; label: string; icon: string }[] = [
  { value: 'barbearia', label: 'Barbearia & Salão', icon: '💈' },
  { value: 'beleza_estetica', label: 'Beleza & Estética', icon: '✨' },
  { value: 'servicos_manutencao', label: 'Serviços & Manutenção', icon: '🔧' },
  { value: 'saude_consultorio', label: 'Saúde & Consultório', icon: '🩺' },
  { value: 'aulas_treinamento', label: 'Aulas & Treinamento', icon: '🎓' },
  { value: 'comercio_geral', label: 'Comércio & Autônomos', icon: '🛍️' },
];

export function DevSandboxModal({ isOpen, onClose }: DevSandboxModalProps) {
  const [loadingMode, setLoadingMode] = useState<'clean' | 'demo' | null>(null);
  const [demoSegment, setDemoSegment] = useState<BusinessSegment>('barbearia');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (mode: 'clean' | 'demo') => {
    try {
      setLoadingMode(mode);
      setError(null);

      const result = await createSandboxAccount({
        mode,
        segment: mode === 'demo' ? demoSegment : undefined,
      });

      toast.success(
        mode === 'clean'
          ? 'Conta zerada criada com sucesso! Redirecionando para o Onboarding...'
          : 'Conta Demo criada com dados realistas! Redirecionando para o Dashboard...'
      );

      // Redirecionamento completo para carregar a nova sessão com cookies limpos
      window.location.href = result.redirectUrl || '/dashboard';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar conta de teste.';
      setError(msg);
      toast.error(msg);
      setLoadingMode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Fechar */}
        <button
          type="button"
          onClick={onClose}
          disabled={loadingMode !== null}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Topo */}
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-zinc-800">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-lg shrink-0">
            <TestTube className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-zinc-100 flex items-center gap-2">
              Sandbox de Desenvolvimento
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Localhost
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Simule uma nova conta instantaneamente para testes
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Opção 1: Conta Zerada */}
          <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm text-zinc-100 block">
                  Conta 100% Zerada (Novo Usuário)
                </span>
                <span className="text-xs text-zinc-400 block mt-0.5 leading-relaxed">
                  Inicia no assistente de primeiro acesso (Onboarding) para validar a experiência de um usuário recém-cadastrado.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCreate('clean')}
              disabled={loadingMode !== null}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition active:scale-[0.99] disabled:opacity-50"
            >
              {loadingMode === 'clean' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Criando e autenticando...
                </>
              ) : (
                <>
                  <span>Criar Conta Zerada</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Opção 2: Conta Demo Pré-Populada */}
          <div className="p-4 bg-zinc-950/70 border border-amber-500/30 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm text-zinc-100 block">
                  Conta Demo Pré-Populada (Dados Realistas)
                </span>
                <span className="text-xs text-zinc-400 block mt-0.5 leading-relaxed">
                  Já inclui 2 contas, 1 cartão, 5 clientes no CRM, 2 fiados, 1 mensalista e movimentações no mês para testar gráficos.
                </span>
              </div>
            </div>

            {/* Escolha do Segmento da Demo */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Segmento de Demonstração
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {SEGMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDemoSegment(opt.value)}
                    disabled={loadingMode !== null}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border text-left flex items-center gap-2 transition ${
                      demoSegment === opt.value
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCreate('demo')}
              disabled={loadingMode !== null}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition active:scale-[0.99] disabled:opacity-50"
            >
              {loadingMode === 'demo' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Gerando massa de dados e autenticando...
                </>
              ) : (
                <>
                  <span>Criar Conta Demo com Dados</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
