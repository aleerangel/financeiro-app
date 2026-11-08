'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { CreditCardWithUsage, createCreditCard, updateCreditCard } from '@/lib/actions/credit-cards';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { numberToCurrencyInputString, parseCurrencyInputToNumber } from '@/lib/currency-mask';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardToEdit?: CreditCardWithUsage | null;
}

const PRESET_CARD_COLORS = [
  '#8b5cf6', // Roxo (Nubank style)
  '#3b82f6', // Azul
  '#f97316', // Laranja (Inter / Itaú style)
  '#10b981', // Verde
  '#ec4899', // Rosa
  '#18181b', // Preto / Black
  '#eab308', // Dourado / Gold
];

export function CreditCardModal({ isOpen, onClose, cardToEdit }: CreditCardModalProps) {
  const [name, setName] = useState(cardToEdit?.name || '');
  const [creditLimit, setCreditLimit] = useState(() =>
    numberToCurrencyInputString(cardToEdit?.credit_limit ?? 1000)
  );
  const [closingDay, setClosingDay] = useState(cardToEdit?.closing_day || 1);
  const [dueDay, setDueDay] = useState(cardToEdit?.due_day || 10);
  const [color, setColor] = useState(cardToEdit?.color || '#8b5cf6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do cartão.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const parsedLimit = parseCurrencyInputToNumber(creditLimit);

      if (cardToEdit) {
        await updateCreditCard(cardToEdit.id, {
          name,
          credit_limit: parsedLimit,
          closing_day: Number(closingDay),
          due_day: Number(dueDay),
          color,
        });
      } else {
        await createCreditCard({
          name,
          credit_limit: parsedLimit,
          closing_day: Number(closingDay),
          due_day: Number(dueDay),
          color,
        });
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cartão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0D121F] border border-[#1E293B] rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#151D30] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-[#F8FAFC] mb-1">
          {cardToEdit ? 'Editar Cartão' : 'Novo Cartão de Crédito'}
        </h2>
        <p className="text-xs text-[#94A3B8] mb-5">
          Cadastre seu cartão para acompanhar limites, fechamento de fatura e parcelamentos.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              Nome do Cartão
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank Ultravioleta, Itaú Click"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FACC15]/50 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              Limite Total (R$)
            </label>
            <CurrencyInput
              value={creditLimit}
              onChangeValue={(_, formatted) => setCreditLimit(formatted)}
              placeholder="0,00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#FACC15]/50 transition tabular-nums"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Dia de Fechamento
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={(e) => setClosingDay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FACC15]/50 transition tabular-nums"
                required
              />
              <span className="text-[10px] text-[#64748B]">Melhor dia de compra</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Dia de Vencimento
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B11] border border-[#1E293B] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#FACC15]/50 transition tabular-nums"
                required
              />
              <span className="text-[10px] text-[#64748B]">Vencimento da fatura</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-2">
              Cor do Cartão
            </label>
            <div className="flex items-center gap-2">
              {PRESET_CARD_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0D121F]' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151D30] rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#FACC15] hover:bg-[#FDE047] text-[#080B11] font-bold text-sm rounded-xl transition shadow-lg shadow-[#FACC15]/10 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : cardToEdit ? 'Atualizar' : 'Criar Cartão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

