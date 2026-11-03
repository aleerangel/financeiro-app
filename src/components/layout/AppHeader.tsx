'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  LogOut,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useMobileNavigation } from '@/context/MobileNavigationContext';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { QuickActionDropdown } from './QuickActionDropdown';
import { createClient } from '@/lib/supabase/client';
import { signOutServerAction } from '@/lib/actions/auth';
import { clearAppClientStorage } from '@/lib/auth-storage';

interface RouteBreadcrumb {
  section: string;
  label: string;
}

function getBreadcrumb(pathname: string, businessName: string, salesLabel: string): RouteBreadcrumb {
  const routeMap: Record<string, RouteBreadcrumb> = {
    '/dashboard': { section: 'Visão Geral', label: 'Dashboard' },
    '/vendas': { section: businessName, label: `${salesLabel} & Vendas` },
    '/fiados': { section: businessName, label: 'Fiados & Contas a Receber' },
    '/clientes': { section: businessName, label: 'Clientes & CRM' },
    '/mensalidades': { section: businessName, label: 'Clube & Mensalidades' },
    '/produtos': { section: businessName, label: 'Serviços & Catálogo' },
    '/transacoes': { section: 'Finanças', label: 'Transações & Extrato' },
    '/contas': { section: 'Finanças', label: 'Contas Bancárias' },
    '/cartoes': { section: 'Finanças', label: 'Cartões de Crédito' },
    '/recorrencias': { section: 'Finanças', label: 'Recorrências Fixas' },
    '/categorias': { section: 'Finanças', label: 'Categorias' },
  };

  for (const [route, crumb] of Object.entries(routeMap)) {
    if (pathname === route || (route !== '/dashboard' && pathname.startsWith(route))) {
      return crumb;
    }
  }
  return { section: 'Sistema', label: 'Finanças' };
}

interface AppHeaderProps {
  userEmail?: string;
}

export function AppHeader({ userEmail }: AppHeaderProps) {
  const pathname = usePathname();
  const { collapsed, toggleSidebar } = useSidebar();
  const { businessName, salesLabel } = useBusinessProfile();
  const { showValues, setShowValues } = useMobileNavigation();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const breadcrumb = getBreadcrumb(pathname, businessName, salesLabel);

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
      const loginUrl = process.env.NODE_ENV === 'development' ? '/login?manual=true' : '/login';
      window.location.replace(loginUrl);
    }
  };

  return (
    <header className="hidden md:flex sticky top-0 z-30 w-full h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md items-center justify-between px-4 lg:px-6 shrink-0 gap-3">
      {/* Lado Esquerdo: Toggle da Sidebar & Breadcrumbs */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl transition border border-transparent hover:border-zinc-800 shrink-0"
          title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          aria-label="Alternar menu lateral"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-amber-400" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        <div className="h-4 w-px bg-zinc-800 shrink-0" />

        {/* Breadcrumbs com truncate em telas verticais/estreitas */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0">
          <span className="text-zinc-500 font-medium shrink-0">{breadcrumb.section}</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <span className="text-zinc-200 font-semibold truncate max-w-[150px] lg:max-w-none">{breadcrumb.label}</span>
        </nav>
      </div>

      {/* Lado Direito: Notificações, Perfil e Ações Rápidas */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Botão de Privacidade / Ocultar Valores */}
        <button
          type="button"
          onClick={() => setShowValues(!showValues)}
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl transition border border-transparent hover:border-zinc-800 shrink-0"
          title={showValues ? 'Ocultar valores sensíveis' : 'Mostrar valores sensíveis'}
          aria-label={showValues ? 'Ocultar valores' : 'Mostrar valores'}
        >
          {showValues ? (
            <Eye className="w-4 h-4 text-zinc-400" />
          ) : (
            <EyeOff className="w-4 h-4 text-amber-400" />
          )}
        </button>

        <QuickActionDropdown size="sm" />

        <NotificationBell userEmail={userEmail} />

        {userEmail && (
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800 shrink-0">
            <div
              className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0"
              title={`Logado como: ${userEmail}`}
            >
              {userEmail.charAt(0).toUpperCase()}
            </div>
            {/* Oculta texto longo do e-mail em telas verticais/menores que xl para não quebrar a barra */}
            <span
              className="text-xs font-medium text-zinc-300 max-w-[150px] truncate hidden xl:inline"
              title={`Logado como: ${userEmail}`}
            >
              {userEmail}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition disabled:opacity-50 shrink-0"
          title="Sair da conta"
          aria-label="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
