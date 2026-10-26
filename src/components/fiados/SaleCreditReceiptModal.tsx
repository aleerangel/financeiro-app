'use client';

import { useState } from 'react';
import {
  X,
  ArrowLeft,
  Send,
  Copy,
  Check,
  ShoppingBag,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BusinessMessageSettings,
  DEFAULT_TEMPLATES,
  renderWhatsAppTemplate,
} from '@/lib/whatsapp-templates';
import { toast } from 'sonner';

export interface SaleCreditReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientPhone?: string | null;
  totalAmount: number;
  dueDate?: string | null;
  items: { product_name: string; quantity: number; unit_price: number }[];
  messageSettings?: BusinessMessageSettings | null;
}

export function SaleCreditReceiptModal({
  isOpen,
  onClose,
  clientName,
  clientPhone,
  totalAmount,
  dueDate,
  items,
  messageSettings,
}: SaleCreditReceiptModalProps) {
  const [includePix, setIncludePix] = useState(
    messageSettings?.include_pix_default ?? true
  );

  const itemsFormatted = items
    .map(
      (it) =>
        `- ${it.quantity > 1 ? `${it.quantity}x ` : ''}${it.product_name} (${formatCurrency(
          it.unit_price * it.quantity
        )})`
    )
    .join('\n');

  const template =
    messageSettings?.template_sale_credit_receipt ||
    DEFAULT_TEMPLATES.creditReceipt;

  const defaultMessage = renderWhatsAppTemplate(
    template,
    {
      nome: clientName,
      valor: formatCurrency(totalAmount),
      vencimento: dueDate ? formatDate(dueDate) : 'A combinar',
      itens: itemsFormatted,
    },
    includePix,
    {
      key: messageSettings?.pix_key,
      keyType: messageSettings?.pix_key_type,
      holderName: messageSettings?.pix_holder_name,
    }
  );

  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

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
      toast.success('Comprovante copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar automaticamente.');
    }
  };

  const handleTogglePix = (checked: boolean) => {
    setIncludePix(checked);
    setMessage(
      renderWhatsAppTemplate(
        template,
        {
          nome: clientName,
          valor: formatCurrency(totalAmount),
          vencimento: dueDate ? formatDate(dueDate) : 'A combinar',
          itens: itemsFormatted,
        },
        checked,
        {
          key: messageSettings?.pix_key,
          keyType: messageSettings?.pix_key_type,
          holderName: messageSettings?.pix_holder_name,
        }
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-200 hover:text-white bg-slate-800/90 active:bg-slate-700 transition sm:hidden"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-4 h-4 text-slate-200 stroke-[2.5]" />
              <span className="text-xs font-bold">Voltar</span>
            </button>

            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Enviar Recibo de Atendimento
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Formalize o atendimento a prazo pelo WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo Rápido da Venda */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Cliente: <strong className="text-white">{clientName}</strong></span>
            <span className="text-amber-400 font-bold text-sm">{formatCurrency(totalAmount)}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            {dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Vencimento: {formatDate(dueDate)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        </div>

        {/* Editor da Mensagem */}
        <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Toggle Pix */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={includePix}
                onChange={(e) => handleTogglePix(e.target.checked)}
                className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500 bg-slate-900 border-slate-700"
              />
              <span className="font-semibold text-slate-300">
                Incluir Chave Pix no recibo
              </span>
            </label>
            {messageSettings?.pix_key && (
              <span className="text-[11px] font-mono text-emerald-400">
                {messageSettings.pix_key}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Mensagem do WhatsApp:
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono leading-relaxed"
            />
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
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={!hasValidPhone}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
