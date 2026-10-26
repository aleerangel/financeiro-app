'use client';

import { useState } from 'react';
import {
  X,
  MessageCircle,
  Send,
  Copy,
  Check,
  Crown,
  QrCode,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  BusinessMessageSettings,
  DEFAULT_TEMPLATES,
  renderWhatsAppTemplate,
} from '@/lib/whatsapp-templates';
import { SubscriptionInvoice } from '@/types/database';
import { toast } from 'sonner';

export interface SubscriptionChargeWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SubscriptionInvoice | null;
  messageSettings?: BusinessMessageSettings | null;
}

export function SubscriptionChargeWhatsAppModal({
  isOpen,
  onClose,
  invoice,
  messageSettings,
}: SubscriptionChargeWhatsAppModalProps) {
  const [includePix, setIncludePix] = useState(
    messageSettings?.include_pix_default ?? true
  );
  const [copied, setCopied] = useState(false);

  if (!isOpen || !invoice) return null;

  const clientName = invoice.client?.name || 'Cliente';
  const clientPhone = invoice.client?.phone || null;
  const planName =
    invoice.subscription?.custom_plan_name ||
    invoice.subscription?.plan?.name ||
    'Plano de Assinatura';

  const dueDateFormatted = new Date(invoice.due_date + 'T12:00:00Z').toLocaleDateString(
    'pt-BR'
  );

  const template =
    messageSettings?.template_subscription_invoice ||
    DEFAULT_TEMPLATES.subscriptionInvoice;

  const message = renderWhatsAppTemplate(
    template,
    {
      nome: clientName,
      valor: formatCurrency(invoice.amount),
      vencimento: dueDateFormatted,
      plano: planName,
    },
    includePix,
    {
      key: messageSettings?.pix_key,
      keyType: messageSettings?.pix_key_type,
      holderName: messageSettings?.pix_holder_name,
    }
  );

  const cleanPhone = clientPhone ? clientPhone.replace(/\D/g, '') : '';
  const fullPhone =
    cleanPhone.length >= 10 && !cleanPhone.startsWith('55')
      ? `55${cleanPhone}`
      : cleanPhone;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Mensagem copiada para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar mensagem.');
    }
  };

  const handleSend = () => {
    if (!cleanPhone) {
      toast.error('Cliente não possui telefone cadastrado.');
      return;
    }
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Lembrete de Mensalidade</h2>
            <p className="text-xs text-zinc-400">
              Dispare cobrança amigável via WhatsApp para o assinante
            </p>
          </div>
        </div>

        {/* Dados do Assinante */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-100">{clientName}</p>
              <p className="text-xs text-zinc-400">
                {planName} • Vence em {dueDateFormatted}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-emerald-400">
              {formatCurrency(invoice.amount)}
            </p>
            {clientPhone ? (
              <p className="text-xs text-zinc-500">{clientPhone}</p>
            ) : (
              <span className="text-[11px] text-amber-400">Sem telefone</span>
            )}
          </div>
        </div>

        {/* Prévia da Mensagem */}
        <div className="flex-1 overflow-y-auto mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Prévia da Mensagem
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includePix}
                onChange={(e) => setIncludePix(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0"
              />
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              Incluir chave Pix
            </label>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans select-text">
            {message}
          </div>

          {!messageSettings?.pix_key && includePix && (
            <p className="text-[11px] text-amber-400/90 mt-2 flex items-center gap-1">
              ⚠️ Nenhuma chave Pix configurada no app. O Pix não aparecerá na mensagem.
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar Texto
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!cleanPhone}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Abrir WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
