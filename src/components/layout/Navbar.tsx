'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wallet,
  CreditCard,
  LayoutDashboard,
  ArrowLeftRight,
  Repeat,
  Scissors,
  Package,
  Users,
} from 'lucide-react';
import { useDateContext } from '@/context/DateContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  userEmail?: string;
}

export function Navbar({ userEmail }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { formattedMonth, nextMonth, prevMonth } = useDateContext();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/vendas', label: 'Atendimentos', icon: Scissors },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/produtos', label: 'Serviços', icon: Package },
    { href: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
    { href: '/cartoes', label: 'Cartões', icon: CreditCard },
    { href: '/contas', label: 'Contas', icon: Wallet },
    { href: '/recorrencias', label: 'Fixas', icon: Repeat },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
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

        {/* Seletor de Mês */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-full px-2 py-1 shadow-sm">
          <button
            onClick={prevMonth}
            className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200 transition"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs sm:text-sm font-medium text-zinc-200 px-2 min-w-[110px] sm:min-w-[130px] text-center select-none capitalize">
            {formattedMonth}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200 transition"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Perfil & Logout */}
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden lg:inline text-xs text-zinc-400 max-w-[160px] truncate" title={userEmail}>
              {userEmail}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition"
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

