'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  Repeat,
  Tags,
  Scissors,
  Receipt,
  Users,
  Crown,
  Package,
  Sparkles,
  Briefcase,
  ShoppingBag,
  UtensilsCrossed,
  Store,
  Wrench,
  Activity,
  GraduationCap,
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { getSegmentIcon } from '@/components/ui/SegmentIcon';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function AppSidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const { profile, businessName, salesLabel, hasBusiness } = useBusinessProfile();

  const SalesIcon = getSegmentIcon(profile.segment);

  const navGroups: NavGroup[] = [
    {
      title: 'Visão Geral',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Finanças',
      items: [
        { href: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
        { href: '/contas', label: 'Contas', icon: Wallet },
        { href: '/cartoes', label: 'Cartões', icon: CreditCard },
        { href: '/recorrencias', label: 'Recorrências', icon: Repeat },
        { href: '/categorias', label: 'Categorias', icon: Tags },
      ],
    },
  ];

  if (hasBusiness) {
    navGroups.push({
      title: businessName,
      items: [
        { href: '/vendas', label: salesLabel, icon: SalesIcon },
        { href: '/fiados', label: 'Fiados & Cobrança', icon: Receipt },
        { href: '/clientes', label: 'Clientes & CRM', icon: Users },
        { href: '/mensalidades', label: 'Planos & Mensalidades', icon: Crown },
        { href: '/produtos', label: 'Serviços & Catálogo', icon: Package },
      ],
    });
  }

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-zinc-950 border-r border-zinc-800/80 transition-all duration-200 z-40 select-none ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
      aria-label="Navegação Principal"
    >
      {/* 1. Topo: Logo & Identidade Canário */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/80 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-90"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0 shadow-sm shadow-amber-500/5">
            <span className="text-base tracking-tighter" role="img" aria-label="Canário">
              🐤
            </span>
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-base text-zinc-100 tracking-tight leading-tight flex items-center gap-1.5 truncate">
                Canário
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  PRO
                </span>
              </span>
              <span className="text-[11px] text-zinc-400 truncate">
                {hasBusiness ? businessName : 'Finanças Pessoais'}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* 2. Menu de Navegação com Grupos */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2 truncate">
                {group.title}
              </h4>
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 shadow-sm shadow-emerald-500/5'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-transform ${
                        isActive
                          ? 'text-emerald-400'
                          : 'text-zinc-400 group-hover:text-zinc-200 group-hover:scale-105'
                      }`}
                    />

                    {!collapsed && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}

                    {/* Tooltip flutuante no modo colapsado */}
                    {collapsed && (
                      <div className="absolute left-full ml-3.5 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Modo Apenas Finanças Pessoais: Atalho para ativar Meu Negócio */}
        {!hasBusiness && !collapsed && (
          <div className="pt-2 px-1">
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                <Store className="w-4 h-4" />
                <span>Modo Negócio</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Ative o controle de clientes, vendas e fiados quando desejar gerenciar seu negócio.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
