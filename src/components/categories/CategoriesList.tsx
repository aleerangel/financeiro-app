'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Tags,
  Plus,
  Search,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Category } from '@/types/database';
import { deleteCategory } from '@/lib/actions/categories';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { CategoryIcon } from './CategoryIcon';
import { isBusinessCategory } from '@/lib/business-scope-utils';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { SegmentIcon } from '@/components/ui/SegmentIcon';

const CategoryModal = dynamic(
  () => import('./CategoryModal').then((m) => m.CategoryModal),
  { ssr: false }
);

interface CategoriesListProps {
  initialCategories: Category[];
}

export function CategoriesList({ initialCategories }: CategoriesListProps) {
  const { profile, businessName } = useBusinessProfile();
  const { confirm } = useConfirm();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const expenseCount = categories.filter((c) => c.type === 'expense').length;
  const incomeCount = categories.filter((c) => c.type === 'income').length;

  const filteredCategories = categories.filter((c) => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (searchTerm.trim()) {
      return c.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const handleEdit = (category: Category) => {
    setCategoryToEdit(category);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Excluir Categoria',
      description: `Tem certeza que deseja excluir a categoria "${name}"? As transações vinculadas continuarão no histórico, mas sem categoria.`,
      confirmLabel: 'Excluir Categoria',
      variant: 'danger',
    });

    if (ok) {
      try {
        setDeletingId(id);
        await deleteCategory(id);
        setCategories((prev) => prev.filter((c) => c.id !== id));
        toast.success(`Categoria "${name}" excluída com sucesso!`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao excluir categoria.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleSuccess = (saved: Category) => {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      if (exists) {
        return prev.map((c) => (c.id === saved.id ? saved : c));
      }
      return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  return (
    <div className="space-y-6">
      {/* Resumo no Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wider block">
              Total de Categorias
            </span>
            <span className="text-2xl font-bold text-[#F8FAFC] mt-1 block tabular-nums">
              {categories.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FACC15]/10 border border-[#FACC15]/20 flex items-center justify-center text-[#FACC15]">
            <Tags className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wider block">
              Categorias de Despesa
            </span>
            <span className="text-2xl font-bold text-rose-400 mt-1 block tabular-nums">
              {expenseCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wider block">
              Categorias de Receita
            </span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block tabular-nums">
              {incomeCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Busca e Novo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar categoria..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0D121F] border border-[#1E293B] rounded-xl text-xs sm:text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#FACC15]/50 transition"
            />
          </div>

          <div className="flex bg-[#0D121F] border border-[#1E293B] p-1 rounded-xl text-xs shrink-0">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                typeFilter === 'all'
                  ? 'bg-[#151D30] text-[#F8FAFC] border border-[#1E293B] shadow'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                typeFilter === 'expense'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Despesas
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                typeFilter === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Receitas
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setCategoryToEdit(null);
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#FACC15] hover:bg-[#FDE047] active:bg-[#EAB308] text-[#080B11] font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-[#FACC15]/20"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Nova Categoria
        </button>
      </div>

      {/* Grid de Categorias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => {
          const isExpense = category.type === 'expense';

          return (
            <div
              key={category.id}
              className="p-4 bg-[#0D121F] border border-[#1E293B] rounded-2xl flex items-center justify-between gap-3 hover:border-[#FACC15]/40 transition group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                  style={{ backgroundColor: category.color || (isExpense ? '#ef4444' : '#10b981') }}
                >
                  <CategoryIcon name={category.icon} className="w-5 h-5 text-zinc-950 font-bold" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-[#F8FAFC] truncate">
                    {category.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        isExpense
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isExpense ? 'Despesa' : 'Receita'}
                    </span>
                    {isBusinessCategory(category) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FACC15]/15 text-[#FDE047] border border-[#FACC15]/30">
                        <SegmentIcon segment={profile.segment} className="w-2.5 h-2.5" />
                        {businessName || 'Negócio'}
                      </span>
                    )}
                    {category.is_default && (
                      <span className="text-[10px] text-[#64748B] font-medium">
                        Padrão
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleEdit(category)}
                  className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151D30] rounded-xl transition"
                  title="Editar categoria"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(category.id, category.name)}
                  disabled={deletingId === category.id}
                  className="p-2 text-[#64748B] hover:text-rose-400 hover:bg-[#151D30] rounded-xl transition disabled:opacity-50"
                  title="Excluir categoria"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="p-12 text-center text-[#64748B] bg-[#0D121F] border border-[#1E293B] rounded-2xl">
          <Tags className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma categoria encontrada.</p>
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCategoryToEdit(null);
        }}
        category={categoryToEdit}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

