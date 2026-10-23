'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Plus,
  PieChart,
  Menu,
} from 'lucide-react';
import { useMobileNavigation, MobileTab } from '@/context/MobileNavigationContext';

const MORE_ROUTES = [
  '/clientes',
  '/produtos',
  '/contas',
  '/cartoes',
  '/recorrencias',
  '/categorias',
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeTab, setActiveTab, setQuickActionOpen } = useMobileNavigation();

  const handleTabClick = (tab: MobileTab) => {
    setActiveTab(tab);
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
    }
  };

  const isMoreRoute = MORE_ROUTES.some((route) => pathname.startsWith(route));
  const isStatementRoute = pathname.startsWith('/transacoes');

  // Determina a aba ativa real considerando se estamos em uma rota de módulo
  const effectiveTab: MobileTab = isMoreRoute
    ? 'more'
    : isStatementRoute
    ? 'statement'
    : pathname === '/dashboard'
    ? activeTab
    : 'home';

  const navItems: { tab: MobileTab; label: string; icon: React.ElementType }[] = [
    { tab: 'home', label: 'Início', icon: LayoutDashboard },
    { tab: 'statement', label: 'Extrato', icon: ArrowLeftRight },
    { tab: 'summary', label: 'Resumo', icon: PieChart },
    { tab: 'more', label: 'Mais', icon: Menu },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 px-3 py-1.5 pb-safe">
      <div className="flex items-center justify-around relative">
        {/* Item 1: Início */}
        {(() => {
          const item = navItems[0];
          const Icon = item.icon;
          const isActive = effectiveTab === item.tab;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => handleTabClick(item.tab)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition active:scale-95 ${
                isActive ? 'text-emerald-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })()}

        {/* Item 2: Extrato */}
        {(() => {
          const item = navItems[1];
          const Icon = item.icon;
          const isActive = effectiveTab === item.tab;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => handleTabClick(item.tab)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition active:scale-95 ${
                isActive ? 'text-emerald-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })()}

        {/* Item Central: Botão Adicionar (+) */}
        <div className="relative -top-3">
          <button
            type="button"
            onClick={() => setQuickActionOpen(true)}
            className="w-13 h-13 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 border-4 border-zinc-950 active:scale-90 transition-transform"
            aria-label="Adicionar movimentação ou atendimento"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Item 3: Resumo */}
        {(() => {
          const item = navItems[2];
          const Icon = item.icon;
          const isActive = effectiveTab === item.tab;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => handleTabClick(item.tab)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition active:scale-95 ${
                isActive ? 'text-emerald-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })()}

        {/* Item 4: Mais */}
        {(() => {
          const item = navItems[3];
          const Icon = item.icon;
          const isActive = effectiveTab === item.tab;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => handleTabClick(item.tab)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition active:scale-95 ${
                isActive ? 'text-emerald-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })()}
      </div>
    </nav>
  );
}
