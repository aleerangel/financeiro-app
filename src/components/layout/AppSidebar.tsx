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
  LogOut,
  Loader2,
} from 'lucide-react';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { getSegmentIcon } from '@/components/ui/SegmentIcon';
import { CanaryIcon } from '@/components/ui/CanaryLogo';
import { createClient } from '@/lib/supabase/client';
import { signOutServerAction } from '@/lib/actions/auth';
import { clearAppClientStorage } from '@/lib/auth-storage';

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

interface AppSidebarProps {
  userEmail?: string;
}

function getUserDisplayName(email?: string): string {
  if (!email) return 'Usuário';
  const prefix = email.split('@')[0];
  const cleaned = prefix.split(/[._-]/)[0];
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const { profile, businessName, salesLabel, hasBusiness, refreshProfile } = useBusinessProfile();
  const [businessSettingsOpen, setBusinessSettingsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const SalesIcon = getSegmentIcon(profile.segment);
  const userName = getUserDisplayName(userEmail);
  const userInitial = (userEmail || 'C').charAt(0).toUpperCase();

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
      className="hidden md:flex flex-col h-screen fixed left-0 top-0 w-[232px] bg-[#080B11] border-r border-[#1E293B] z-40 select-none"
      aria-label="Navegação Principal"
    >
      {/* 1. Logo Canário: ~32px margem superior, ~54px altura visual, símbolo à esquerda e nome Canário à direita */}
      <div className="pt-8 px-5 shrink-0">
        <Link
          href="/dashboard"
          className="h-[54px] flex items-center gap-3 overflow-hidden transition-opacity hover:opacity-90"
          title="Canário PRO"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0F1524] border border-[#1E293B] flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/5">
            <CanaryIcon size="sm" />
          </div>

          <div className="flex flex-col min-w-0">
            <span className="font-bold text-base text-[#F8FAFC] tracking-tight leading-tight flex items-center gap-1.5 truncate">
              Canário
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30">
                PRO
              </span>
            </span>
            <span className="text-[11px] text-[#94A3B8] font-medium truncate">
              {hasBusiness ? businessName : 'Gestão Financeira'}
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Navegação vertical: ~35px abaixo do logo, itens com altura de ~56px */}
      <div className="flex-1 overflow-y-auto px-3 mt-[35px] space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5 truncate">
              {group.title}
            </h4>

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
                    className={`group flex items-center gap-3 px-3.5 h-[56px] rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#FACC15]/10 text-[#FACC15] font-semibold border-l-2 border-[#FACC15] shadow-sm shadow-amber-500/5'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151D30]/60 border-l-2 border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-transform ${
                        isActive
                          ? 'text-[#FACC15]'
                          : 'text-[#94A3B8] group-hover:text-[#F8FAFC] group-hover:scale-105'
                      }`}
                    />
                    <span className="truncate flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Área institucional / promocional do negócio */}
      <div className="px-3 py-2 shrink-0">
        <button
          type="button"
          onClick={() => setBusinessSettingsOpen(true)}
          className={`group flex items-center gap-2.5 w-full p-2.5 rounded-xl text-xs font-medium transition-all ${
            hasBusiness
              ? 'text-zinc-200 hover:text-white hover:bg-[#151D30] border border-[#1E293B] bg-[#0D121F]'
              : 'text-[#FACC15] hover:text-amber-200 bg-[#FACC15]/10 hover:bg-[#FACC15]/15 border border-[#FACC15]/30'
          }`}
          title={hasBusiness ? `Configurações: ${businessName}` : 'Configurar Meu Negócio'}
          aria-label={hasBusiness ? `Configurações do negócio: ${businessName}` : 'Configurar Meu Negócio'}
        >
          <div
            className={`p-1.5 rounded-lg shrink-0 transition-colors ${
              hasBusiness
                ? 'bg-[#FACC15]/10 text-[#FACC15] group-hover:bg-[#FACC15]/20'
                : 'bg-[#FACC15]/20 text-[#FACC15] group-hover:bg-[#FACC15]/30'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
          </div>

          <div className="flex flex-col text-left min-w-0 flex-1">
            <span className="font-bold truncate text-[#F8FAFC]">
              {hasBusiness ? businessName : 'Configurar Negócio'}
            </span>
            <span className="text-[10px] text-[#94A3B8] group-hover:text-zinc-300 truncate">
              {hasBusiness ? 'Preferências' : 'Ativar modo PJ'}
            </span>
          </div>

          <Settings className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#F8FAFC] shrink-0 transition-colors" />
        </button>
      </div>

      {/* 4. Perfil do usuário ancorado no rodapé: separado por divisor horizontal, avatar circular, nome e menu */}
      <div className="mt-auto border-t border-[#1E293B] p-3.5 bg-[#080B11] shrink-0">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-full bg-[#151D30] border border-[#1E293B] text-[#FACC15] font-bold flex items-center justify-center text-xs shrink-0 shadow-sm"
              title={userEmail}
            >
              {userInitial}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#F8FAFC] truncate">
                {userName}
              </span>
              <span className="text-[10px] text-[#94A3B8] truncate" title={userEmail}>
                {userEmail || 'Canário PRO'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-1.5 text-[#64748B] hover:text-rose-400 hover:bg-[#151D30] rounded-lg transition disabled:opacity-50 shrink-0 cursor-pointer"
            title="Sair da conta"
            aria-label="Sair da conta"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
          </button>
        </div>
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
