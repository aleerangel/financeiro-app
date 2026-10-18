'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Product, ProductType } from '@/types/database';
import { createProduct, updateProduct } from '@/lib/actions/products';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSuccess?: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', // Azul
  '#8b5cf6', // Roxo
  '#10b981', // Verde
  '#f59e0b', // Laranja
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#64748b', // Cinza
];

export function ProductModal({
  isOpen,
  onClose,
  productToEdit,
  onSuccess,
}: ProductModalProps) {
  const [name, setName] = useState(productToEdit?.name || '');
  const [type, setType] = useState<ProductType>(productToEdit?.type || 'service');
  const [price, setPrice] = useState(
    productToEdit?.default_price ? String(productToEdit.default_price) : '35'
  );
  const [color, setColor] = useState(productToEdit?.color || '#3b82f6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do serviço ou produto.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const parsedPrice = parseFloat(price.replace(',', '.')) || 0;

      if (productToEdit) {
        await updateProduct(productToEdit.id, {
          name,
          type,
          default_price: parsedPrice,
          color,
        });
      } else {
        await createProduct({
          name,
          type,
          default_price: parsedPrice,
          color,
        });
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-zinc-100 mb-1">
          {productToEdit ? 'Editar Serviço / Produto' : 'Novo Serviço / Produto'}
        </h2>
        <p className="text-xs text-zinc-400 mb-5">
          Cadastre os serviços da sua barbearia (ex: Corte, Barba) ou produtos físicos (ex: Pomada).
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo: Serviço ou Produto */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setType('service')}
              className={`py-2 rounded-xl text-xs font-semibold transition ${
                type === 'service'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ✂️ Serviço
            </button>
            <button
              type="button"
              onClick={() => setType('product')}
              className={`py-2 rounded-xl text-xs font-semibold transition ${
                type === 'product'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🧴 Produto Físico
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nome do Item
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Corte Degrade, Barba Completa, Pomada Matte"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Preço Padrão (R$)
            </label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Cor do Marcador
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'opacity-80 hover:opacity-100'
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
              className="px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-sm rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Salvando...' : productToEdit ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
