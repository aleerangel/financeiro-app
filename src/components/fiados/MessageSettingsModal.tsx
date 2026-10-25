'use client';

import { useState } from 'react';
import {
  X,
  Settings,
  QrCode,
  FileText,
  Save,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';
import {
  BusinessMessageSettings,
  PixKeyType,
  getTemplatesForSegment,
  PIX_KEY_LABELS,
} from '@/lib/whatsapp-templates';
import { saveMessageSettings } from '@/lib/actions/message-settings';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { getSegmentConfig } from '@/lib/business-presets';
import { toast } from 'sonner';

interface MessageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: BusinessMessageSettings;
  onSaved?: (settings: BusinessMessageSettings) => void;
}

export function MessageSettingsModal({
  isOpen,
  onClose,
  initialSettings,
  onSaved,
}: MessageSettingsModalProps) {
  const { profile, businessName } = useBusinessProfile();
  const segmentConfig = getSegmentConfig(profile.segment);
  const segmentTemplates = getTemplatesForSegment(profile.segment);

  const [activeTab, setActiveTab] = useState<'pix' | 'templates'>('pix');
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(
    initialSettings.pix_key_type || 'phone'
  );
  const [pixKey, setPixKey] = useState(initialSettings.pix_key || '');
  const [pixHolderName, setPixHolderName] = useState(
    initialSettings.pix_holder_name || ''
  );
  const [includePixDefault, setIncludePixDefault] = useState(
    initialSettings.include_pix_default ?? true
  );

  // Templates especializados no segmento ativo
  const [templateFriendly, setTemplateFriendly] = useState(
    initialSettings.template_friendly || segmentTemplates.friendly
  );
  const [templateDefault, setTemplateDefault] = useState(
    initialSettings.template_default || segmentTemplates.default
  );
  const [templateFirm, setTemplateFirm] = useState(
    initialSettings.template_firm || segmentTemplates.firm
  );
  const [templateCreditReceipt, setTemplateCreditReceipt] = useState(
    initialSettings.template_sale_credit_receipt || segmentTemplates.creditReceipt
  );
  const [templateReturnWindow, setTemplateReturnWindow] = useState(
    initialSettings.template_return_window || segmentTemplates.returnWindowCasual
  );
  const [templateInactiveRecovery, setTemplateInactiveRecovery] = useState(
    initialSettings.template_inactive_recovery ||
      segmentTemplates.inactiveRecoveryCasual
  );
  const [templateBirthday, setTemplateBirthday] = useState(
    initialSettings.template_birthday || segmentTemplates.birthdayCasual
  );

  const [selectedTemplateTab, setSelectedTemplateTab] = useState<
    | 'friendly'
    | 'default'
    | 'firm'
    | 'creditReceipt'
    | 'returnWindow'
    | 'inactiveRecovery'
    | 'birthday'
  >('friendly');

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    setTemplateFriendly(segmentTemplates.friendly);
    setTemplateDefault(segmentTemplates.default);
    setTemplateFirm(segmentTemplates.firm);
    setTemplateCreditReceipt(segmentTemplates.creditReceipt);
    setTemplateReturnWindow(segmentTemplates.returnWindowCasual);
    setTemplateInactiveRecovery(segmentTemplates.inactiveRecoveryCasual);
    setTemplateBirthday(segmentTemplates.birthdayCasual);
    toast.info(`Modelos restaurados para o padrão de ${segmentConfig.label}.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveMessageSettings({
        pix_key_type: pixKeyType,
        pix_key: pixKey.trim() || null,
        pix_holder_name: pixHolderName.trim() || null,
        include_pix_default: includePixDefault,
        template_friendly: templateFriendly,
        template_default: templateDefault,
        template_firm: templateFirm,
        template_sale_credit_receipt: templateCreditReceipt,
        template_return_window: templateReturnWindow,
        template_inactive_recovery: templateInactiveRecovery,
        template_birthday: templateBirthday,
      });

      toast.success('Configurações salvas com sucesso!');
      onSaved?.(saved);
      onClose();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao salvar configurações.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Configurações de WhatsApp & Pix
              </h2>
              <p className="text-xs text-slate-400">
                Chave de recebimento e modelos automáticos de mensagens
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('pix')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'pix'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Chave Pix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Modelos de Mensagens</span>
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'pix' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Esta chave Pix será adicionada automaticamente ao final das mensagens de cobrança e recibos no WhatsApp, facilitando a cópia pelo cliente.
                </span>
              </div>

              {/* Tipo de Chave */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Tipo da Chave Pix
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['phone', 'cpf', 'cnpj', 'email', 'random'] as PixKeyType[]).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPixKeyType(type)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                          pixKeyType === type
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {PIX_KEY_LABELS[type]}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Chave Pix */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Chave Pix
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder={
                    pixKeyType === 'phone'
                      ? 'Ex: (11) 99999-8888'
                      : pixKeyType === 'cpf'
                      ? 'Ex: 123.456.789-00'
                      : pixKeyType === 'email'
                      ? 'Ex: contato@seunegocio.com'
                      : 'Digite a chave Pix'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Nome do Favorecido */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Nome do Favorecido / {businessName || 'Negócio'} (Opcional)
                </label>
                <input
                  type="text"
                  value={pixHolderName}
                  onChange={(e) => setPixHolderName(e.target.value)}
                  placeholder={`Ex: ${businessName || 'Meu Negócio'} ou Alexandre Rangel`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Toggle de inclusão padrão */}
              <label className="flex items-center gap-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePixDefault}
                  onChange={(e) => setIncludePixDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white block">
                    Incluir Chave Pix por padrão
                  </span>
                  <span className="text-slate-400">
                    Marca automaticamente o envio de Pix ao abrir os modais de cobrança
                  </span>
                </div>
              </label>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Modelos baseados em:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30">
                    {segmentConfig.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar padrões</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Selecione o modelo para editar:
                </span>
              </div>

              {/* Sub-abas de templates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTemplateTab('friendly')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedTemplateTab === 'friendly'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Amigável
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateTab('default')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedTemplateTab === 'default'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Padrão
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateTab('firm')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedTemplateTab === 'firm'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Firme
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateTab('creditReceipt')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedTemplateTab === 'creditReceipt'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Recibo Fiado
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateTab('returnWindow')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedTemplateTab === 'returnWindow'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Retorno
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateTab('inactiveRecovery')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedTemplateTab === 'inactiveRecovery'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Inativos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplateTab('birthday')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedTemplateTab === 'birthday'
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Aniversário
                </button>
              </div>

              {/* Editor do template selecionado */}
              <div>
                {selectedTemplateTab === 'friendly' && (
                  <textarea
                    value={templateFriendly}
                    onChange={(e) => setTemplateFriendly(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                  />
                )}
                {selectedTemplateTab === 'default' && (
                  <textarea
                    value={templateDefault}
                    onChange={(e) => setTemplateDefault(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                  />
                )}
                {selectedTemplateTab === 'firm' && (
                  <textarea
                    value={templateFirm}
                    onChange={(e) => setTemplateFirm(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                  />
                )}
                {selectedTemplateTab === 'creditReceipt' && (
                  <textarea
                    value={templateCreditReceipt}
                    onChange={(e) => setTemplateCreditReceipt(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                  />
                )}
                {selectedTemplateTab === 'returnWindow' && (
                  <textarea
                    value={templateReturnWindow}
                    onChange={(e) => setTemplateReturnWindow(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                  />
                )}
                {selectedTemplateTab === 'inactiveRecovery' && (
                  <textarea
                    value={templateInactiveRecovery}
                    onChange={(e) => setTemplateInactiveRecovery(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                  />
                )}
                {selectedTemplateTab === 'birthday' && (
                  <textarea
                    value={templateBirthday}
                    onChange={(e) => setTemplateBirthday(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                  />
                )}
              </div>

              {/* Legenda de Tags Dinâmicas */}
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5 text-xs text-slate-400">
                <span className="font-semibold text-slate-300 block">
                  Tags disponíveis para usar no texto:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400">
                    {'{primeiro_nome}'}
                  </code>
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400">
                    {'{nome}'}
                  </code>
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400">
                    {'{valor}'}
                  </code>
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400">
                    {'{vencimento}'}
                  </code>
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400">
                    {'{dias_atraso}'}
                  </code>
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400">
                    {'{itens}'}
                  </code>
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400">
                    {'{bloco_pix}'}
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Botões do Rodapé */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
