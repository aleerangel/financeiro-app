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
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { createClient } from '@/lib/supabase/client';
import { signOutServerAction } from '@/lib/actions/auth';
import { clearAppClientStorage } from '@/lib/auth-storage';

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

const NAV_GROUPS: NavGroup[] = [
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
  {
    title: 'Barbearia',
    items: [
      { href: '/vendas', label: 'Atendimentos', icon: Scissors },
      { href: '/fiados', label: 'Fiados & Cobrança', icon: Receipt },
      { href: '/clientes', label: 'Clientes & CRM', icon: Users },
      { href: '/mensalidades', label: 'Clube & Mensalidades', icon: Crown },
      { href: '/produtos', label: 'Serviços & Produtos', icon: Package },
    ],
  },
];

interface AppSidebarProps {
  userEmail?: string;
}

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggleSidebar } = useSidebar();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await Promise.allSettled([
        supabase.auth.signOut(),
        signOutServerAction(),
      ]);

      if (typeof window !== 'undefined') {
        clearAppClientStorage();
        if ('caches' in window) {
          try {
            const keys = await window.caches.keys();
            await Promise.all(keys.map((key) => window.caches.delete(key)));
          } catch {
            // Ignora erro
          }
        }
      }
    } finally {
      window.location.replace('/login');
    }
  };

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'B';

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-zinc-950 border-r border-zinc-800/80 transition-all duration-200 z-40 select-none ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
      aria-label="Navegação Principal"
    >
      {/* 1. Topo: Logo & Identidade */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/80 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-90"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
            <span className="text-base tracking-tighter">💈</span>
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-base text-zinc-100 tracking-tight leading-tight flex items-center gap-1.5 truncate">
                BarberFin
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  PRO
                </span>
              </span>
              <span className="text-[11px] text-zinc-500 truncate">
                Gestão & Finanças
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* 2. Menu de Navegação com Grupos */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
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
      </div>

      {/* 3. Rodapé da Sidebar: Perfil & Toggle */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/50 shrink-0 space-y-2">
        {/* Card do Usuário */}
        <div
          className={`flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/60 border border-zinc-850 ${
            collapsed ? 'justify-center p-1.5' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
            {userInitial}
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-medium text-zinc-200 truncate"
                title={userEmail || 'Usuário'}
              >
                {userEmail || 'Barbeiro'}
              </p>
              <p className="text-[10px] text-zinc-500 truncate">Sessão Ativa</p>
            </div>
          )}

          {!collapsed && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition disabled:opacity-50"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Botão de Recolher / Expandir */}
        <button
          type="button"
          onClick={toggleSidebar}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition ${
            collapsed ? 'justify-center px-0' : 'justify-between'
          }`}
          title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {!collapsed && <span>Recolher Menu</span>}
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
          )}
        </button>
      </div>
    </aside>
  );
}
