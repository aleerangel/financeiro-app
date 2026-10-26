'use client';

import { useRouter } from 'next/navigation';
import { SubscriptionsList } from './SubscriptionsList';
import { Account, SubscriptionPlan, ClientSubscription, Client } from '@/types/database';
import { BusinessMessageSettings } from '@/lib/whatsapp-templates';

interface SubscriptionsPageViewProps {
  initialSubscriptions: ClientSubscription[];
  clients: Client[];
  plans: SubscriptionPlan[];
  accounts: Account[];
  messageSettings?: BusinessMessageSettings | null;
}

export function SubscriptionsPageView({
  initialSubscriptions,
  clients,
  plans,
  accounts,
  messageSettings,
}: SubscriptionsPageViewProps) {
  const router = useRouter();

  return (
    <SubscriptionsList
      initialSubscriptions={initialSubscriptions}
      clients={clients}
      plans={plans}
      accounts={accounts}
      messageSettings={messageSettings}
      onRefresh={() => router.refresh()}
    />
  );
}
