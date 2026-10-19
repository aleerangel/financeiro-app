import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getClients } from '@/lib/actions/clients';
import { ClientsList } from '@/components/clients/ClientsList';

export const instant = false;

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const clients = await getClients();

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Clientes</h1>
          <p className="text-sm text-zinc-400">
            Gerencie sua carteira de clientes, histórico de atendimentos e dados de contato.
          </p>
        </div>

        <ClientsList initialClients={clients} />
      </div>
    </AppShell>
  );
}

