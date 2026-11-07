'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  Repeat,
  Tags,
  Receipt,
  Users,
  Crown,
  Package,
  Store,
  Settings,
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { getSegmentIcon } from '@/components/ui/SegmentIcon';
import { CanaryIcon } from '@/components/ui/CanaryLogo';

const BusinessSettingsModal = dynamic(
  () => import('@/components/settings/BusinessSettingsModal').then((m) => m.BusinessSettingsModal),
  { ssr: false }
);

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
  const { profile, businessName, salesLabel, hasBusiness, refreshProfile } = useBusinessProfile();
  const [businessSettingsOpen, setBusinessSettingsOpen] = useState(false);

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
        { href: '/mensalidades', label: 'Clube & Mensalidades', icon: Crown },
        { href: '/produtos', label: 'Serviços & Catálogo', icon: Package },
      ],
    });
  }

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-[#080B11] border-r border-[#1E293B] transition-all duration-200 z-40 select-none ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
      aria-label="Navegação Principal"
    >
      {/* 1. Topo: Logo & Identidade Canário Oficial */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1E293B] shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-90"
        >
          <div className="w-9 h-9 rounded-xl bg-[#0F1524] border border-[#1E293B] flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/5">
            <CanaryIcon size="sm" />
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-black text-base text-[#F8FAFC] tracking-tight leading-tight flex items-center gap-1.5 truncate">
                Canário
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30">
                  PRO
                </span>
              </span>
              <span className="text-[11px] text-[#94A3B8] font-medium truncate">
                {hasBusiness ? businessName : 'Finanças & Negócio'}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* 2. Menu de Navegação com Grupos */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2 truncate">
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
                        ? 'bg-[#FACC15]/10 text-[#FACC15] font-semibold border border-[#FACC15]/30 shadow-sm shadow-amber-500/5'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#0D121F] border border-transparent'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-transform ${
                        isActive
                          ? 'text-[#FACC15]'
                          : 'text-[#94A3B8] group-hover:text-[#F8FAFC] group-hover:scale-105'
                      }`}
                    />

                    {!collapsed && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}

                    {/* Tooltip flutuante no modo colapsado */}
                    {collapsed && (
                      <div className="absolute left-full ml-3.5 px-2.5 py-1.5 bg-[#0D121F] border border-[#1E293B] text-[#F8FAFC] text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
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

      {/* 3. Rodapé: Configurar Meu Negócio */}
      <div className="p-3 border-t border-[#1E293B] shrink-0 bg-[#080B11]">
        <button
          type="button"
          onClick={() => setBusinessSettingsOpen(true)}
          className={`group relative flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-all ${
            hasBusiness
              ? 'text-zinc-200 hover:text-white hover:bg-[#151D30] border border-[#1E293B] bg-[#0D121F]'
              : 'text-[#FACC15] hover:text-amber-200 bg-[#FACC15]/10 hover:bg-[#FACC15]/15 border border-[#FACC15]/30'
          } ${collapsed ? 'justify-center px-0' : ''}`}
          title={collapsed ? (hasBusiness ? `Configurações: ${businessName}` : 'Configurar Meu Negócio') : undefined}
          aria-label={hasBusiness ? `Configurações do negócio: ${businessName}` : 'Configurar Meu Negócio'}
        >
          <div
            className={`p-1.5 rounded-lg shrink-0 transition-colors ${
              hasBusiness
                ? 'bg-[#FACC15]/10 text-[#FACC15] group-hover:bg-[#FACC15]/20'
                : 'bg-[#FACC15]/20 text-[#FACC15] group-hover:bg-[#FACC15]/30'
            }`}
          >
            <Store className="w-4 h-4" />
          </div>

          {!collapsed && (
            <>
              <div className="flex flex-col text-left min-w-0 flex-1">
                <span className="text-xs font-bold truncate text-[#F8FAFC]">
                  {hasBusiness ? businessName : 'Configurar Meu Negócio'}
                </span>
                <span className="text-[10px] text-[#94A3B8] group-hover:text-zinc-300 truncate font-medium">
                  {hasBusiness ? 'Configurações do negócio' : 'Ativar modo negócio'}
                </span>
              </div>
              <Settings className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#F8FAFC] shrink-0 transition-colors" />
            </>
          )}

          {/* Tooltip flutuante no modo colapsado */}
          {collapsed && (
            <div className="absolute left-full ml-3.5 px-2.5 py-1.5 bg-[#0D121F] border border-[#1E293B] text-[#F8FAFC] text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              {hasBusiness ? `Configurações: ${businessName}` : 'Configurar Meu Negócio'}
            </div>
          )}
        </button>
      </div>

      {businessSettingsOpen && (
        <BusinessSettingsModal
          isOpen={businessSettingsOpen}
          onClose={() => setBusinessSettingsOpen(false)}
          onSaved={refreshProfile}
        />
      )}
    </aside>
  );
}
