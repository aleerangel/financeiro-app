import { connection } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAccounts } from '@/lib/actions/accounts';
import { AppShell } from '@/components/layout/AppShell';
import { AccountsList } from '@/components/accounts/AccountsList';

export const instant = false;

export default async function ContasPage() {
  await connection();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const accounts = await getAccounts();

  return (
    <AppShell userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Contas e Carteiras</h1>
          <p className="text-sm text-zinc-400">
            Gerencie suas contas bancárias, poupanças e dinheiro em espécie.
          </p>
        </div>

        <AccountsList initialAccounts={accounts} />
      </div>
    </AppShell>
  );
}

