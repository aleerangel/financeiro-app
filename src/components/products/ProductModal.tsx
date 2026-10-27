'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Package } from 'lucide-react';
import { Product, ProductType } from '@/types/database';
import { createProduct, updateProduct, ServiceProductInput } from '@/lib/actions/products';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { getSegmentEmoji } from '@/components/ui/SegmentIcon';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  availableProducts?: Product[];
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
  availableProducts = [],
  onSuccess,
}: ProductModalProps) {
  if (!isOpen) return null;

  return (
    <ProductModalDialog
      key={productToEdit?.id || 'new'}
      onClose={onClose}
      productToEdit={productToEdit}
      availableProducts={availableProducts}
      onSuccess={onSuccess}
    />
  );
}

type ProductModalDialogProps = Omit<ProductModalProps, 'isOpen'>;

function ProductModalDialog({
  onClose,
  productToEdit,
  availableProducts = [],
  onSuccess,
}: ProductModalDialogProps) {
  const { profile } = useBusinessProfile();
  const [name, setName] = useState(productToEdit?.name || '');
  const [type, setType] = useState<ProductType>(productToEdit?.type || 'service');
  const [price, setPrice] = useState(
    productToEdit?.default_price !== undefined ? String(productToEdit.default_price) : '35'
  );
  const [costPrice, setCostPrice] = useState(
    productToEdit?.cost_price !== undefined && Number(productToEdit.cost_price) > 0
      ? String(productToEdit.cost_price)
      : ''
  );
  const hasExistingStock =
    Number(productToEdit?.stock_quantity || 0) > 0 || Number(productToEdit?.min_stock || 0) > 0;
  const [stockQuantity, setStockQuantity] = useState(
    hasExistingStock && productToEdit?.stock_quantity !== undefined
      ? String(productToEdit.stock_quantity)
      : ''
  );
  const [minStock, setMinStock] = useState(
    hasExistingStock && Number(productToEdit?.min_stock || 0) > 0
      ? String(productToEdit?.min_stock)
      : ''
  );
  const [serviceProducts, setServiceProducts] = useState<ServiceProductInput[]>(
    (productToEdit?.service_products || []).map((sp) => ({
      product_id: sp.product_id,
      quantity: Number(sp.quantity || 1),
    }))
  );
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedPartQty, setSelectedPartQty] = useState('1');
  const [color, setColor] = useState(productToEdit?.color || '#3b82f6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const physicalCatalog = availableProducts.filter(
    (p) => p.type === 'product' && p.id !== productToEdit?.id
  );

  const handleAddServicePart = () => {
    if (!selectedPartId) return;
    const qty = Math.max(0.01, parseFloat(selectedPartQty.replace(',', '.')) || 1);
    setServiceProducts((prev) => {
      const exists = prev.find((sp) => sp.product_id === selectedPartId);
      if (exists) {
        return prev.map((sp) =>
          sp.product_id === selectedPartId ? { ...sp, quantity: sp.quantity + qty } : sp
        );
      }
      return [...prev, { product_id: selectedPartId, quantity: qty }];
    });
    setSelectedPartId('');
    setSelectedPartQty('1');
  };

  const handleRemoveServicePart = (productId: string) => {
    setServiceProducts((prev) => prev.filter((sp) => sp.product_id !== productId));
  };

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
      const parsedCostPrice = costPrice.trim() ? parseFloat(costPrice.replace(',', '.')) || 0 : 0;
      const parsedStock =
        stockQuantity.trim() !== '' ? parseFloat(stockQuantity.replace(',', '.')) : null;
      const parsedMinStock =
        minStock.trim() !== '' ? parseFloat(minStock.replace(',', '.')) : null;

      if (productToEdit) {
        await updateProduct(productToEdit.id, {
          name,
          type,
          default_price: parsedPrice,
          cost_price: type === 'product' ? parsedCostPrice : 0,
          stock_quantity: type === 'product' ? parsedStock : null,
          min_stock: type === 'product' ? parsedMinStock : null,
          service_products: type === 'service' ? serviceProducts : [],
          color,
        });
        toast.success(`"${name}" atualizado com sucesso!`);
      } else {
        await createProduct({
          name,
          type,
          default_price: parsedPrice,
          cost_price: type === 'product' ? parsedCostPrice : 0,
          stock_quantity: type === 'product' ? parsedStock : null,
          min_stock: type === 'product' ? parsedMinStock : null,
          service_products: type === 'service' ? serviceProducts : [],
          color,
        });
        toast.success(`"${name}" adicionado ao catálogo!`);
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar item.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
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
          Cadastre os serviços do seu negócio ou produtos físicos / peças com controle opcional de estoque.
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
              {getSegmentEmoji(profile.segment)} Serviço
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
              📦 Produto Físico
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
              placeholder="Ex: Corte Degrade, Manutenção, Pomada Matte"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              required
            />
          </div>

          <div className={type === 'product' ? 'grid grid-cols-2 gap-3' : ''}>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                {type === 'product' ? 'Preço de Venda (R$)' : 'Preço Padrão (R$)'}
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

            {type === 'product' && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Custo Unitário (R$)
                </label>
                <input
                  type="text"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="Opcional (0,00)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            )}
          </div>

          {/* Controle de Estoque para Produtos Físicos */}
          {type === 'product' && (
            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-400" />
                  Controle de Estoque (Opcional)
                </span>
                <span className="text-[10px] text-zinc-500">Baixa automática nas vendas</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Qtd. em Estoque
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder="Sem controle"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    placeholder="Ex: 5"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Peças / Produtos Inclusos no Serviço */}
          {type === 'service' && physicalCatalog.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
              <div>
                <span className="text-xs font-semibold text-zinc-200 block">
                  Peças / Produtos Inclusos no Serviço (Opcional)
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  Itens vinculados dão baixa no estoque automaticamente ao vender o serviço, sem cobrar valor extra do cliente.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Selecionar produto / peça...</option>
                  {physicalCatalog.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name}
                      {prod.cost_price ? ` (Custo: ${formatCurrency(Number(prod.cost_price))})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={selectedPartQty}
                  onChange={(e) => setSelectedPartQty(e.target.value)}
                  className="w-16 px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 text-center focus:outline-none focus:border-emerald-500"
                  title="Quantidade utilizada"
                />
                <button
                  type="button"
                  onClick={handleAddServicePart}
                  disabled={!selectedPartId}
                  className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-40 transition"
                  title="Vincular peça ao serviço"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {serviceProducts.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {serviceProducts.map((sp) => {
                    const prodObj = physicalCatalog.find((p) => p.id === sp.product_id);
                    return (
                      <div
                        key={sp.product_id}
                        className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800/80 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-zinc-200 truncate block">
                            {sp.quantity}x {prodObj?.name || 'Produto'}
                          </span>
                          {prodObj?.cost_price ? (
                            <span className="text-[10px] text-zinc-500">
                              Custo interno: {formatCurrency(Number(prodObj.cost_price) * sp.quantity)}
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveServicePart(sp.product_id)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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

