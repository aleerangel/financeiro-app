'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LogOut,
  Wallet,
  CreditCard,
  LayoutDashboard,
  ArrowLeftRight,
  Repeat,
  Scissors,
  Package,
  Users,
  Tags,
  Receipt,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signOutServerAction } from '@/lib/actions/auth';
import { clearAppClientStorage } from '@/lib/auth-storage';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useState } from 'react';

interface NavbarProps {
  userEmail?: string;
}

export function Navbar({ userEmail }: NavbarProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

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
            // Ignora erros de Cache API
          }
        }
      }
    } finally {
      window.location.replace('/login');
    }
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/vendas', label: 'Atendimentos', icon: Scissors },
    { href: '/fiados', label: 'Fiados', icon: Receipt },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/produtos', label: 'Serviços', icon: Package },
    { href: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
    { href: '/cartoes', label: 'Cartões', icon: CreditCard },
    { href: '/contas', label: 'Contas', icon: Wallet },
    { href: '/recorrencias', label: 'Fixas', icon: Repeat },
    { href: '/categorias', label: 'Categorias', icon: Tags },
  ];

  return (
    <header className="hidden md:block sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Logo e Links Desktop */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-emerald-400 tracking-tight">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              $
            </span>
            <span className="hidden sm:inline text-zinc-100">Finanças</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Perfil & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell userEmail={userEmail} />

          {userEmail && (
            <span
              className="text-[11px] sm:text-xs text-zinc-400 max-w-[100px] sm:max-w-[160px] truncate bg-zinc-900/80 border border-zinc-800/80 px-2 py-1 rounded-md"
              title={`Logado como: ${userEmail}`}
            >
              {userEmail}
            </span>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition disabled:opacity-50"
            title={userEmail ? `Sair de ${userEmail}` : 'Sair da conta'}
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

