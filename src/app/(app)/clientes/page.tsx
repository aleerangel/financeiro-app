import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { getClients } from '@/lib/actions/clients';
import { getAccounts } from '@/lib/actions/accounts';
import { getBusinessProfile } from '@/lib/actions/business-profile';
import { BusinessRequiredView } from '@/components/layout/BusinessRequiredView';
import { ClientsList } from '@/components/clients/ClientsList';

export default async function ClientesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getBusinessProfile();
  if (!profile.has_business) {
    return (
      <BusinessRequiredView
        moduleName="Clientes & CRM"
        description="Acompanhe sua base de clientes, histórico de visitas, aniversariantes do dia e ciclo de retorno."
      />
    );
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  if (resolvedParams?.tab === 'subscriptions') {
    redirect('/mensalidades');
  }

  const [clients, accounts] = await Promise.all([
    getClients(),
    getAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carteira de Clientes & CRM"
        description="Acompanhe sua base de clientes, histórico de atendimentos, radar de fidelização e contatos."
      />

      <ClientsList initialClients={clients} accounts={accounts} />
    </div>
  );
}
