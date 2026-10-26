'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  Check,
  Loader2,
  Clock,
  QrCode,
  Sliders,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { BusinessSegment } from '@/types/database';
import { SEGMENTS_CONFIG } from '@/lib/business-presets';
import { saveBusinessProfile } from '@/lib/actions/business-profile';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { formatCNPJ, isValidCNPJ } from '@/lib/cnpj-utils';
import { PixKeyType, PIX_KEY_LABELS, BusinessMessageSettings } from '@/lib/whatsapp-templates';
import {
  getMessageSettings,
  saveMessageSettings,
  resetMessageSettingsToSegment,
} from '@/lib/actions/message-settings';
import { MessageSettingsModal } from '@/components/fiados/MessageSettingsModal';
import { toast } from 'sonner';

interface BusinessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const SEGMENT_OPTIONS: { value: BusinessSegment; label: string; icon: string; defaultLabel: string }[] = [
  { value: 'barbearia', label: 'Barbearia', icon: '💈', defaultLabel: 'Atendimentos' },
  { value: 'beleza_estetica', label: 'Beleza & Estética', icon: '✨', defaultLabel: 'Atendimentos' },
  { value: 'servicos_manutencao', label: 'Serviços & Manutenção', icon: '🔧', defaultLabel: 'Ordens de Serviço' },
  { value: 'saude_consultorio', label: 'Saúde & Consultório', icon: '🩺', defaultLabel: 'Consultas' },
  { value: 'aulas_treinamento', label: 'Aulas & Treinamento', icon: '🎓', defaultLabel: 'Aulas & Sessões' },
  { value: 'comercio_geral', label: 'Comércio & Autônomos', icon: '🛍️', defaultLabel: 'Vendas & Pedidos' },
  { value: 'outro', label: 'Geral / Outros', icon: '⚡', defaultLabel: 'Atendimentos' },
];

export function BusinessSettingsModal({
  isOpen,
  onClose,
  onSaved,
}: BusinessSettingsModalProps) {
  const { profile, setProfile } = useBusinessProfile();

  const [hasBusiness, setHasBusiness] = useState<boolean>(profile.has_business);
  const [businessName, setBusinessName] = useState<string>(profile.business_name || '');
  const [cnpj, setCnpj] = useState<string>(profile.cnpj || '');
  const [segment, setSegment] = useState<BusinessSegment>(profile.segment || 'barbearia');
  const [salesLabel, setSalesLabel] = useState<string>(profile.sales_label || 'Atendimentos');
  const [defaultCycleDays, setDefaultCycleDays] = useState<number>(profile.default_cycle_days || 21);

  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('phone');
  const [pixKey, setPixKey] = useState<string>('');
  const [pixHolderName, setPixHolderName] = useState<string>('');

  const [messageSettings, setMessageSettings] = useState<BusinessMessageSettings | null>(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [updateTemplatesOnSave, setUpdateTemplatesOnSave] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getMessageSettings().then((msgSettings) => {
        setMessageSettings(msgSettings);
        if (msgSettings.pix_key_type) setPixKeyType(msgSettings.pix_key_type);
        if (msgSettings.pix_key) setPixKey(msgSettings.pix_key);
        if (msgSettings.pix_holder_name) setPixHolderName(msgSettings.pix_holder_name);
      }).catch(() => {
        // Silencioso
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(formatCNPJ(e.target.value));
  };

  const handleSegmentChange = (newSegment: BusinessSegment) => {
    setSegment(newSegment);
    const config = SEGMENTS_CONFIG[newSegment];
    if (config) {
      setSalesLabel(config.defaultSalesLabel);
      setDefaultCycleDays(config.defaultCycleDays);
    }
    if (newSegment !== profile.segment) {
      setUpdateTemplatesOnSave(true);
    } else {
      setUpdateTemplatesOnSave(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (hasBusiness && !businessName.trim()) {
      setError('Por favor, informe o Nome Fantasia do seu negócio.');
      return;
    }

    if (hasBusiness && cnpj.trim()) {
      if (!isValidCNPJ(cnpj)) {
        setError('O CNPJ informado é inválido. Verifique os números digitados.');
        return;
      }
    }

    try {
      setSaving(true);
      const updated = await saveBusinessProfile({
        business_name: businessName.trim() || 'Meu Negócio',
        cnpj: cnpj.trim() || null,
        segment,
        sales_label: salesLabel.trim() || 'Atendimentos',
        default_cycle_days: Number(defaultCycleDays) || 21,
        has_business: hasBusiness,
      });

      // Se o usuário optou por atualizar os modelos de WhatsApp para o novo segmento
      if (updateTemplatesOnSave && segment !== profile.segment) {
        await resetMessageSettingsToSegment(segment).catch(() => null);
      } else if (pixKey.trim()) {
        // Salva dados Pix se preenchidos mantendo templates
        await saveMessageSettings({
          pix_key_type: pixKeyType,
          pix_key: pixKey.trim(),
          pix_holder_name: pixHolderName.trim() || null,
        }).catch(() => null);
      }

      setProfile(updated);
      toast.success('Configurações do negócio salvas com sucesso!');
      if (onSaved) onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar configurações';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Topo / Cabeçalho */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
              Meu Negócio
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Canário
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Personalize o nome fantasia, segmento e rotinas do seu negócio
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* 1. Ativação do Módulo de Negócio */}
          <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-bold text-zinc-100 block">
                Ativar ferramentas de negócio
              </span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                Exibir controle de atendimentos, clientes, catálogo e fiados
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHasBusiness(!hasBusiness)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                hasBusiness ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
              role="switch"
              aria-checked={hasBusiness}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  hasBusiness ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {hasBusiness && (
            <>
              {/* 2. Nome Fantasia */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Nome Fantasia do Negócio *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex: Minha Barbearia, Studio VIP, Silva Consultoria"
                  required
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition placeholder:text-zinc-600"
                />
              </div>

              {/* 2.1 CNPJ da Empresa (Opcional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    CNPJ da Empresa
                  </label>
                  <span className="text-[10px] text-zinc-500 font-medium">Opcional</span>
                </div>
                <input
                  type="text"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition placeholder:text-zinc-600 font-mono"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Exibido em relatórios consolidados e extratos da sua empresa.
                </p>
              </div>

              {/* 3. Seleção do Macro-Segmento */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Segmento de Atuação
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SEGMENT_OPTIONS.map((opt) => {
                    const isSelected = segment === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSegmentChange(opt.value)}
                        className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xl">{opt.icon}</span>
                        <div>
                          <span className="text-xs font-bold block leading-tight">
                            {opt.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Diálogo/Aviso contextual de atualização de templates WhatsApp ao trocar segmento */}
                {segment !== profile.segment && (
                  <div className="mt-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-amber-300 block">
                          Segmento alterado para {SEGMENTS_CONFIG[segment]?.label}
                        </span>
                        <span className="text-zinc-300 block mt-0.5">
                          Deseja atualizar os modelos padrão de WhatsApp para o estilo deste novo segmento ou manter seus textos atuais?
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pl-6">
                      <button
                        type="button"
                        onClick={() => setUpdateTemplatesOnSave(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          updateTemplatesOnSave
                            ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        ✓ Atualizar textos para {SEGMENTS_CONFIG[segment]?.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUpdateTemplatesOnSave(false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          !updateTemplatesOnSave
                            ? 'bg-zinc-700 text-zinc-100 border border-zinc-600'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Manter meus textos atuais
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Nomenclatura das Vendas e Ciclo Padrão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                    Rótulo das Operações
                  </label>
                  <input
                    type="text"
                    value={salesLabel}
                    onChange={(e) => setSalesLabel(e.target.value)}
                    placeholder="Ex: Atendimentos, Vendas, Serviços"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Usado em menus, botões e recibos
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    Ciclo de Retorno CRM (Dias)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={defaultCycleDays}
                    onChange={(e) => setDefaultCycleDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Janela estimada de retorno para clientes recorrentes
                  </span>
                </div>
              </div>

              {/* 5. Dados Pix para Cobranças e Recibos WhatsApp */}
              <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>Dados Pix para Mensagens WhatsApp (Opcional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Tipo de Chave
                    </label>
                    <select
                      value={pixKeyType}
                      onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                    >
                      {Object.entries(PIX_KEY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Chave Pix
                    </label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Ex: celular, e-mail ou CPF"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Nome do Titular
                  </label>
                  <input
                    type="text"
                    value={pixHolderName}
                    onChange={(e) => setPixHolderName(e.target.value)}
                    placeholder="Ex: João da Silva / Barbearia Top"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* 6. Atalho para Personalização de Modelos de Mensagens WhatsApp */}
              <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">
                      Modelos de Mensagens do WhatsApp
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Personalize textos de cobrança, fiados, radar de retorno e aniversários
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMessageModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold transition active:scale-95 shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Personalizar Textos</span>
                </button>
              </div>
            </>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  Salvar Preferências
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {messageModalOpen && (
        <MessageSettingsModal
          isOpen={messageModalOpen}
          onClose={() => setMessageModalOpen(false)}
          initialSettings={
            messageSettings || {
              pix_key_type: pixKeyType,
              pix_key: pixKey || null,
              pix_holder_name: pixHolderName || null,
              template_friendly: null,
              template_default: null,
              template_firm: null,
              template_sale_credit_receipt: null,
              include_pix_default: true,
            }
          }
          onSaved={(newSettings) => {
            setMessageSettings(newSettings);
            if (newSettings.pix_key_type) setPixKeyType(newSettings.pix_key_type);
            if (newSettings.pix_key) setPixKey(newSettings.pix_key);
            if (newSettings.pix_holder_name) setPixHolderName(newSettings.pix_holder_name);
          }}
        />
      )}
    </div>
  );
}

