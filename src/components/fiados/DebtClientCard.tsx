'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  DollarSign,
  Edit3,
  Trash2,
  Calendar,
  AlertTriangle,
  Clock,
  ShoppingBag,
  Phone,
  HelpCircle,
} from 'lucide-react';
import { Account, Sale } from '@/types/database';
import { ClientDebtItem, deleteSale } from '@/lib/actions/sales';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { WhatsAppChargeModal } from './WhatsAppChargeModal';
import { EditSaleDebtModal } from './EditSaleDebtModal';
import { AmortizeModal } from '../sales/AmortizeModal';

interface DebtClientCardProps {
  clientDebt: ClientDebtItem;
  accounts: Account[];
  onRefresh?: () => void;
}

export function DebtClientCard({
  clientDebt,
  accounts,
  onRefresh,
}: DebtClientCardProps) {
  const { confirm } = useConfirm();
  const [isExpanded, setIsExpanded] = useState(false);

  // Estados dos Modais
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [amortizeModalData, setAmortizeModalData] = useState<{
    isOpen: boolean;
    sale?: Sale | null;
    consolidated?: boolean;
  }>({ isOpen: false });

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Excluir comanda
  const handleDeleteSale = async (sale: Sale) => {
    const confirmed = await confirm({
      title: 'Excluir comanda pendente?',
      description: `Tem certeza que deseja excluir esta comanda de ${formatCurrency(
        sale.total_amount
      )}? Se houver amortizações ou pagamentos parciais, os lançamentos financeiros serão estornados.`,
      confirmLabel: 'Sim, excluir',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsDeletingId(sale.id);
    try {
      await deleteSale(sale.id);
      toast.success('Comanda excluída com sucesso!');
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao excluir comanda.'
      );
    } finally {
      setIsDeletingId(null);
    }
  };

  // Badge de Vencimento do Cliente
  const renderDueBadge = () => {
    if (clientDebt.isOverdue) {
      const days = clientDebt.daysDiff ?? 0;
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <AlertTriangle className="w-3.5 h-3.5" />
          {days > 0 ? `Vencido há ${days} ${days === 1 ? 'dia' : 'dias'}` : 'Vencido'}
        </span>
      );
    }

    if (clientDebt.mostUrgentDueDate) {
      const days = -(clientDebt.daysDiff ?? 0);
      if (days === 0) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Vence hoje
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <Clock className="w-3.5 h-3.5" />
          {`Vence em ${days} ${days === 1 ? 'dia' : 'dias'}`}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
        <HelpCircle className="w-3.5 h-3.5" />
        Sem prazo definido
      </span>
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-200 hover:border-slate-700 shadow-sm">
      {/* Header do Card com Resumo */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Info do Cliente */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 font-bold text-base shadow-inner">
            {clientDebt.clientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white truncate">
                {clientDebt.clientName}
              </h3>
              {renderDueBadge()}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              {clientDebt.clientPhone ? (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {clientDebt.clientPhone}
                </span>
              ) : (
                <span className="text-slate-500 italic">Sem telefone</span>
              )}
              <span>•</span>
              <span className="text-slate-300">
                {clientDebt.pendingSalesCount}{' '}
                {clientDebt.pendingSalesCount === 1 ? 'comanda em aberto' : 'comandas em aberto'}
              </span>
            </div>
          </div>
        </div>

        {/* Valores e Botões Rápidos */}
        <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
          <div className="text-left md:text-right">
            <span className="text-xs text-slate-400 block font-medium">Total Devedor</span>
            <span className="text-lg sm:text-xl font-bold text-amber-400 tracking-tight">
              {formatCurrency(clientDebt.totalDebt)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Cobrar no WhatsApp */}
            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Cobrar via WhatsApp com mensagem personalizada"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Cobrar</span>
            </button>

            {/* Botão Receber Consolidado */}
            <button
              onClick={() =>
                setAmortizeModalData({
                  isOpen: true,
                  consolidated: true,
                })
              }
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span>Receber</span>
            </button>

            {/* Alternar Acordeão */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-colors"
              title={isExpanded ? 'Recolher comandas' : 'Ver comandas detalhadas'}
              aria-label="Expandir detalhes"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Acordeão de Comandas em Aberto */}
      {isExpanded && (
        <div className="border-t border-slate-800 bg-slate-950/40 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            <span>Comandas Pendentes deste Cliente</span>
            <span>{clientDebt.sales.length} no total</span>
          </div>

          <div className="space-y-2.5">
            {clientDebt.sales.map((sale) => {
              const remaining = Number(sale.remaining_amount ?? sale.total_amount ?? 0);
              const total = Number(sale.total_amount || 0);
              const paid = Number(sale.paid_amount || 0);
              const isSaleOverdue =
                sale.due_date &&
                new Date() > new Date(sale.due_date + 'T23:59:59');

              return (
                <div
                  key={sale.id}
                  className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/90 rounded-xl p-3.5 sm:p-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Detalhes da Venda */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-slate-300 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(sale.sale_date)}
                        </span>

                        {sale.due_date ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium ${
                              isSaleOverdue
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {isSaleOverdue ? 'Venceu em: ' : 'Vence em: '}
                            {formatDate(sale.due_date)}
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400">
                            Sem vencimento
                          </span>
                        )}
                      </div>

                      {/* Itens do Atendimento */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                        <ShoppingBag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {sale.items && sale.items.length > 0 ? (
                          sale.items.map((it, idx) => (
                            <span
                              key={it.id || idx}
                              className="bg-slate-800/60 px-2 py-0.5 rounded text-slate-300 text-xs"
                            >
                              {it.quantity > 1 ? `${it.quantity}x ` : ''}
                              {it.product_name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Venda avulsa</span>
                        )}
                      </div>

                      {/* Observações da comanda */}
                      {sale.notes && (
                        <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                          {sale.notes}
                        </p>
                      )}

                      {/* Histórico resumido de amortizações */}
                      {sale.amortizations && sale.amortizations.length > 0 && (
                        <div className="text-[11px] text-emerald-400/90 pt-1 flex flex-wrap gap-2">
                          <span>
                            Já amortizado:{' '}
                            <strong className="text-emerald-400">
                              {formatCurrency(paid)}
                            </strong>{' '}
                            ({sale.amortizations.length}{' '}
                            {sale.amortizations.length === 1 ? 'pagamento' : 'pagamentos'})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Preços e Ações da Comanda */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-slate-400">
                          Total: {formatCurrency(total)}
                        </div>
                        <div className="text-base font-bold text-amber-400">
                          Resta: {formatCurrency(remaining)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Receber Esta Comanda */}
                        <button
                          onClick={() =>
                            setAmortizeModalData({
                              isOpen: true,
                              sale,
                              consolidated: false,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                          title="Amortizar ou quitar esta comanda específica"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Receber</span>
                        </button>

                        {/* Editar Pendência (Prazo e Notas) */}
                        <button
                          onClick={() => setEditingSale(sale)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
                          title="Editar data de vencimento ou observações"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Excluir Comanda */}
                        <button
                          onClick={() => handleDeleteSale(sale)}
                          disabled={isDeletingId === sale.id}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors disabled:opacity-50"
                          title="Excluir ou estornar esta comanda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Cobrança WhatsApp com Assinatura do Sistema e Edição Livre */}
      <WhatsAppChargeModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        clientName={clientDebt.clientName}
        clientPhone={clientDebt.clientPhone}
        totalDebt={clientDebt.totalDebt}
        pendingSalesCount={clientDebt.pendingSalesCount}
        mostUrgentDueDate={clientDebt.mostUrgentDueDate}
        isOverdue={clientDebt.isOverdue}
      />

      {/* Modal de Edição de Vencimento e Anotações da Pendência */}
      <EditSaleDebtModal
        isOpen={Boolean(editingSale)}
        onClose={() => setEditingSale(null)}
        sale={editingSale}
        onSuccess={() => {
          setEditingSale(null);
          onRefresh?.();
        }}
      />

      {/* Modal de Amortização / Recebimento */}
      <AmortizeModal
        isOpen={amortizeModalData.isOpen}
        onClose={() =>
          setAmortizeModalData({ isOpen: false, sale: null, consolidated: false })
        }
        accounts={accounts}
        sale={amortizeModalData.sale || null}
        client={
          amortizeModalData.consolidated
            ? {
                id: clientDebt.clientId,
                name: clientDebt.clientName,
                totalDebt: clientDebt.totalDebt,
              }
            : null
        }
        onSuccess={() => {
          setAmortizeModalData({ isOpen: false, sale: null, consolidated: false });
          onRefresh?.();
        }}
      />
    </div>
  );
}
