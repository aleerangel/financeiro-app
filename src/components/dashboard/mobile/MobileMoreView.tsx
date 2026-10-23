'use client';

import React from 'react';
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
} from 'lucide-react';
import { AccountWithBalance } from '@/lib/actions/accounts';
import { CreditCardWithUsage } from '@/lib/actions/credit-cards';
import { formatCurrency } from '@/lib/utils';
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
  const { showValues } = useMobileNavigation();

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
              return (
                <Link
                  key={iIdx}
                  href={item.href}
                  className="p-3.5 flex items-center justify-between text-left hover:bg-zinc-800/40 active:bg-zinc-800 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${item.iconColor}`}
                    >
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-100 block">
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
                        {item.description}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Card de Informações do Sistema */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Sistema Financeiro & Barbearia • V2.0 Mobile</span>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </form>
      </div>
    </div>
  );
}
