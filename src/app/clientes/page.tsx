import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getClients } from '@/lib/actions/clients';
import { getAccounts } from '@/lib/actions/accounts';
import { ClientsList } from '@/components/clients/ClientsList';

export default async function ClientesPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const [clients, accounts] = await Promise.all([
    getClients(),
    getAccounts(),
  ]);

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Clientes</h1>
          <p className="text-sm text-zinc-400">
            Gerencie sua carteira de clientes, histórico de atendimentos e dados de contato.
          </p>
        </div>

        <ClientsList initialClients={clients} accounts={accounts} />
      </div>
    </AppShell>
  );
}

