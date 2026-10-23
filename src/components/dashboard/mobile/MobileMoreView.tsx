'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Package,
  Wallet,
  CreditCard,
  Repeat,
  Tag,
  ChevronRight,
  ShieldCheck,
  LogOut,
  Loader2,
  Receipt,
  ArrowLeftRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signOutServerAction } from '@/lib/actions/auth';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { CreditCardWithUsage } from '@/lib/actions/credit-cards';
import { formatCurrency } from '@/lib/utils';
import { clearAppClientStorage } from '@/lib/auth-storage';
import { useMobileNavigation } from '@/context/MobileNavigationContext';

interface MobileMoreViewProps {
  accounts: AccountWithBalance[];
  cards: CreditCardWithUsage[];
  clientsReturnCount?: number;
}

export function MobileMoreView({
  accounts,
  cards,
  clientsReturnCount = 0,
}: MobileMoreViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { showValues } = useMobileNavigation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Reseta qualquer estado de carregamento pendente ao mudar de rota
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setNavigatingHref(null);
  }

  // Reseta também ao voltar pelo botão físico ou navegação de histórico (bfcache/popstate)
  useEffect(() => {
    const handleReset = () => setNavigatingHref(null);
    window.addEventListener('pageshow', handleReset);
    window.addEventListener('popstate', handleReset);
    return () => {
      window.removeEventListener('pageshow', handleReset);
      window.removeEventListener('popstate', handleReset);
    };
  }, []);

  // Pré-carrega ativamente todas as rotas em segundo plano no momento em que a aba Mais é aberta
  useEffect(() => {
    router.prefetch('/transacoes');
    router.prefetch('/fiados');
    router.prefetch('/clientes');
    router.prefetch('/produtos');
    router.prefetch('/contas');
    router.prefetch('/cartoes');
    router.prefetch('/recorrencias');
    router.prefetch('/categorias');
  }, [router]);

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

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + Number(acc.current_balance || 0),
    0
  );

  const formatHidden = (val: string) => (showValues ? val : '••••••');

  const menuSections = [
    {
      title: 'Operação da Barbearia',
      items: [
        {
          title: 'Clientes & Fidelização (CRM)',
          description: 'Histórico de cortes, radar de retorno WhatsApp e VIPs',
          href: '/clientes',
          icon: Users,
          iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          badge: clientsReturnCount > 0 ? `${clientsReturnCount} para retorno` : null,
          badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        },
        {
          title: 'Fiados & Contas a Receber',
          description: 'Vendas a prazo, cobrança no WhatsApp e quitação',
          href: '/fiados',
          icon: Receipt,
          iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        },
        {
          title: 'Produtos & Estoque',
          description: 'Catálogo de serviços, pomadas, minoxidil e controle de estoque',
          href: '/produtos',
          icon: Package,
          iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        },
      ],
    },
    {
      title: 'Gestão Financeira & Meios',
      items: [
        {
          title: 'Lançamentos & Extrato Completo',
          description: 'Visão tabular avançada, busca por texto, filtros e exportação',
          href: '/transacoes',
          icon: ArrowLeftRight,
          iconColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        },
        {
          title: 'Contas Bancárias',
          description: `${accounts.length} contas cadastradas • Saldo: ${formatHidden(formatCurrency(totalBalance))}`,
          href: '/contas',
          icon: Wallet,
          iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        },
        {
          title: 'Cartões de Crédito',
          description: `${cards.length} cartões gerenciados • Faturas e limites`,
          href: '/cartoes',
          icon: CreditCard,
          iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        },
        {
          title: 'Contas Fixas & Recorrências',
          description: 'Aluguel, água, energia, internet e assinaturas automáticas',
          href: '/recorrencias',
          icon: Repeat,
          iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        },
        {
          title: 'Categorias',
          description: 'Organização de entradas, saídas e centros de custo',
          href: '/categorias',
          icon: Tag,
          iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        },
      ],
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      {menuSections.map((section, sIdx) => (
        <div key={sIdx} className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block px-1">
            {section.title}
          </span>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/80 overflow-hidden">
            {section.items.map((item, iIdx) => {
              const Icon = item.icon;
              const isNavigating = navigatingHref === item.href;

              return (
                <Link
                  key={iIdx}
                  href={item.href}
                  prefetch={true}
                  onClick={() => {
                    setNavigatingHref(item.href);
                    // Timeout de segurança: limpa o destaque se a navegação for cancelada ou ao retornar
                    setTimeout(() => setNavigatingHref(null), 600);
                  }}
                  className={`p-3.5 flex items-center justify-between text-left transition active:scale-[0.99] ${
                    isNavigating
                      ? 'bg-zinc-800/90 border-l-2 border-emerald-400'
                      : 'hover:bg-zinc-800/40 active:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform ${item.iconColor} ${
                        isNavigating ? 'scale-105' : ''
                      }`}
                    >
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs block ${isNavigating ? 'text-emerald-300' : 'text-zinc-100'}`}>
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">
                        {isNavigating ? 'Abrindo...' : item.description}
                      </span>
                    </div>
                  </div>

                  {isNavigating ? (
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0 ml-2" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0 ml-2" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Card de Informações do Sistema e Logout */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">Finanças & Barbearia • V2.0</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold text-xs transition active:scale-95 disabled:opacity-50 shrink-0"
        >
          {loggingOut ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LogOut className="w-3.5 h-3.5" />
          )}
          <span>{loggingOut ? 'Saindo...' : 'Sair da conta'}</span>
        </button>
      </div>
    </div>
  );
}
