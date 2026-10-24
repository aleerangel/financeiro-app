import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { getClients } from '@/lib/actions/clients';
import { getAccounts } from '@/lib/actions/accounts';
import { getSubscriptionPlans, getClientSubscriptions } from '@/lib/actions/subscriptions';
import { getMessageSettings } from '@/lib/actions/message-settings';
import { ClientsPageTabs } from '@/components/clients/ClientsPageTabs';

export default async function ClientesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const defaultTab = resolvedParams?.tab === 'subscriptions' ? 'subscriptions' : 'clients';

  const [clients, accounts, plans, subscriptions, messageSettings] = await Promise.all([
    getClients(),
    getAccounts(),
    getSubscriptionPlans(),
    getClientSubscriptions(),
    getMessageSettings(),
  ]);

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <PageHeader
          title="Clientes & Clube"
          description="Gerencie sua carteira de clientes, fidelização, recorrência mensal e histórico de atendimentos."
        />

        <ClientsPageTabs
          initialClients={clients}
          initialSubscriptions={subscriptions}
          plans={plans}
          accounts={accounts}
          messageSettings={messageSettings}
          defaultTab={defaultTab}
        />
      </div>
    </AppShell>
  );
}
