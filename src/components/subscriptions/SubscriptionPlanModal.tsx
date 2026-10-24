'use client';

import { useState } from 'react';
import { X, Sparkles, Plus, Trash2, Check } from 'lucide-react';
import { SubscriptionPlan } from '@/types/database';
import { saveSubscriptionPlan, deleteSubscriptionPlan } from '@/lib/actions/subscriptions';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface SubscriptionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: SubscriptionPlan[];
  onPlansUpdated: () => void;
}

export function SubscriptionPlanModal({
  isOpen,
  onClose,
  plans,
  onPlansUpdated,
}: SubscriptionPlanModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do plano');
      return;
    }
    const numPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error('Informe um valor válido');
      return;
    }

    try {
      setLoading(true);
      await saveSubscriptionPlan({
        name: name.trim(),
        description: description.trim() || null,
        price: numPrice,
      });
      toast.success('Plano criado com sucesso!');
      setName('');
      setDescription('');
      setPrice('');
      setIsCreating(false);
      onPlansUpdated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar plano');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteSubscriptionPlan(id);
      toast.success('Plano removido com sucesso!');
      onPlansUpdated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover plano');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Planos do Clube</h2>
            <p className="text-xs text-zinc-400">
              Configure os pacotes recorrentes oferecidos aos seus clientes
            </p>
          </div>
        </div>

        {/* Lista de planos existentes */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
          {plans.length === 0 && !isCreating ? (
            <div className="text-center py-8 px-4 rounded-2xl bg-zinc-950/50 border border-dashed border-zinc-800">
              <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-300">Nenhum plano cadastrado</p>
              <p className="text-xs text-zinc-500 mt-1">
                Crie planos como &quot;Clube do Corte Semanal&quot; ou &quot;Cabelo + Barba Mensal&quot;.
              </p>
            </div>
          ) : (
            plans.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">{p.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                      Mensal
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-zinc-400 mt-0.5">{p.description}</p>
                  )}
                  <p className="text-sm font-bold text-emerald-400 mt-1">
                    {formatCurrency(p.price)}
                    <span className="text-xs font-normal text-zinc-500">/mês</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={deletingId === p.id}
                  className="p-2 text-zinc-500 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition disabled:opacity-50"
                  title="Remover plano"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}

          {/* Formulário de criação de novo plano */}
          {isCreating && (
            <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/30 space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Novo Plano
              </h3>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nome do Plano *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Clube do Corte Ilimitado"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Preço Mensal (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="80.00"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Descrição (Opcional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Cortes ilimitados"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  {loading ? 'Salvando...' : 'Salvar Plano'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Ação inferior */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
          {!isCreating && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Criar Novo Plano
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl bg-zinc-800 hover:bg-zinc-700 transition"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
