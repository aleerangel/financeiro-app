'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowLeftRight, CreditCard, Wallet } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
    { href: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
    { href: '/cartoes', label: 'Cartões', icon: CreditCard },
    { href: '/contas', label: 'Contas', icon: Wallet },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800/80 px-2 py-2">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[11px]">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

