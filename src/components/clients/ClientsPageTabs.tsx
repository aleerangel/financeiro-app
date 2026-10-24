'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Crown } from 'lucide-react';
import { Account, SubscriptionPlan, ClientSubscription } from '@/types/database';
import { ClientWithStats } from '@/lib/actions/clients';
import { BusinessMessageSettings } from '@/lib/whatsapp-templates';
import { ClientsList } from './ClientsList';
import { SubscriptionsList } from '../subscriptions/SubscriptionsList';

interface ClientsPageTabsProps {
  initialClients: ClientWithStats[];
  initialSubscriptions: ClientSubscription[];
  plans: SubscriptionPlan[];
  accounts: Account[];
  messageSettings: BusinessMessageSettings;
  defaultTab?: 'clients' | 'subscriptions';
}

export function ClientsPageTabs({
  initialClients,
  initialSubscriptions,
  plans,
  accounts,
  messageSettings,
  defaultTab = 'clients',
}: ClientsPageTabsProps) {
  const [activeTab, setActiveTab] = useState<'clients' | 'subscriptions'>(defaultTab);
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  const activeSubsCount = initialSubscriptions.filter((s) => s.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Abas Superiores */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-zinc-900 border border-zinc-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === 'clients'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          Carteira & CRM
          <span className="px-1.5 py-0.5 rounded-full bg-zinc-700/60 text-[11px] text-zinc-300 font-normal">
            {initialClients.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === 'subscriptions'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-400" />
          Clube & Mensalidades
          {activeSubsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
              {activeSubsCount}
            </span>
          )}
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === 'clients' ? (
        <ClientsList initialClients={initialClients} accounts={accounts} />
      ) : (
        <SubscriptionsList
          initialSubscriptions={initialSubscriptions}
          clients={initialClients}
          plans={plans}
          accounts={accounts}
          messageSettings={messageSettings}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
