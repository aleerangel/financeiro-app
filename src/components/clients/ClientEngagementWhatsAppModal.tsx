'use client';

import { useState } from 'react';
import {
  X,
  MessageCircle,
  Send,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  Cake,
  Smile,
  ShieldCheck,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  BusinessMessageSettings,
  DEFAULT_TEMPLATES,
  renderWhatsAppTemplate,
} from '@/lib/whatsapp-templates';
import { markClientContacted } from '@/lib/actions/clients';
import { toast } from 'sonner';

export type EngagementPurpose =
  | 'return_window'
  | 'inactive_recovery'
  | 'birthday'
  | 'general';

export interface ClientEngagementWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    name: string;
    phone?: string | null;
    birth_date?: string | null;
    last_contacted_at?: string | null;
  };
  purpose?: EngagementPurpose;
  daysSinceLastVisit?: number | null;
  messageSettings?: BusinessMessageSettings | null;
  onContactRecorded?: (clientId: string, contactedAt: string) => void;
}

export function ClientEngagementWhatsAppModal({
  isOpen,
  onClose,
  client,
  purpose = 'return_window',
  daysSinceLastVisit,
  messageSettings,
  onContactRecorded,
}: ClientEngagementWhatsAppModalProps) {
  // Configurações e Templates
  const settings = messageSettings || {
    pix_key_type: 'phone',
    pix_key: null,
    pix_holder_name: null,
    template_friendly: null,
    template_default: null,
    template_firm: null,
    template_sale_credit_receipt: null,
    template_return_window: DEFAULT_TEMPLATES.returnWindowCasual,
    template_inactive_recovery: DEFAULT_TEMPLATES.inactiveRecoveryCasual,
    template_birthday: DEFAULT_TEMPLATES.birthdayCasual,
    include_pix_default: false,
  };

  // Cálculo de dias desde o último contato WhatsApp
  const lastContactInfo = (() => {
    if (!client.last_contacted_at) return null;
    const contactDate = new Date(client.last_contacted_at);
    const now = new Date();
    const diffMs = now.getTime() - contactDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return {
      diffDays,
      formattedDate: formatDate(client.last_contacted_at.split('T')[0]),
      isRecent: diffDays < 14,
    };
  })();

  // Definição de Tons por Propósito
  const toneOptions = (() => {
    if (purpose === 'birthday') {
      return [
        {
          id: 'birthday_casual',
          label: 'Parabéns da Barbearia',
          icon: Cake,
          template: settings.template_birthday || DEFAULT_TEMPLATES.birthdayCasual,
        },
        {
          id: 'birthday_gift',
          label: 'Presente no Corte',
          icon: Sparkles,
          template: DEFAULT_TEMPLATES.birthdayGift,
        },
      ];
    }

    if (purpose === 'inactive_recovery') {
      return [
        {
          id: 'inactive_casual',
          label: 'Saudades / Como vai',
          icon: Smile,
          template:
            settings.template_inactive_recovery ||
            DEFAULT_TEMPLATES.inactiveRecoveryCasual,
        },
        {
          id: 'inactive_promo',
          label: 'Oferta Especial de Retorno',
          icon: Sparkles,
          template: DEFAULT_TEMPLATES.inactiveRecoveryPromo,
        },
      ];
    }

    // Default: return_window ou general
    return [
      {
        id: 'return_casual',
        label: 'Casual / Parceria',
        icon: Smile,
        template:
          settings.template_return_window || DEFAULT_TEMPLATES.returnWindowCasual,
      },
      {
        id: 'return_vip',
        label: 'Convite VIP',
        icon: Sparkles,
        template: DEFAULT_TEMPLATES.returnWindowVip,
      },
    ];
  })();

  const [selectedToneId, setSelectedToneId] = useState(toneOptions[0]?.id || '');

  const generateMessage = (toneId: string) => {
    const selected = toneOptions.find((t) => t.id === toneId) || toneOptions[0];
    const template = selected?.template || DEFAULT_TEMPLATES.returnWindowCasual;

    return renderWhatsAppTemplate(
      template,
      {
        nome: client.name,
        dias_ultima_visita: daysSinceLastVisit || 30,
      },
      false
    );
  };

  const [message, setMessage] = useState(() =>
    generateMessage(toneOptions[0]?.id || '')
  );
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleToneSelect = (toneId: string) => {
    setSelectedToneId(toneId);
    setMessage(generateMessage(toneId));
  };

  const cleanPhone = (client.phone || '').replace(/\D/g, '');
  const hasValidPhone = cleanPhone.length >= 10;
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const recordContact = async () => {
    try {
      const nowIso = await markClientContacted(client.id);
      onContactRecorded?.(client.id, nowIso);
    } catch {
      // Ignora erro silencioso de rastreamento para não bloquear a saída
    }
  };

  const handleOpenWhatsApp = async () => {
    if (!hasValidPhone) {
      toast.error('Este cliente não possui um telefone ou WhatsApp cadastrado.');
      return;
    }

    await recordContact();
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('Contato registrado no perfil do cliente!');
    onClose();
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      await recordContact();
      toast.success('Mensagem copiada e contato registrado no perfil do cliente!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar a mensagem.');
    }
  };

  const modalTitle =
    purpose === 'birthday'
      ? 'Felicitar Aniversariante no WhatsApp'
      : purpose === 'inactive_recovery'
      ? 'Resgate de Cliente Inativo'
      : 'Radar de Retorno no WhatsApp';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                purpose === 'birthday'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : purpose === 'inactive_recovery'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}
            >
              {purpose === 'birthday' ? (
                <Cake className="w-5 h-5" />
              ) : (
                <MessageCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{modalTitle}</h2>
              <p className="text-xs text-slate-400">
                Personalize o estilo e revise antes de enviar
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

        {/* Resumo do Cliente */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Cliente</span>
            <span className="text-sm font-semibold text-white">{client.name}</span>
            {client.phone && (
              <span className="text-xs text-slate-400 block">{client.phone}</span>
            )}
          </div>
          <div className="text-right">
            {typeof daysSinceLastVisit === 'number' && (
              <>
                <span className="text-xs text-slate-400 block">Último corte</span>
                <span className="text-xs font-semibold text-amber-400">
                  há {daysSinceLastVisit} dias
                </span>
              </>
            )}
          </div>
        </div>

        {/* Alerta Anti-Spam (se contatado recentemente) */}
        {lastContactInfo && lastContactInfo.isRecent && (
          <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300">
              <span className="font-semibold block">Atenção ao envio repetitivo:</span>
              <span>
                Este cliente já foi contatado via WhatsApp há {lastContactInfo.diffDays}{' '}
                {lastContactInfo.diffDays === 1 ? 'dia' : 'dias'} (em{' '}
                {lastContactInfo.formattedDate}).
              </span>
            </div>
          </div>
        )}

        {/* Corpo com Seletores e Editor */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Seletor de Tons */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Estilo da Abordagem:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {toneOptions.map((tone) => {
                const IconComponent = tone.icon;
                const isSelected = selectedToneId === tone.id;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => handleToneSelect(tone.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{tone.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Textarea de Edição Livre */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Texto do WhatsApp:
              </label>
              <button
                type="button"
                onClick={() => setMessage(generateMessage(selectedToneId))}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                Restaurar padrão
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Ao enviar ou copiar, atualizamos o histórico para evitar mensagens repetitivas.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyMessage}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700/60"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copiado e Registrado!</span>
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
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Abrir no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
