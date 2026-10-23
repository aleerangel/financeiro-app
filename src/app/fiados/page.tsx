import { connection } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getPendingDebtsSummary } from '@/lib/actions/sales';
import { getAccounts } from '@/lib/actions/accounts';
import { getMessageSettings } from '@/lib/actions/message-settings';
import { FiadosView } from '@/components/fiados/FiadosView';

export const metadata = {
  title: 'Fiados & Contas a Receber | BarberFin',
  description: 'Gestão de vendas a prazo, controle de vencimentos e cobrança de fiados via WhatsApp.',
};

export default async function FiadosPage() {
  await connection();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  const [summary, accounts, messageSettings] = await Promise.all([
    getPendingDebtsSummary(),
    getAccounts(),
    getMessageSettings(),
  ]);

  return (
    <AppShell userEmail={user.email}>
      <FiadosView
        initialSummary={summary}
        accounts={accounts}
        initialMessageSettings={messageSettings}
      />
    </AppShell>
  );
}

