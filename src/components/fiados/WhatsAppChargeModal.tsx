'use client';

import { useState } from 'react';
import {
  X,
  MessageCircle,
  Send,
  Copy,
  Check,
  Smile,
  AlertTriangle,
  QrCode,
  Settings,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BusinessMessageSettings,
  DEFAULT_TEMPLATES,
  renderWhatsAppTemplate,
} from '@/lib/whatsapp-templates';
import { toast } from 'sonner';
import { MessageSettingsModal } from './MessageSettingsModal';

type ToneType = 'friendly' | 'default' | 'firm';

export interface WhatsAppChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientPhone?: string | null;
  totalDebt: number;
  pendingSalesCount: number;
  mostUrgentDueDate?: string | null;
  isOverdue: boolean;
  daysDiff?: number | null;
  messageSettings?: BusinessMessageSettings | null;
  onSettingsSaved?: (settings: BusinessMessageSettings) => void;
}

type ContentProps = Omit<WhatsAppChargeModalProps, 'isOpen'>;

function WhatsAppChargeContent({
  onClose,
  clientName,
  clientPhone,
  totalDebt,
  pendingSalesCount,
  mostUrgentDueDate,
  isOverdue,
  daysDiff,
  messageSettings,
  onSettingsSaved,
}: ContentProps) {
  const [activeSettings, setActiveSettings] = useState<BusinessMessageSettings>(
    messageSettings || {
      pix_key_type: 'phone',
      pix_key: null,
      pix_holder_name: null,
      template_friendly: DEFAULT_TEMPLATES.friendly,
      template_default: DEFAULT_TEMPLATES.default,
      template_firm: DEFAULT_TEMPLATES.firm,
      template_sale_credit_receipt: DEFAULT_TEMPLATES.creditReceipt,
      include_pix_default: true,
    }
  );

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Se o cliente estiver muito atrasado, sugere o tom firme inicialmente; se não, amigável ou padrão
  const initialTone: ToneType = isOverdue
    ? 'firm'
    : mostUrgentDueDate
    ? 'default'
    : 'friendly';

  const [selectedTone, setSelectedTone] = useState<ToneType>(initialTone);
  const [includePix, setIncludePix] = useState(
    activeSettings.include_pix_default ?? true
  );

  // Função pura para renderizar o texto com base no tom e configurações atuais
  const getRenderedText = (tone: ToneType, withPix: boolean) => {
    let tpl = activeSettings.template_default || DEFAULT_TEMPLATES.default;
    if (tone === 'friendly') {
      tpl = activeSettings.template_friendly || DEFAULT_TEMPLATES.friendly;
    } else if (tone === 'firm') {
      tpl = activeSettings.template_firm || DEFAULT_TEMPLATES.firm;
    }

    const formattedValue = formatCurrency(totalDebt);
    const formattedDueDate = mostUrgentDueDate ? formatDate(mostUrgentDueDate) : null;

    return renderWhatsAppTemplate(
      tpl,
      {
        nome: clientName,
        valor: formattedValue,
        vencimento: formattedDueDate,
        dias_atraso: isOverdue ? daysDiff || 1 : null,
      },
      withPix,
      {
        key: activeSettings.pix_key,
        keyType: activeSettings.pix_key_type,
        holderName: activeSettings.pix_holder_name,
      }
    );
  };

  const [message, setMessage] = useState(() =>
    getRenderedText(initialTone, activeSettings.include_pix_default ?? true)
  );
  const [copied, setCopied] = useState(false);

  const handleToneChange = (newTone: ToneType) => {
    setSelectedTone(newTone);
    setMessage(getRenderedText(newTone, includePix));
  };

  const handleIncludePixToggle = (checked: boolean) => {
    setIncludePix(checked);
    setMessage(getRenderedText(selectedTone, checked));
  };

  const handleSettingsSaved = (newSettings: BusinessMessageSettings) => {
    setActiveSettings(newSettings);
    onSettingsSaved?.(newSettings);
    setMessage(
      renderWhatsAppTemplate(
        selectedTone === 'friendly'
          ? newSettings.template_friendly || DEFAULT_TEMPLATES.friendly
          : selectedTone === 'firm'
          ? newSettings.template_firm || DEFAULT_TEMPLATES.firm
          : newSettings.template_default || DEFAULT_TEMPLATES.default,
        {
          nome: clientName,
          valor: formatCurrency(totalDebt),
          vencimento: mostUrgentDueDate ? formatDate(mostUrgentDueDate) : null,
          dias_atraso: isOverdue ? daysDiff || 1 : null,
        },
        includePix,
        {
          key: newSettings.pix_key,
          keyType: newSettings.pix_key_type,
          holderName: newSettings.pix_holder_name,
        }
      )
    );
  };

  const cleanPhone = (clientPhone || '').replace(/\D/g, '');
  const hasValidPhone = cleanPhone.length >= 10;
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const handleOpenWhatsApp = () => {
    if (!hasValidPhone) {
      toast.error('Este cliente não possui um número de WhatsApp cadastrado.');
      return;
    }

    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Mensagem copiada para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar automaticamente.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Cobrar no WhatsApp</h2>
                <p className="text-xs text-slate-400">
                  Escolha o estilo de abordagem e revise antes de enviar
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                title="Configurar Chave Pix e Modelos"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Resumo do Débito */}
          <div className="p-4 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Cliente</span>
              <span className="text-sm font-semibold text-white">{clientName}</span>
              {clientPhone && (
                <span className="text-xs text-slate-400 block">{clientPhone}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">
                Total Devedor ({pendingSalesCount} {pendingSalesCount === 1 ? 'comanda' : 'comandas'})
              </span>
              <span className="text-base font-bold text-amber-400">
                {formatCurrency(totalDebt)}
              </span>
            </div>
          </div>

          {/* Corpo com Seletores */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Seletor de Tons de Voz */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Tom de Abordagem:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleToneChange('friendly')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    selectedTone === 'friendly'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smile className="w-4 h-4" />
                  <span>Amigável</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToneChange('default')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    selectedTone === 'default'
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/40 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Padrão</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToneChange('firm')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    selectedTone === 'firm'
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Firme (Atraso)</span>
                </button>
              </div>
            </div>

            {/* Inclusão de Chave Pix */}
            <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includePix}
                  onChange={(e) => handleIncludePixToggle(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                />
                <span className="font-semibold text-slate-300">
                  Incluir Chave Pix no texto
                </span>
              </label>

              {activeSettings.pix_key ? (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {activeSettings.pix_key}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <QrCode className="w-3 h-3" />
                  <span>Cadastrar Pix</span>
                </button>
              )}
            </div>

            {/* Textarea de Edição Livre */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Texto da Mensagem:
                </label>
                <button
                  type="button"
                  onClick={() => setMessage(getRenderedText(selectedTone, includePix))}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Restaurar tom selecionado
                </button>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono leading-relaxed"
                placeholder="Texto da cobrança..."
              />
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Você pode digitar ou apagar qualquer palavra antes de disparar o WhatsApp.
            </p>
          </div>

          {/* Footer / Ações */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700/60"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                disabled={!hasValidPhone}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Send className="w-4 h-4" />
                <span>Abrir no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Configurações de Mensagens & Pix */}
      <MessageSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialSettings={activeSettings}
        onSaved={handleSettingsSaved}
      />
    </>
  );
}

export function WhatsAppChargeModal(props: WhatsAppChargeModalProps) {
  if (!props.isOpen) return null;

  return (
    <WhatsAppChargeContent
      key={`${props.clientName}-${props.totalDebt}-${props.pendingSalesCount}`}
      {...props}
    />
  );
}
