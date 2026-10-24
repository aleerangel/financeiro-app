import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAccounts } from '@/lib/actions/accounts';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { AccountsList } from '@/components/accounts/AccountsList';

export default async function ContasPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const accounts = await getAccounts();

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <PageHeader
          title="Contas e Carteiras"
          description="Gerencie suas contas bancárias, poupanças e dinheiro em espécie com controle de saldo e rendimento."
        />

        <AccountsList initialAccounts={accounts} />
      </div>
    </AppShell>
  );
}

