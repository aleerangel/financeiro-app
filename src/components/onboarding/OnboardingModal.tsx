'use client';

import React, { useState } from 'react';
import {
  Store,
  User,
  Check,
  ArrowRight,
  ChevronLeft,
  Loader2,
  Sliders,
} from 'lucide-react';
import { BusinessSegment } from '@/types/database';
import { SEGMENTS_CONFIG } from '@/lib/business-presets';
import { completeOnboarding } from '@/lib/actions/business-profile';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const SEGMENT_OPTIONS: { value: BusinessSegment; label: string; icon: string; defaultLabel: string }[] = [
  { value: 'barbearia', label: 'Barbearia & Salão', icon: '💈', defaultLabel: 'Atendimentos' },
  { value: 'beleza_estetica', label: 'Beleza & Estética', icon: '✨', defaultLabel: 'Atendimentos' },
  { value: 'servicos_manutencao', label: 'Serviços & Manutenção', icon: '🔧', defaultLabel: 'Ordens de Serviço' },
  { value: 'saude_consultorio', label: 'Saúde & Consultório', icon: '🩺', defaultLabel: 'Consultas' },
  { value: 'aulas_treinamento', label: 'Aulas & Treinamento', icon: '🎓', defaultLabel: 'Aulas & Sessões' },
  { value: 'comercio_geral', label: 'Comércio & Autônomos', icon: '🛍️', defaultLabel: 'Vendas & Pedidos' },
  { value: 'outro', label: 'Geral / Outros', icon: '⚡', defaultLabel: 'Atendimentos' },
];

export function OnboardingModal() {
  const { profile } = useBusinessProfile();

  // Se já concluiu o onboarding, nunca renderiza
  if (profile.onboarding_completed) {
    return null;
  }

  return <OnboardingModalDialog />;
}

function OnboardingModalDialog() {
  const router = useRouter();
  const { setProfile } = useBusinessProfile();
  const { setContextMode } = useMobileNavigation();

  // Passo 1: Escolha do Modo (Negócio vs Pessoal)
  // Passo 2: Configuração do Negócio (se escolheu Negócio)
  const [step, setStep] = useState<'mode' | 'business_setup'>('mode');

  const [businessName, setBusinessName] = useState<string>('');
  const [segment, setSegment] = useState<BusinessSegment>('barbearia');
  const [salesLabel, setSalesLabel] = useState<string>('Atendimentos');
  const [defaultCycleDays, setDefaultCycleDays] = useState<number>(21);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectMode = (mode: 'business' | 'personal') => {
    if (mode === 'personal') {
      handleFinishPersonal();
    } else {
      setStep('business_setup');
    }
  };

  const handleSegmentChange = (newSegment: BusinessSegment) => {
    setSegment(newSegment);
    const config = SEGMENTS_CONFIG[newSegment];
    if (config) {
      setSalesLabel(config.defaultSalesLabel);
      setDefaultCycleDays(config.defaultCycleDays);
    }
  };

  const handleFinishPersonal = async () => {
    try {
      setSaving(true);
      const updated = await completeOnboarding({
        has_business: false,
        business_name: null,
      });
      setProfile(updated);
      setContextMode('personal');
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('financeiro_mobile_context_mode', 'personal');
        } catch {
          // Ignora erro de storage
        }
      }
      toast.success('Bem-vindo ao Canário! Seu controle de Finanças Pessoais está pronto.');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao concluir configuração inicial.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleFinishBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName.trim()) {
      setError('Por favor, informe o Nome Fantasia do seu negócio.');
      return;
    }

    try {
      setSaving(true);
      const updated = await completeOnboarding({
        has_business: true,
        business_name: businessName.trim(),
        segment,
        sales_label: salesLabel.trim() || 'Atendimentos',
        default_cycle_days: Number(defaultCycleDays) || 21,
      });

      setProfile(updated);
      setContextMode('business');
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('financeiro_mobile_context_mode', 'business');
        } catch {
          // Ignora erro de storage
        }
      }
      toast.success(`Bem-vindo ao Canário! O espaço de ${businessName.trim()} está pronto.`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao concluir configuração do negócio.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Topo / Logo Canário */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xl shrink-0 shadow-lg shadow-amber-500/10">
            <span role="img" aria-label="Canário">
              🐤
            </span>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
              Bem-vindo ao Canário
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                PRO
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Plataforma completa de gestão financeira e operacional
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* PASSO 1: Seleção de Modo de Uso */}
        {step === 'mode' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-bold text-zinc-100 mb-1">
                Como você deseja utilizar a plataforma?
              </h3>
              <p className="text-xs text-zinc-400">
                Você pode alternar ou ativar ferramentas adicionais a qualquer momento.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              {/* Opção A: Gerenciar Negócio + Finanças */}
              <button
                type="button"
                onClick={() => handleSelectMode('business')}
                disabled={saving}
                className="w-full p-4.5 bg-gradient-to-r from-amber-500/10 to-zinc-900 hover:from-amber-500/20 hover:to-zinc-850 border border-amber-500/30 rounded-2xl text-left transition group active:scale-[0.99] flex items-start gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0 mt-0.5">
                  <Store className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-zinc-100 group-hover:text-amber-300 transition-colors">
                      Meu Negócio & Atividade Profissional
                    </span>
                    <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <span className="text-xs text-zinc-400 block leading-relaxed">
                    Controle de atendimentos, vendas, fiados, WhatsApp, clientes e finanças PJ + Pessoais.
                  </span>
                </div>
              </button>

              {/* Opção B: Apenas Finanças Pessoais */}
              <button
                type="button"
                onClick={() => handleSelectMode('personal')}
                disabled={saving}
                className="w-full p-4.5 bg-zinc-950/60 hover:bg-zinc-800/80 border border-zinc-800 rounded-2xl text-left transition group active:scale-[0.99] flex items-start gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-zinc-800 text-blue-400 flex items-center justify-center font-bold shrink-0 mt-0.5 border border-zinc-700">
                  <User className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-zinc-200 group-hover:text-zinc-100 transition-colors">
                      Apenas Finanças Pessoais
                    </span>
                    {saving ? (
                      <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                  <span className="text-xs text-zinc-400 block leading-relaxed">
                    Contas bancárias, cartões de crédito, despesas, extrato e controle de orçamento familiar.
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: Configuração Inicial do Negócio */}
        {step === 'business_setup' && (
          <form onSubmit={handleFinishBusiness} className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('mode')}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
              <span className="text-[11px] font-bold text-amber-400">Passo 2 de 2</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-100">
                Informações do seu negócio
              </h3>
              <p className="text-xs text-zinc-400">
                Vamos personalizar os termos e rotinas ideais para sua atividade.
              </p>
            </div>

            {/* Nome Fantasia */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Nome Fantasia do Negócio *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ex: Minha Barbearia, Studio VIP, Silva Consultoria"
                autoFocus
                required
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition placeholder:text-zinc-600"
              />
            </div>

            {/* Segmento */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Selecione o Segmento
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {SEGMENT_OPTIONS.map((opt) => {
                  const isSelected = segment === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSegmentChange(opt.value)}
                      className={`p-2.5 rounded-xl text-left border transition flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-lg shrink-0">{opt.icon}</span>
                      <span className="text-xs font-bold truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nomenclatura das Operações */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                Como você chama suas vendas / atendimentos?
              </label>
              <input
                type="text"
                value={salesLabel}
                onChange={(e) => setSalesLabel(e.target.value)}
                placeholder="Ex: Atendimentos, Vendas, Serviços, Sessões"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            {/* Botão Finalizar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/10 transition active:scale-[0.99] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Configurando seu espaço...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    Concluir e Acessar Plataforma
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
