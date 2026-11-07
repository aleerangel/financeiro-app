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

  // No dashboard desktop, a tela possui cabeçalho de amplitude total dedicado conforme a referência visual
  if (pathname === '/dashboard') {
    return null;
  }

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
    <header className="hidden md:flex sticky top-0 z-30 w-full h-16 border-b border-[#1E293B] bg-[#080B11]/85 backdrop-blur-md items-center px-4 lg:px-6 shrink-0">
      <div className="w-full max-w-[1680px] mx-auto flex items-center justify-between gap-3 min-w-0">
        {/* Lado Esquerdo: Toggle da Sidebar & Breadcrumbs */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#0D121F] rounded-xl transition border border-transparent hover:border-[#1E293B] shrink-0"
            title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-label="Alternar menu lateral"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-[#FACC15]" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-[#94A3B8]" />
            )}
          </button>

          <div className="h-4 w-px bg-[#1E293B] shrink-0" />

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0">
            <span className="text-[#64748B] font-medium shrink-0">{breadcrumb.section}</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#475569] shrink-0" />
            <span className="text-[#F8FAFC] font-bold truncate max-w-[150px] lg:max-w-none">{breadcrumb.label}</span>
          </nav>
        </div>

        {/* Lado Direito: Notificações, Perfil e Ações Rápidas */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Botão de Privacidade / Ocultar Valores */}
          <button
            type="button"
            onClick={() => setShowValues(!showValues)}
            className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#0D121F] rounded-xl transition border border-transparent hover:border-[#1E293B] shrink-0"
            title={showValues ? 'Ocultar valores sensíveis' : 'Mostrar valores sensíveis'}
            aria-label={showValues ? 'Ocultar valores' : 'Mostrar valores'}
          >
            {showValues ? (
              <Eye className="w-4 h-4 text-[#94A3B8]" />
            ) : (
              <EyeOff className="w-4 h-4 text-[#FACC15]" />
            )}
          </button>

          <QuickActionDropdown size="sm" />

          <NotificationBell userEmail={userEmail} />

          {userEmail && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#1E293B] shrink-0">
              <div
                className="w-7 h-7 rounded-lg bg-[#0F1524] border border-[#1E293B] text-[#FACC15] font-bold flex items-center justify-center text-xs shrink-0 shadow-sm"
                title={`Logado como: ${userEmail}`}
              >
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span
                className="text-xs font-semibold text-[#94A3B8] max-w-[150px] truncate hidden xl:inline"
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
            className="p-2 text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition disabled:opacity-50 shrink-0"
            title="Sair da conta"
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
