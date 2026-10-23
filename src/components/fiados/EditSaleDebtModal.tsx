'use client';

import { useState } from 'react';
import { X, Calendar, Save } from 'lucide-react';
import { Sale } from '@/types/database';
import { updateSaleDebt } from '@/lib/actions/sales';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

interface EditSaleDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSuccess?: () => void;
}

export function EditSaleDebtModal({
  isOpen,
  onClose,
  sale,
  onSuccess,
}: EditSaleDebtModalProps) {
  const [dueDate, setDueDate] = useState(sale?.due_date || '');
  const [notes, setNotes] = useState(sale?.notes || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !sale) return null;

  const addDaysToToday = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateSaleDebt({
        saleId: sale.id,
        dueDate: dueDate || null,
        notes: notes.trim() || null,
      });

      toast.success('Comanda atualizada com sucesso!');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar comanda.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const remaining = Number(sale.remaining_amount ?? sale.total_amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Editar Pendência
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cliente: <strong className="text-zinc-200">{sale.client_name}</strong> •{' '}
              {formatDateTime(sale.sale_date)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Débito */}
        <div className="px-5 py-3 bg-zinc-950/60 border-b border-zinc-800/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              Saldo Restante Desta Comanda
            </span>
            <span className="text-lg font-black text-rose-400">
              {formatCurrency(remaining)}
            </span>
          </div>

          <span className="text-xs text-zinc-400">
            Total original: <strong>{formatCurrency(Number(sale.total_amount))}</strong>
          </span>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Data de Vencimento */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Data de Vencimento
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDueDate(addDaysToToday(7))}
                  className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 transition"
                >
                  +7d
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(addDaysToToday(15))}
                  className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 transition"
                >
                  +15d
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(addDaysToToday(30))}
                  className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 transition"
                >
                  +30d
                </button>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate('')}
                    className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] text-rose-400 transition"
                  >
                    Sem data
                  </button>
                )}
              </div>
            </div>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Observação */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Observação da Comanda
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Combinou de pagar junto com a próxima barba"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition resize-none placeholder:text-zinc-600"
            />
          </div>

          {/* Botões */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs sm:text-sm rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
