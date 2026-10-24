'use client';

import { useState } from 'react';
import { X, Check, Scissors, User, Store } from 'lucide-react';
import { Category, CategoryType, FinancialScope } from '@/types/database';
import { createCategory, updateCategory } from '@/lib/actions/categories';
import { CATEGORY_ICONS_LIST, CategoryIcon } from './CategoryIcon';
import { isBusinessCategory } from '@/lib/business-scope-utils';
import { useBusinessProfile } from '@/context/BusinessProfileContext';

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b', // Slate
  '#eab308', // Yellow
];

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
  onSuccess: (savedCategory: Category) => void;
}

export function CategoryModal({
  isOpen,
  onClose,
  category,
  onSuccess,
}: CategoryModalProps) {
  if (!isOpen) return null;

  return (
    <CategoryModalDialog
      key={category ? category.id : 'new'}
      onClose={onClose}
      category={category}
      onSuccess={onSuccess}
    />
  );
}

function CategoryModalDialog({
  onClose,
  category,
  onSuccess,
}: {
  onClose: () => void;
  category?: Category | null;
  onSuccess: (savedCategory: Category) => void;
}) {
  const isEditing = !!category;
  const { hasBusiness, businessName } = useBusinessProfile();

  const [name, setName] = useState(category?.name || '');
  const [type, setType] = useState<CategoryType>(category?.type || 'expense');
  const [scope, setScope] = useState<FinancialScope>(
    hasBusiness && category && isBusinessCategory(category) ? 'business' : 'personal'
  );
  const [color, setColor] = useState(category?.color || '#10b981');
  const [icon, setIcon] = useState(category?.icon || 'tag');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Informe o nome da categoria.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let saved: Category;
      if (isEditing && category) {
        saved = await updateCategory(category.id, {
          name: name.trim(),
          type,
          color,
          icon,
          scope,
        });
      } else {
        saved = await createCategory({
          name: name.trim(),
          type,
          color,
          icon,
          scope,
        });
      }

      onSuccess(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar categoria.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-950 font-bold"
              style={{ backgroundColor: color }}
            >
              <CategoryIcon name={icon} className="w-4 h-4 text-zinc-950" />
            </div>
            <h3 className="font-bold text-zinc-100 text-lg">
              {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Escopo: Pessoal vs Negócio (Apenas se hasBusiness for true) */}
          {hasBusiness && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Uso da Categoria
              </label>
              <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setScope('personal')}
                  className={`py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                    scope === 'personal'
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Pessoal
                </button>
                <button
                  type="button"
                  onClick={() => setScope('business')}
                  className={`py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 truncate ${
                    scope === 'business'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{businessName}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tipo de Categoria */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Tipo
            </label>
            <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  type === 'expense'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  type === 'income'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Receita
              </button>
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Nome da Categoria *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alimentação, Lazer, Barbearia..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              required
              autoFocus
            />
          </div>

          {/* Seletor de Cores */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Cor
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition hover:scale-110 relative"
                  style={{ backgroundColor: c }}
                >
                  {color.toLowerCase() === c.toLowerCase() && (
                    <Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3]" />
                  )}
                </button>
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-full bg-transparent cursor-pointer border-0 p-0"
                title="Personalizar cor"
              />
            </div>
          </div>

          {/* Seletor de Ícones */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Ícone
            </label>
            <div className="grid grid-cols-7 gap-2 max-h-36 overflow-y-auto p-2 bg-zinc-950 rounded-xl border border-zinc-800">
              {CATEGORY_ICONS_LIST.map((item) => {
                const Icon = item.icon;
                const isSelected = icon === item.name;

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIcon(item.name)}
                    title={item.label}
                    className={`p-2 rounded-lg flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-emerald-500 text-zinc-950 font-bold scale-105'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-zinc-950 transition shadow-lg shadow-emerald-500/10 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Categoria' : 'Criar Categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

