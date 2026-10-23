'use client';

import { useState, useRef } from 'react';
import { Plus, CreditCard as CardIcon, Wifi, Calendar, MoreVertical, Pencil, Trash2, Receipt } from 'lucide-react';
import { CreditCardWithUsage, deleteCreditCard } from '@/lib/actions/credit-cards';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { CreditCardModal } from './CreditCardModal';
import { CreditCardInvoicesPanel } from './CreditCardInvoicesPanel';

interface CreditCardsListProps {
  initialCards: CreditCardWithUsage[];
}

export function CreditCardsList({ initialCards }: CreditCardsListProps) {
  const { confirm } = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<CreditCardWithUsage | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const invoicesPanelRef = useRef<HTMLDivElement | null>(null);

  const selectedCard = initialCards.find((c) => c.id === selectedCardId) || null;

  const handleSelectCard = (cardId: string) => {
    setSelectedCardId((prev) => {
      const next = prev === cardId ? null : cardId;
      if (next) {
        setTimeout(() => {
          invoicesPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
      }
      return next;
    });
  };

  const totalLimit = initialCards.reduce((acc, curr) => acc + Number(curr.credit_limit), 0);
  const totalUsed = initialCards.reduce((acc, curr) => acc + curr.used_limit, 0);
  const totalAvailable = Math.max(0, totalLimit - totalUsed);
  const totalCurrentInvoice = initialCards.reduce((acc, curr) => acc + Number(curr.current_invoice || 0), 0);

  const handleEdit = (card: CreditCardWithUsage) => {
    setCardToEdit(card);
    setModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir Cartão',
      description: 'Tem certeza que deseja excluir este cartão de crédito?',
      confirmLabel: 'Excluir Cartão',
      variant: 'danger',
    });

    if (ok) {
      try {
        setDeletingId(id);
        await deleteCreditCard(id);
        toast.success('Cartão excluído com sucesso!');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao excluir cartão');
      } finally {
        setDeletingId(null);
        setActiveMenuId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo Consolidado de Limites e Botão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold">
            Fatura Atual (Total)
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-purple-300 mt-2">
            {formatCurrency(totalCurrentInvoice)}
          </h3>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
            Limite Utilizado
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-amber-300 mt-2">
            {formatCurrency(totalUsed)}
          </h3>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
            Limite Disponível
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-400 mt-2">
            {formatCurrency(totalAvailable)}
          </h3>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
            Limite Total
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 mt-2">
            {formatCurrency(totalLimit)}
          </h3>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            setCardToEdit(null);
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Novo Cartão
        </button>
      </div>

      {/* Grid de Cartões Físicos / Visuais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {initialCards.map((card) => {
          const limitPercentage = card.credit_limit > 0
            ? Math.min(100, Math.round((card.used_limit / card.credit_limit) * 100))
            : 0;
          const isSelected = selectedCard?.id === card.id;

          return (
            <div
              key={card.id}
              onClick={() => handleSelectCard(card.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectCard(card.id);
                }
              }}
              className={`relative p-6 rounded-2xl text-white shadow-xl flex flex-col justify-between h-56 overflow-hidden transition-all cursor-pointer select-none hover:-translate-y-1 ${
                isSelected
                  ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950 scale-[1.01]'
                  : 'opacity-95 hover:opacity-100'
              }`}
              style={{
                backgroundColor: card.color || '#8b5cf6',
                backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.2) 0%, transparent 60%)',
              }}
            >
              {/* Topo do Cartão: Chip, Contactless e Menu */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Ícone de Chip EMV */}
                  <div className="w-8 h-6 rounded bg-amber-300/80 border border-amber-400 flex items-center justify-center opacity-90">
                    <div className="w-6 h-4 border border-amber-600/40 rounded-sm" />
                  </div>
                  <Wifi className="w-4 h-4 rotate-90 text-white/80" />
                  <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/25 backdrop-blur-sm text-[10px] font-semibold text-white/90 border border-white/15">
                    <Receipt className="w-3 h-3" />
                    {isSelected ? 'Faturas abertas abaixo' : 'Ver faturas'}
                  </span>
                </div>

                <div
                  className="relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === card.id ? null : card.id)}
                    className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white/90 transition backdrop-blur-sm"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {activeMenuId === card.id && (
                    <div className="absolute right-0 top-8 z-20 w-32 bg-zinc-950 border border-zinc-800 rounded-xl py-1 shadow-2xl text-xs text-zinc-200">
                      <button
                        onClick={() => handleEdit(card)}
                        className="w-full px-3 py-2 text-left hover:bg-zinc-900 flex items-center gap-2"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(card.id)}
                        disabled={deletingId === card.id}
                        className="w-full px-3 py-2 text-left text-red-400 hover:bg-zinc-900 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingId === card.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Centro: Nome do Cartão e Datas */}
              <div>
                <h4 className="font-extrabold text-lg tracking-wide drop-shadow-sm">
                  {card.name}
                </h4>
                <div className="flex items-center gap-4 text-[11px] text-white/80 mt-1 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Fecha: dia {card.closing_day}
                  </span>
                  <span>Vence: dia {card.due_day}</span>
                </div>
              </div>

              {/* Base: Barra de Limite e Valores */}
              <div className="bg-black/25 backdrop-blur-md -mx-6 -mb-6 p-4 pt-3 rounded-b-2xl border-t border-white/10 space-y-1.5">
                <div className="flex justify-between items-baseline text-xs font-semibold">
                  <span className="text-white/70 text-[10px] uppercase font-bold tracking-wider">Fatura Atual</span>
                  <span className="text-sm font-extrabold text-white drop-shadow-sm">
                    {formatCurrency(card.current_invoice ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-white/80 font-medium">
                  <span>Usado: {formatCurrency(card.used_limit)}</span>
                  <span>Disp: {formatCurrency(card.available_limit)}</span>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      limitPercentage > 85 ? 'bg-red-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${limitPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {initialCards.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl">
            <CardIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Nenhum cartão de crédito cadastrado.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Clique em &quot;Novo Cartão&quot; para gerenciar limites e faturas.
            </p>
          </div>
        )}
      </div>

      {/* Aba / Painel de Faturas do Cartão Selecionado */}
      {selectedCard && (
        <div ref={invoicesPanelRef}>
          <CreditCardInvoicesPanel
            key={selectedCard.id}
            card={selectedCard}
            onClose={() => setSelectedCardId(null)}
          />
        </div>
      )}

      <CreditCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        cardToEdit={cardToEdit}
      />
    </div>
  );
}
