import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { getClients } from '@/lib/actions/clients';
import { getAccounts } from '@/lib/actions/accounts';
import { getSubscriptionPlans, getClientSubscriptions } from '@/lib/actions/subscriptions';
import { getMessageSettings } from '@/lib/actions/message-settings';
import { getBusinessProfile } from '@/lib/actions/business-profile';
import { BusinessRequiredView } from '@/components/layout/BusinessRequiredView';
import { SubscriptionsPageView } from '@/components/subscriptions/SubscriptionsPageView';

export default async function MensalidadesPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getBusinessProfile();
  if (!profile.has_business) {
    return (
      <BusinessRequiredView
        moduleName="Clube & Mensalidades"
        description="Gerencie planos recorrentes, mensalidades, assinantes e cobranças automáticas no WhatsApp."
      />
    );
  }

  const [clients, accounts, plans, subscriptions, messageSettings] = await Promise.all([
    getClients(),
    getAccounts(),
    getSubscriptionPlans(),
    getClientSubscriptions(),
    getMessageSettings(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clube de Assinaturas & Mensalidades"
        description="Gerencie planos de recorrência, assinantes ativos, cobranças no WhatsApp e acompanhe sua receita mensal (MRR)."
      />

      <SubscriptionsPageView
        initialSubscriptions={subscriptions}
        clients={clients}
        plans={plans}
        accounts={accounts}
        messageSettings={messageSettings}
      />
    </div>
  );
}
