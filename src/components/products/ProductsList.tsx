'use client';

import { useState } from 'react';
import { Plus, Scissors, Package, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Product } from '@/types/database';
import { toggleProductActive, deleteProduct } from '@/lib/actions/products';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ProductModal } from './ProductModal';

interface ProductsListProps {
  initialProducts: Product[];
}

export function ProductsList({ initialProducts }: ProductsListProps) {
  const { confirm } = useConfirm();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [modalOpen, setModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleToggle = async (prod: Product) => {
    try {
      setActionLoadingId(prod.id);
      await toggleProductActive(prod.id, !prod.active);
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, active: !p.active } : p))
      );
      toast.success(
        !prod.active
          ? `"${prod.name}" ativado com sucesso!`
          : `"${prod.name}" desativado do catálogo!`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Excluir Item',
      description: `Tem certeza que deseja excluir "${name}" do catálogo?`,
      confirmLabel: 'Excluir Item',
      variant: 'danger',
    });

    if (ok) {
      try {
        setActionLoadingId(id);
        await deleteProduct(id);
        setProducts((prev) => prev.filter((p) => p.id !== id));
        toast.success(`"${name}" excluído com sucesso!`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Topo com Resumo e Botão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
            Catálogo de Serviços & Produtos
          </span>
          <h2 className="text-2xl font-bold text-zinc-100 mt-1">
            {products.filter((p) => p.active).length} itens ativos
          </h2>
        </div>

        <button
          onClick={() => {
            setProductToEdit(null);
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Novo Item
        </button>
      </div>

      {/* Grid de Itens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((prod) => {
          const isService = prod.type === 'service';

          return (
            <div
              key={prod.id}
              className={`p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between space-y-4 hover:border-zinc-700 transition ${
                !prod.active ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-100 shadow-md shrink-0"
                    style={{ backgroundColor: prod.color || '#3b82f6' }}
                  >
                    {isService ? (
                      <Scissors className="w-5 h-5" />
                    ) : (
                      <Package className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-100 text-sm">{prod.name}</h3>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      {isService ? 'Serviço' : 'Produto Físico'}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === prod.id ? null : prod.id)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {activeMenuId === prod.id && (
                    <div className="absolute right-0 top-8 z-20 w-32 bg-zinc-950 border border-zinc-800 rounded-xl py-1 shadow-xl text-xs">
                      <button
                        onClick={() => {
                          setProductToEdit(prod);
                          setModalOpen(true);
                          setActiveMenuId(null);
                        }}
                        className="w-full px-3 py-2 text-left text-zinc-300 hover:bg-zinc-900 flex items-center gap-2"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggle(prod)}
                        className="w-full px-3 py-2 text-left text-zinc-300 hover:bg-zinc-900 flex items-center gap-2"
                      >
                        {prod.active ? 'Pausar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id, prod.name)}
                        disabled={actionLoadingId === prod.id}
                        className="w-full px-3 py-2 text-left text-red-400 hover:bg-zinc-900 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-800/80 pt-3 flex items-baseline justify-between">
                <span className="text-xs text-zinc-400">Preço Padrão</span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatCurrency(Number(prod.default_price))}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <ProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        productToEdit={productToEdit}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}

