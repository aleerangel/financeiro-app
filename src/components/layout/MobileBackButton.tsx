'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Menu } from 'lucide-react';
import { useMobileNavigation } from '@/context/MobileNavigationContext';

const MORE_ROUTES = [
  '/clientes',
  '/produtos',
  '/contas',
  '/cartoes',
  '/recorrencias',
  '/categorias',
];

export function MobileBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { setActiveTab } = useMobileNavigation();

  const isMoreRoute = MORE_ROUTES.some((route) => pathname.startsWith(route));

  if (!isMoreRoute) return null;

  const handleBackToMore = () => {
    setActiveTab('more');
    router.push('/dashboard');
  };

  return (
    <div className="md:hidden mb-4">
      <button
        type="button"
        onClick={handleBackToMore}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:text-white transition active:scale-95 shadow-sm"
      >
        <ArrowLeft className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
        <span>Voltar para o Mais</span>
        <Menu className="w-3.5 h-3.5 text-zinc-500 ml-0.5" />
      </button>
    </div>
  );
}

