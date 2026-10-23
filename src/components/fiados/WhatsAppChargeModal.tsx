'use client';

import { useState } from 'react';
import { X, MessageCircle, Send, Copy, Check } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface WhatsAppChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientPhone?: string | null;
  totalDebt: number;
  pendingSalesCount: number;
  mostUrgentDueDate?: string | null;
  isOverdue: boolean;
}

function buildDefaultChargeMessage({
  clientName,
  totalDebt,
  pendingSalesCount,
  mostUrgentDueDate,
  isOverdue,
}: {
  clientName: string;
  totalDebt: number;
  pendingSalesCount: number;
  mostUrgentDueDate?: string | null;
  isOverdue: boolean;
}) {
  const firstName = clientName.trim().split(' ')[0];
  const formattedValue = formatCurrency(totalDebt);
  const signature = '\n\n_Mensagem enviada via BarberFin_';

  if (isOverdue && mostUrgentDueDate) {
    return `Fala ${firstName}, tudo bem? Passando só pra te lembrar do saldo pendente de ${formattedValue} na barbearia (venceu em ${formatDate(
      mostUrgentDueDate
    )}). Quando puder dar uma olhada ou enviar o comprovante via Pix, agradeço muito! Valeu irmão! 💈${signature}`;
  } else if (mostUrgentDueDate) {
    return `Fala ${firstName}, tudo certo? Só lembrando do acerto de ${formattedValue} referente ao seu atendimento na barbearia, combinado para ${formatDate(
      mostUrgentDueDate
    )}. Qualquer dúvida estou à disposição! Abraço! 💈${signature}`;
  } else {
    return `Fala ${firstName}, tudo na paz? Passando para atualizar o seu saldo na barbearia: consta um valor em aberto de ${formattedValue}${
      pendingSalesCount > 1 ? ` (${pendingSalesCount} atendimentos)` : ''
    }. Se quiser acertar ou enviar um Pix, me avisa por aqui. Tmj! 💈${signature}`;
  }
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
}: ContentProps) {
  const defaultText = buildDefaultChargeMessage({
    clientName,
    totalDebt,
    pendingSalesCount,
    mostUrgentDueDate,
    isOverdue,
  });

  const [message, setMessage] = useState(defaultText);
  const [copied, setCopied] = useState(false);

  const cleanPhone = (clientPhone || '').replace(/\D/g, '');
  const hasValidPhone = cleanPhone.length >= 10;
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const handleOpenWhatsApp = () => {
    if (!hasValidPhone) {
      toast.error('Este cliente não possui um número de telefone ou WhatsApp cadastrado.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cobrar no WhatsApp</h2>
              <p className="text-xs text-slate-400">
                Revise ou personalize a mensagem antes de disparar
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
            <span className="text-xs text-slate-400 block">Saldo em Aberto</span>
            <span className="text-base font-bold text-amber-400">
              {formatCurrency(totalDebt)}
            </span>
          </div>
        </div>

        {/* Editor da Mensagem */}
        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Mensagem personalizada:
            </label>
            <button
              onClick={() => setMessage(defaultText)}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Restaurar padrão
            </button>
          </div>

          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono leading-relaxed"
              placeholder="Digite o texto da cobrança..."
            />
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs text-slate-400 space-y-1">
            <p className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span>✓</span> Assinatura do sistema incluída:{' '}
              <span className="font-mono text-slate-300">_Mensagem enviada via BarberFin_</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Você pode alterar qualquer palavra acima antes de clicar para enviar.
            </p>
          </div>
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
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
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

export function WhatsAppChargeModal(props: WhatsAppChargeModalProps) {
  if (!props.isOpen) return null;

  return (
    <WhatsAppChargeContent
      key={`${props.clientName}-${props.totalDebt}-${props.pendingSalesCount}`}
      {...props}
    />
  );
}
