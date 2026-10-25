'use client';

import { useState, useRef, useEffect } from 'react';
import { Tag, ChevronDown, Check, X } from 'lucide-react';
import { Category } from '@/types/database';

export interface ActiveCategoryItem extends Category {
  count: number;
}

export interface ActiveCategoriesData {
  incomeCategories: ActiveCategoryItem[];
  expenseCategories: ActiveCategoryItem[];
  uncategorizedCount: number;
  totalCount: number;
}

interface CategorySelectDropdownProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  activeCategories: ActiveCategoriesData;
}

export function CategorySelectDropdown({
  categories,
  selectedCategoryId,
  onSelectCategory,
  activeCategories,
}: CategorySelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Encontra a categoria selecionada para o label do gatilho
  const selectedCategory =
    selectedCategoryId !== 'all' && selectedCategoryId !== 'none'
      ? categories.find((c) => c.id === selectedCategoryId)
      : null;

  return (
    <div className="relative inline-block w-full sm:w-auto" ref={dropdownRef}>
      {/* Botão Gatilho (Trigger) sem badges externos */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full sm:min-w-[220px] max-w-full flex items-center justify-between gap-2.5 px-3 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 active:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-200 transition shadow-sm cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left truncate">
          {selectedCategoryId === 'all' && (
            <>
              <Tag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">Todas as Categorias</span>
            </>
          )}

          {selectedCategoryId === 'none' && (
            <>
              <span className="w-2 h-2 rounded-full bg-zinc-500 shrink-0" />
              <span className="truncate italic text-zinc-300">Sem Categoria</span>
            </>
          )}

          {selectedCategory && (
            <>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: selectedCategory.color || '#a1a1aa' }}
              />
              <span className="truncate text-zinc-100 font-bold">
                {selectedCategory.name}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-zinc-400">
          {selectedCategoryId !== 'all' && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCategory('all');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onSelectCategory('all');
                }
              }}
              className="p-0.5 rounded-md hover:bg-zinc-800 hover:text-zinc-200 text-zinc-400 transition"
              title="Limpar filtro de categoria"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Customizado com Cores Reais e Contadores Internos */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 mt-1.5 w-full sm:w-72 max-h-72 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-40 focus:outline-none divide-y divide-zinc-800/60 custom-scrollbar animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Opção Geral: Todas as Categorias */}
          <div className="pb-1">
            <button
              type="button"
              role="option"
              aria-selected={selectedCategoryId === 'all'}
              onClick={() => {
                onSelectCategory('all');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-emerald-500/15 text-emerald-300 font-bold'
                  : 'text-zinc-200 hover:bg-zinc-800/70'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">Todas as Categorias</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full font-medium">
                  {activeCategories.totalCount}
                </span>
                {selectedCategoryId === 'all' && (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
            </button>
          </div>

          {/* Grupo de Receitas */}
          {activeCategories.incomeCategories.length > 0 && (
            <div className="py-1">
              <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold text-emerald-400/90 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Receitas do Mês ({activeCategories.incomeCategories.length})
              </div>
              <div className="space-y-0.5">
                {activeCategories.incomeCategories.map((c) => {
                  const isSelected = selectedCategoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onSelectCategory(c.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/15 text-emerald-300 font-bold'
                          : 'text-zinc-200 hover:bg-zinc-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.color || '#10b981' }}
                        />
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full font-medium">
                          {c.count}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grupo de Despesas */}
          {activeCategories.expenseCategories.length > 0 && (
            <div className="py-1">
              <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold text-rose-400/90 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Despesas do Mês ({activeCategories.expenseCategories.length})
              </div>
              <div className="space-y-0.5">
                {activeCategories.expenseCategories.map((c) => {
                  const isSelected = selectedCategoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onSelectCategory(c.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-rose-500/15 text-rose-300 font-bold'
                          : 'text-zinc-200 hover:bg-zinc-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.color || '#f43f5e' }}
                        />
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full font-medium">
                          {c.count}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-rose-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sem Categoria */}
          {activeCategories.uncategorizedCount > 0 && (
            <div className="pt-1">
              <button
                type="button"
                role="option"
                aria-selected={selectedCategoryId === 'none'}
                onClick={() => {
                  onSelectCategory('none');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                  selectedCategoryId === 'none'
                    ? 'bg-zinc-800 text-zinc-100 font-bold'
                    : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
                  <span className="truncate italic">Sem Categoria</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full font-medium">
                    {activeCategories.uncategorizedCount}
                  </span>
                  {selectedCategoryId === 'none' && (
                    <Check className="w-3.5 h-3.5 text-zinc-300" />
                  )}
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
