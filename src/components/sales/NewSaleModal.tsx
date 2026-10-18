'use client';

import { useState } from 'react';
import { X, Plus, Minus, Trash2, CheckCircle2 } from 'lucide-react';
import { Product, Account, PaymentMethod } from '@/types/database';
import { createSale, CreateSaleItemInput } from '@/lib/actions/sales';
import { formatCurrency } from '@/lib/utils';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  accounts: Account[];
  onSuccess?: () => void;
}

export function NewSaleModal({
  isOpen,
  onClose,
  products,
  accounts,
  onSuccess,
}: NewSaleModalProps) {
  const [clientName, setClientName] = useState('');
  const [selectedItems, setSelectedItems] = useState<CreateSaleItemInput[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddItem = (product: Product) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: Number(product.default_price),
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string | null | undefined, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CreateSaleItemInput[]
    );
  };

  const handleUpdatePrice = (productId: string | null | undefined, newPriceStr: string) => {
    const val = parseFloat(newPriceStr.replace(',', '.')) || 0;
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, unit_price: val } : item
      )
    );
  };

  const handleRemoveItem = (productId: string | null | undefined) => {
    setSelectedItems((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const totalAmount = selectedItems.reduce((acc, item) => {
    return acc + Number(item.quantity) * Number(item.unit_price);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setError('Informe o nome do cliente.');
      return;
    }
    if (selectedItems.length === 0) {
      setError('Selecione pelo menos um serviço ou produto.');
      return;
    }
    if (!accountId) {
      setError('Selecione a conta bancária para recebimento.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await createSale({
        client_name: clientName,
        payment_method: paymentMethod,
        account_id: accountId,
        items: selectedItems,
        notes: notes.trim() || undefined,
      });

      // Reset
      setClientName('');
      setSelectedItems([]);
      setNotes('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar atendimento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-extrabold text-zinc-100 mb-1">
          Novo Atendimento
        </h2>
        <p className="text-xs text-zinc-400 mb-5">
          Comanda rápida: toque nos serviços prestados, informe o cliente e finalize.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome do Cliente */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
              Nome do Cliente
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: João, Lucas, Marcos..."
              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition font-medium"
              required
              autoFocus
            />
          </div>

          {/* Grade de Serviços Rápidos (Toque para adicionar) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wider">
              Serviços & Produtos (Toque para adicionar)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {products.map((p) => {
                const isSelected = selectedItems.some((item) => item.product_id === p.id);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddItem(p)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between h-20 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-zinc-950 border-zinc-800/90 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="font-bold text-xs truncate block">{p.name}</span>
                    <span className="font-extrabold text-sm text-zinc-100 block">
                      {formatCurrency(Number(p.default_price))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Itens Adicionados na Comanda */}
          {selectedItems.length > 0 && (
            <div className="space-y-2 p-4 bg-zinc-950/80 border border-zinc-800/90 rounded-2xl">
              <span className="text-xs font-semibold text-zinc-400 block mb-2 uppercase tracking-wider">
                Itens na Comanda
              </span>

              <div className="divide-y divide-zinc-800/60">
                {selectedItems.map((item) => (
                  <div key={item.product_id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-zinc-100 block truncate">
                        {item.product_name}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                        <span>Valor un: R$</span>
                        <input
                          type="text"
                          value={item.unit_price}
                          onChange={(e) => handleUpdatePrice(item.product_id, e.target.value)}
                          className="w-16 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 text-center font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product_id, -1)}
                          className="p-1 hover:text-zinc-100 text-zinc-400"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-extrabold text-zinc-100 px-1">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product_id, 1)}
                          className="p-1 hover:text-zinc-100 text-zinc-400"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-emerald-400 min-w-[70px] text-right">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.product_id)}
                        className="p-1 text-zinc-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forma de Pagamento e Conta de Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="pix">Pix</option>
                <option value="cash">Dinheiro em Espécie</option>
                <option value="debit">Cartão de Débito</option>
                <option value="credit">Cartão de Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Conta de Entrada
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botão Finalizar Atendimento em Destaque */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || selectedItems.length === 0}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-extrabold text-base rounded-2xl transition shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              {loading
                ? 'Registrando...'
                : `Finalizar Atendimento • ${formatCurrency(totalAmount)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
